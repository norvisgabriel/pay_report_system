import { getServerSession } from "next-auth";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { StatusBadge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils";

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: { status?: string; page?: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session) return null;

  const page = Math.max(1, parseInt(searchParams.page ?? "1"));
  const limit = 10;
  const skip = (page - 1) * limit;

  const where = {
    userId: session.user.id,
    ...(searchParams.status ? { status: searchParams.status as "PENDING" | "APPROVED" | "REJECTED" } : {}),
  };

  const [payments, total] = await Promise.all([
    prisma.payment.findMany({
      where,
      include: { campaign: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.payment.count({ where }),
  ]);

  const totalPages = Math.ceil(total / limit);

  const filterLabels: Record<string, string> = {
    All: "Todos",
    PENDING: "Pendiente",
    APPROVED: "Aprobado",
    REJECTED: "Rechazado",
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Mis Pagos</h1>
        <Link href="/payments/new" className="btn-primary text-sm">
          + Reportar Pago
        </Link>
      </div>

      <div className="card overflow-hidden">
        <div className="flex gap-1 p-3 border-b border-gray-100 overflow-x-auto">
          {([undefined, "PENDING", "APPROVED", "REJECTED"] as const).map((s) => (
            <Link
              key={s ?? "all"}
              href={s ? `/payments?status=${s}` : "/payments"}
              className={`rounded-full px-3 py-1 text-xs font-medium whitespace-nowrap transition-colors ${
                searchParams.status === s || (!searchParams.status && !s)
                  ? "bg-primary-100 text-primary-700"
                  : "text-gray-500 hover:bg-gray-100"
              }`}
            >
              {s ? filterLabels[s] : "Todos"}
            </Link>
          ))}
        </div>

        {payments.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-sm text-gray-500">No se encontraron pagos.</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {payments.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/payments/${p.id}`}
                  className="flex items-center justify-between px-4 py-3.5 hover:bg-gray-50 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {p.reference ?? p.method}
                      </p>
                      <StatusBadge status={p.status} />
                    </div>
                    <p className="mt-0.5 text-xs text-gray-500">
                      {p.bankName ? `${p.bankName} · ` : ""}{p.campaign.name} · {formatDate(p.paymentDate)}
                    </p>
                  </div>
                  <div className="ml-4 shrink-0 text-right">
                    <p className="text-sm font-semibold text-gray-900">{formatCurrency(Number(p.amount), "USD")}</p>
                    {p.localAmount && (
                      <p className="text-xs text-gray-500">
                        Bs. {Number(p.localAmount).toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                    )}
                    <p className="text-xs text-gray-400">{formatDate(p.createdAt)}</p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <p className="text-xs text-gray-500">
              Página {page} de {totalPages} ({total} total)
            </p>
            <div className="flex gap-2">
              {page > 1 && (
                <Link href={`/payments?page=${page - 1}${searchParams.status ? `&status=${searchParams.status}` : ""}`} className="btn-secondary text-xs py-1 px-3">
                  Anterior
                </Link>
              )}
              {page < totalPages && (
                <Link href={`/payments?page=${page + 1}${searchParams.status ? `&status=${searchParams.status}` : ""}`} className="btn-primary text-xs py-1 px-3">
                  Siguiente
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
