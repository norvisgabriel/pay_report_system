import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Reportes" };

const METHOD_LABELS: Record<string, string> = {
  efectivo: "Efectivo en Caja",
  transferencia: "Transferencia Bancaria",
  pago_movil: "Pago Móvil",
};

export default async function AdminReportesPage({
  searchParams,
}: {
  searchParams: { desde?: string; hasta?: string; campaignId?: string };
}) {
  // Fechas de filtro
  const desde = searchParams.desde ? new Date(searchParams.desde) : undefined;
  const hasta = searchParams.hasta
    ? new Date(new Date(searchParams.hasta).setHours(23, 59, 59, 999))
    : undefined;

  const dateFilter = desde || hasta
    ? { approvedAt: { ...(desde ? { gte: desde } : {}), ...(hasta ? { lte: hasta } : {}) } }
    : {};

  const campaignFilter = searchParams.campaignId ? { campaignId: searchParams.campaignId } : {};

  const where = { status: "APPROVED" as const, ...dateFilter, ...campaignFilter };

  const [payments, campaigns, latestRate] = await Promise.all([
    prisma.payment.findMany({
      where,
      include: {
        user: { select: { name: true, email: true } },
        campaign: { select: { name: true } },
      },
      orderBy: { approvedAt: "desc" },
    }),
    prisma.campaign.findMany({ orderBy: { startDate: "desc" }, select: { id: true, name: true } }),
    prisma.exchangeRate.findFirst({ orderBy: { effectiveDate: "desc" } }),
  ]);

  // Calcular totales
  const totalUSD = payments.reduce((acc, p) => acc + Number(p.amount), 0);
  const totalVES = payments.reduce((acc, p) => acc + Number(p.localAmount ?? 0), 0);

  // Por método
  const byMethod: Record<string, { count: number; usd: number; ves: number }> = {};
  for (const p of payments) {
    if (!byMethod[p.method]) byMethod[p.method] = { count: 0, usd: 0, ves: 0 };
    byMethod[p.method].count++;
    byMethod[p.method].usd += Number(p.amount);
    byMethod[p.method].ves += Number(p.localAmount ?? 0);
  }

  const currentRate = latestRate ? Number(latestRate.rate) : null;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-gray-900">Reportes de Recaudación</h1>

      {/* Filtros */}
      <form method="GET" className="card p-4 flex flex-wrap gap-3 items-end">
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
        <button type="submit" className="btn-primary text-sm py-1.5 px-4">Filtrar</button>
        <a href="/admin/reportes" className="btn-secondary text-sm py-1.5 px-4">Limpiar</a>
      </form>

      {/* Tarjetas de totales */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card p-5">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Total Recaudado</p>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalUSD, "USD")}</p>
          {totalVES > 0 && (
            <p className="text-sm text-gray-500 mt-0.5">
              Bs. {totalVES.toLocaleString("es-VE", { minimumFractionDigits: 2 })}
            </p>
          )}
        </div>
        <div className="card p-5">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Pagos Aprobados</p>
          <p className="text-2xl font-bold text-gray-900">{payments.length}</p>
        </div>
        <div className="card p-5">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Tasa Actual</p>
          {currentRate ? (
            <>
              <p className="text-2xl font-bold text-gray-900">
                Bs. {currentRate.toLocaleString("es-VE", { minimumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">por 1 USD</p>
            </>
          ) : (
            <p className="text-sm text-yellow-600">No disponible</p>
          )}
        </div>
      </div>

      {/* Por método */}
      {Object.keys(byMethod).length > 0 && (
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Por Método de Pago</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {Object.entries(byMethod).map(([m, stats]) => (
              <div key={m} className="rounded-lg bg-gray-50 border border-gray-100 p-4">
                <p className="text-xs font-medium text-gray-500 mb-1">{METHOD_LABELS[m] ?? m}</p>
                <p className="text-lg font-bold text-gray-900">{formatCurrency(stats.usd, "USD")}</p>
                {stats.ves > 0 && (
                  <p className="text-xs text-gray-500">
                    Bs. {stats.ves.toLocaleString("es-VE", { minimumFractionDigits: 2 })}
                  </p>
                )}
                <p className="text-xs text-gray-400 mt-1">{stats.count} pago{stats.count !== 1 ? "s" : ""}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabla de pagos */}
      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700">
            Detalle de Pagos ({payments.length})
          </h2>
          <a
            href={`/api/admin/reportes/export?${new URLSearchParams(
              Object.fromEntries(Object.entries(searchParams).filter(([, v]) => v != null)) as Record<string, string>
            ).toString()}`}
            className="text-xs text-primary-600 font-medium hover:underline"
          >
            Exportar CSV →
          </a>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Usuario</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase hidden sm:table-cell">Campaña</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Método</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Monto USD</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase hidden md:table-cell">Monto Bs.</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase hidden lg:table-cell">Aprobado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {payments.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-sm text-gray-500">
                    No hay pagos aprobados con los filtros seleccionados
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
                  <td className="px-4 py-3 text-sm font-semibold text-gray-900">{formatCurrency(Number(p.amount), "USD")}</td>
                  <td className="px-4 py-3 text-xs text-gray-600 hidden md:table-cell">
                    {p.localAmount
                      ? `Bs. ${Number(p.localAmount).toLocaleString("es-VE", { minimumFractionDigits: 2 })}`
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 hidden lg:table-cell">
                    {p.approvedAt ? formatDate(p.approvedAt) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
            {payments.length > 0 && (
              <tfoot>
                <tr className="border-t-2 border-gray-200 bg-gray-50 font-semibold">
                  <td colSpan={3} className="px-4 py-3 text-xs text-gray-600">TOTAL ({payments.length} pagos)</td>
                  <td className="px-4 py-3 text-sm text-gray-900">{formatCurrency(totalUSD, "USD")}</td>
                  <td className="px-4 py-3 text-xs text-gray-600 hidden md:table-cell">
                    {totalVES > 0 ? `Bs. ${totalVES.toLocaleString("es-VE", { minimumFractionDigits: 2 })}` : "—"}
                  </td>
                  <td className="hidden lg:table-cell" />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}
