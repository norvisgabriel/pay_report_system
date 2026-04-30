import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { StatusBadge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import { CampaignFilter } from "@/components/admin/campaign-filter";

const STATUS_FILTER_LABELS: Record<string, string> = {
  PENDING: "Pendiente",
  APPROVED: "Aprobado",
  REJECTED: "Rechazado",
};

const METHOD_LABELS: Record<string, string> = {
  efectivo: "Efectivo",
  transferencia: "Transferencia",
  pago_movil: "Pago Móvil",
};

export default async function AdminPaymentsPage({
  searchParams,
}: {
  searchParams: { status?: string; campaignId?: string; page?: string };
}) {
  const page = Math.max(1, parseInt(searchParams.page ?? "1"));
  const limit = 15;
  const skip = (page - 1) * limit;

  const where = {
    ...(searchParams.status ? { status: searchParams.status as "PENDING" | "APPROVED" | "REJECTED" } : {}),
    ...(searchParams.campaignId ? { campaignId: searchParams.campaignId } : {}),
  };

  const [payments, total, campaigns] = await Promise.all([
    prisma.payment.findMany({
      where,
      include: {
        user: { select: { name: true, email: true } },
        campaign: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.payment.count({ where }),
    prisma.campaign.findMany({ orderBy: { startDate: "desc" }, select: { id: true, name: true } }),
  ]);

  const totalPages = Math.ceil(total / limit);

  function buildUrl(params: Record<string, string | undefined>) {
    const p = new URLSearchParams();
    const merged = { ...searchParams, ...params };
    Object.entries(merged).forEach(([k, v]) => { if (v) p.set(k, v); });
    p.delete("page");
    return `/admin/payments?${p.toString()}`;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Todos los Pagos</h1>
        <Link href="/admin/payments/nuevo" className="btn-primary text-sm">
          + Cobro Manual
        </Link>
      </div>

      <div className="card p-3 flex flex-wrap gap-3 items-center">
        <div className="flex gap-1 flex-wrap">
          {[undefined, "PENDING", "APPROVED", "REJECTED"].map((s) => (
            <Link
              key={s ?? "all"}
              href={buildUrl({ status: s })}
              className={`rounded-full px-3 py-1 text-xs font-medium whitespace-nowrap transition-colors ${
                searchParams.status === s || (!searchParams.status && !s)
                  ? "bg-primary-100 text-primary-700"
                  : "text-gray-500 hover:bg-gray-100"
              }`}
            >
              {s ? STATUS_FILTER_LABELS[s] : "Todos"}
            </Link>
          ))}
        </div>

        <CampaignFilter
          campaigns={campaigns}
          selected={searchParams.campaignId}
          baseUrl="/admin/payments"
          extraParams={searchParams.status ? `status=${searchParams.status}` : ""}
        />
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Usuario</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Referencia</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden sm:table-cell">Método</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Monto</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden md:table-cell">Fecha</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {payments.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-sm text-gray-500">No se encontraron pagos</td>
                </tr>
              )}
              {payments.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{p.user.name}</p>
                    <p className="text-xs text-gray-400">{p.user.email}</p>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-600">{p.reference ?? "—"}</td>
                  <td className="px-4 py-3 text-gray-600 hidden sm:table-cell">
                    {METHOD_LABELS[p.method] ?? p.method}
                  </td>
                  <td className="px-4 py-3 font-medium">{formatCurrency(Number(p.amount), "USD")}</td>
                  <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                  <td className="px-4 py-3 text-gray-500 hidden md:table-cell">{formatDate(p.createdAt)}</td>
                  <td className="px-4 py-3">
                    <Link href={`/admin/payments/${p.id}`} className="text-xs font-medium text-primary-600 hover:text-primary-700">
                      Revisar →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <p className="text-xs text-gray-500">Página {page} de {totalPages} ({total} total)</p>
            <div className="flex gap-2">
              {page > 1 && (
                <Link href={buildUrl({ page: String(page - 1) })} className="btn-secondary text-xs py-1 px-3">Anterior</Link>
              )}
              {page < totalPages && (
                <Link href={buildUrl({ page: String(page + 1) })} className="btn-primary text-xs py-1 px-3">Siguiente</Link>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
