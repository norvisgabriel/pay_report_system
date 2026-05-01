export const dynamic = "force-dynamic";

import { getServerSession } from "next-auth";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { StatusBadge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session) return null;

  const [payments, campaigns, stats, userCampaignPayments] = await Promise.all([
    prisma.payment.findMany({
      where: { userId: session.user.id },
      include: { campaign: true },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.campaign.findMany({
      where: { isActive: true },
      orderBy: { startDate: "desc" },
      take: 3,
    }),
    prisma.payment.groupBy({
      by: ["status"],
      where: { userId: session.user.id },
      _count: true,
    }),
    prisma.payment.findMany({
      where: { userId: session.user.id, campaign: { isActive: true } },
      select: { campaignId: true, status: true },
    }),
  ]);

  // Build per-campaign status: PENDING > APPROVED > REJECTED
  const campaignStatus: Record<string, "PENDING" | "APPROVED" | "REJECTED"> = {};
  for (const p of userCampaignPayments) {
    const cur = campaignStatus[p.campaignId];
    if (p.status === "PENDING") {
      campaignStatus[p.campaignId] = "PENDING";
    } else if (p.status === "APPROVED" && cur !== "PENDING") {
      campaignStatus[p.campaignId] = "APPROVED";
    } else if (!cur) {
      campaignStatus[p.campaignId] = "REJECTED";
    }
  }

  const countByStatus = Object.fromEntries(stats.map((s) => [s.status, s._count]));
  const total = stats.reduce((acc, s) => acc + s._count, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Bienvenido, {session.user.name}</h1>
        <p className="text-sm text-gray-500">Resumen de tus reportes de pago</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Total" value={total} color="blue" />
        <StatCard label="Pendientes" value={countByStatus["PENDING"] ?? 0} color="yellow" />
        <StatCard label="Aprobados" value={countByStatus["APPROVED"] ?? 0} color="green" />
      </div>

      {campaigns.length > 0 && (
        <div className="card p-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Campaña Activa</h2>
          {campaigns.map((c) => {
            const status = campaignStatus[c.id];
            return (
              <div key={c.id} className="flex items-center justify-between rounded-lg bg-primary-50 px-3 py-3">
                <div>
                  <p className="text-sm font-semibold text-primary-900">{c.name}</p>
                  <p className="text-xs text-primary-600 mt-0.5">
                    Monto: <strong>{formatCurrency(Number(c.price), "USD")}</strong> · {formatDate(c.startDate)} – {formatDate(c.endDate)}
                  </p>
                </div>
                {status === "PENDING" && (
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-yellow-100 px-3 py-1.5 text-xs font-medium text-yellow-700">
                    <span className="h-1.5 w-1.5 rounded-full bg-yellow-500 animate-pulse" />
                    En revisión
                  </span>
                )}
                {status === "APPROVED" && (
                  <span className="inline-flex items-center gap-1 rounded-lg bg-green-100 px-3 py-1.5 text-xs font-medium text-green-700">
                    ✓ Aprobado
                  </span>
                )}
                {(status === "REJECTED" || !status) && (
                  <Link
                    href={`/payments/new?campaignId=${c.id}`}
                    className="btn-primary text-xs py-1.5 px-3"
                  >
                    {status === "REJECTED" ? "Reintentar →" : "Reportar →"}
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="card">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700">Pagos Recientes</h2>
          <Link href="/payments" className="text-xs text-primary-600 hover:text-primary-700 font-medium">
            Ver todos
          </Link>
        </div>
        {payments.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <p className="text-sm text-gray-500">Aún no has reportado ningún pago.</p>
            <Link href="/payments/new" className="mt-2 inline-block text-sm font-medium text-primary-600">
              Reportar tu primer pago →
            </Link>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {payments.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/payments/${p.id}`}
                  className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {p.reference ?? p.method}
                    </p>
                    <p className="text-xs text-gray-500 capitalize">{p.method} · {p.campaign.name} · {formatDate(p.paymentDate)}</p>
                  </div>
                  <div className="ml-4 flex flex-col items-end gap-1 shrink-0">
                    <span className="text-sm font-semibold text-gray-900">{formatCurrency(Number(p.amount), "USD")}</span>
                    <StatusBadge status={p.status} />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: "blue" | "yellow" | "green" }) {
  const colors = {
    blue: "bg-blue-50 text-blue-700",
    yellow: "bg-yellow-50 text-yellow-700",
    green: "bg-green-50 text-green-700",
  };
  return (
    <div className={`card p-4 ${colors[color]}`}>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs font-medium mt-1 opacity-80">{label}</p>
    </div>
  );
}
