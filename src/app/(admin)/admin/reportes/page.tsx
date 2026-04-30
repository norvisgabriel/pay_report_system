export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Reportes" };

const METHOD_LABELS: Record<string, string> = {
  efectivo:      "Efectivo en Caja",
  efectivo_caja: "Efectivo en Caja",
  transferencia: "Transferencia Bancaria",
  transfer:      "Transferencia Bancaria",
  pago_movil:    "Pago Móvil",
};

const STATUS_LABELS: Record<string, string> = {
  APPROVED: "Aprobado",
  PENDING:  "Pendiente",
  REJECTED: "Rechazado",
};

const STATUS_COLORS: Record<string, string> = {
  APPROVED: "bg-green-100 text-green-700",
  PENDING:  "bg-yellow-100 text-yellow-700",
  REJECTED: "bg-red-100 text-red-700",
};

const METHODS = [
  { value: "efectivo",      label: "Efectivo en Caja" },
  { value: "transferencia", label: "Transferencia Bancaria" },
  { value: "pago_movil",    label: "Pago Móvil" },
];

export default async function AdminReportesPage({
  searchParams,
}: {
  searchParams: {
    desde?: string;
    hasta?: string;
    campaignId?: string;
    status?: string;
    method?: string;
  };
}) {
  const desde = searchParams.desde ? new Date(searchParams.desde) : undefined;
  const hasta = searchParams.hasta
    ? new Date(new Date(searchParams.hasta).setHours(23, 59, 59, 999))
    : undefined;

  const statusFilter = searchParams.status && searchParams.status !== "ALL"
    ? { status: searchParams.status as "APPROVED" | "PENDING" | "REJECTED" }
    : {};

  const methodFilter = searchParams.method ? { method: searchParams.method } : {};
  const campaignFilter = searchParams.campaignId ? { campaignId: searchParams.campaignId } : {};
  const dateFilter = desde || hasta
    ? { approvedAt: { ...(desde ? { gte: desde } : {}), ...(hasta ? { lte: hasta } : {}) } }
    : {};

  const where = { ...statusFilter, ...methodFilter, ...campaignFilter, ...dateFilter };

  const [payments, campaigns, latestRate] = await Promise.all([
    prisma.payment.findMany({
      where,
      include: {
        user: { select: { name: true, email: true } },
        campaign: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.campaign.findMany({ orderBy: { startDate: "desc" }, select: { id: true, name: true } }),
    prisma.exchangeRate.findFirst({
      where: { fromCurrency: "USD", toCurrency: "VES" },
      orderBy: { effectiveDate: "desc" },
    }),
  ]);

  const approved = payments.filter((p) => p.status === "APPROVED");
  const totalUSD = approved.reduce((acc, p) => acc + Number(p.amount), 0);
  const totalVES = approved.reduce((acc, p) => acc + Number(p.localAmount ?? 0), 0);

  const byMethod: Record<string, { count: number; usd: number }> = {};
  for (const p of approved) {
    const key = METHOD_LABELS[p.method] ?? p.method;
    if (!byMethod[key]) byMethod[key] = { count: 0, usd: 0 };
    byMethod[key].count++;
    byMethod[key].usd += Number(p.amount);
  }

  const currentRate = latestRate ? Number(latestRate.rate) : null;

  const exportParams = new URLSearchParams(
    Object.fromEntries(
      Object.entries(searchParams).filter(([, v]) => v != null && v !== "")
    ) as Record<string, string>
  ).toString();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Reportes de Recaudación</h1>
        <a
          href={`/api/admin/reportes/export${exportParams ? `?${exportParams}` : ""}`}
          className="btn-primary text-sm py-1.5 px-4"
        >
          Exportar Excel →
        </a>
      </div>

      {/* Filtros */}
      <form method="GET" className="card p-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 items-end">
        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-600">Desde</label>
          <input type="date" name="desde" defaultValue={searchParams.desde ?? ""} className="input-base text-sm py-1.5" />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-600">Hasta</label>
          <input type="date" name="hasta" defaultValue={searchParams.hasta ?? ""} className="input-base text-sm py-1.5" />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-600">Campaña</label>
          <select name="campaignId" defaultValue={searchParams.campaignId ?? ""} className="input-base text-sm py-1.5">
            <option value="">Todas</option>
            {campaigns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-600">Estado</label>
          <select name="status" defaultValue={searchParams.status ?? "ALL"} className="input-base text-sm py-1.5">
            <option value="ALL">Todos</option>
            <option value="APPROVED">Aprobados</option>
            <option value="PENDING">Pendientes</option>
            <option value="REJECTED">Rechazados</option>
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-600">Método de Pago</label>
          <select name="method" defaultValue={searchParams.method ?? ""} className="input-base text-sm py-1.5">
            <option value="">Todos</option>
            {METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </div>
        <div className="flex gap-2">
          <button type="submit" className="btn-primary text-sm py-1.5 px-3 flex-1">Filtrar</button>
          <a href="/admin/reportes" className="btn-secondary text-sm py-1.5 px-3">✕</a>
        </div>
      </form>

      {/* Tarjetas de resumen */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="card p-4">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Total Aprobado</p>
          <p className="text-xl font-bold text-gray-900">{formatCurrency(totalUSD, "USD")}</p>
          {totalVES > 0 && (
            <p className="text-xs text-gray-400 mt-0.5">
              Bs. {totalVES.toLocaleString("es-VE", { minimumFractionDigits: 2 })}
            </p>
          )}
        </div>
        <div className="card p-4">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Pagos en lista</p>
          <p className="text-xl font-bold text-gray-900">{payments.length}</p>
          <p className="text-xs text-gray-400 mt-0.5">{approved.length} aprobados</p>
        </div>
        <div className="card p-4">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Tasa BCV Hoy</p>
          {currentRate ? (
            <>
              <p className="text-xl font-bold text-gray-900">
                Bs. {currentRate.toLocaleString("es-VE", { minimumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">por 1 USD</p>
            </>
          ) : (
            <p className="text-sm text-yellow-600">No disponible</p>
          )}
        </div>
        <div className="card p-4">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Por método</p>
          <div className="space-y-1">
            {Object.entries(byMethod).map(([m, s]) => (
              <div key={m} className="flex justify-between text-xs">
                <span className="text-gray-500 truncate">{m}</span>
                <span className="font-medium text-gray-800 ml-2">{s.count}</span>
              </div>
            ))}
            {Object.keys(byMethod).length === 0 && <p className="text-xs text-gray-400">—</p>}
          </div>
        </div>
      </div>

      {/* Tabla de pagos */}
      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700">
            Detalle de Pagos ({payments.length})
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Representante</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase hidden sm:table-cell">Campaña</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Método de Pago</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Monto USD</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase hidden md:table-cell">Monto Bs.</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase hidden lg:table-cell">Tasa</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase hidden lg:table-cell">Fecha Pago</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {payments.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-sm text-gray-500">
                    No hay pagos con los filtros seleccionados
                  </td>
                </tr>
              )}
              {payments.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900 text-xs">{p.user.name}</p>
                    <p className="text-xs text-gray-400">{p.user.email}</p>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600 hidden sm:table-cell">{p.campaign.name}</td>
                  <td className="px-4 py-3 text-xs text-gray-600">{METHOD_LABELS[p.method] ?? p.method}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[p.status] ?? "bg-gray-100 text-gray-600"}`}>
                      {STATUS_LABELS[p.status] ?? p.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm font-semibold text-gray-900">{formatCurrency(Number(p.amount), "USD")}</td>
                  <td className="px-4 py-3 text-xs text-gray-600 hidden md:table-cell">
                    {p.localAmount
                      ? `Bs. ${Number(p.localAmount).toLocaleString("es-VE", { minimumFractionDigits: 2 })}`
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 hidden lg:table-cell">
                    {p.exchangeRate ? `Bs. ${Number(p.exchangeRate).toLocaleString("es-VE", { minimumFractionDigits: 2 })}` : "—"}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 hidden lg:table-cell">
                    {formatDate(p.paymentDate)}
                  </td>
                </tr>
              ))}
            </tbody>
            {approved.length > 0 && (
              <tfoot>
                <tr className="border-t-2 border-gray-200 bg-gray-50 font-semibold">
                  <td colSpan={4} className="px-4 py-3 text-xs text-gray-600">TOTAL APROBADO ({approved.length})</td>
                  <td className="px-4 py-3 text-sm text-gray-900">{formatCurrency(totalUSD, "USD")}</td>
                  <td className="px-4 py-3 text-xs text-gray-600 hidden md:table-cell">
                    {totalVES > 0 ? `Bs. ${totalVES.toLocaleString("es-VE", { minimumFractionDigits: 2 })}` : "—"}
                  </td>
                  <td colSpan={2} className="hidden lg:table-cell" />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}
