export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { StatusBadge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils";

export default async function AdminDashboardPage() {
  const [stats, recentPayments, campaigns] = await Promise.all([
    Promise.all([
      prisma.payment.count(),
      prisma.payment.count({ where: { status: "PENDING" } }),
      prisma.payment.count({ where: { status: "APPROVED" } }),
      prisma.payment.count({ where: { status: "REJECTED" } }),
      prisma.user.count({ where: { role: "USER" } }),
    ]),
    prisma.payment.findMany({
      take: 8,
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { name: true, email: true } },
        campaign: { select: { name: true } },
      },
    }),
    prisma.campaign.findMany({
      where: { isActive: true },
      include: { _count: { select: { payments: true } } },
      orderBy: { startDate: "desc" },
    }),
  ]);

  const [total, pending, validated, rejected, users] = stats;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-gray-900">Panel de Administración</h1>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <StatCard label="Total Pagos" value={total} color="blue" />
        <StatCard label="Pendientes" value={pending} color="yellow" href="/admin/payments?status=PENDING" />
        <StatCard label="Aprobados" value={validated} color="green" href="/admin/payments?status=APPROVED" />
        <StatCard label="Rechazados" value={rejected} color="red" href="/admin/payments?status=REJECTED" />
        <StatCard label="Usuarios" value={users} color="purple" />
      </div>

      {campaigns.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-700">Campañas Activas</h2>
            <Link href="/admin/campaigns" className="text-xs text-primary-600 font-medium">Gestionar →</Link>
          </div>
          <ul className="divide-y divide-gray-100">
            {campaigns.map((c) => (
              <li key={c.id} className="flex items-center justify-between px-4 py-3 text-sm">
                <div>
                  <p className="font-medium text-gray-900">{c.name}</p>
                  <p className="text-xs text-gray-500">{formatDate(c.startDate)} – {formatDate(c.endDate)}</p>
                </div>
                <span className="text-xs text-gray-500">{c._count.payments} pagos</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="card">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700">Pagos Recientes</h2>
          <Link href="/admin/payments" className="text-xs text-primary-600 font-medium">Ver todos →</Link>
        </div>
        <ul className="divide-y divide-gray-100">
          {recentPayments.map((p) => (
            <li key={p.id}>
              <Link
                href={`/admin/payments/${p.id}`}
                className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-gray-900 truncate">{p.user.name}</p>
                    <StatusBadge status={p.status} />
                  </div>
                  <p className="text-xs text-gray-500 truncate">{p.reference ?? p.method} · {p.campaign.name}</p>
                </div>
                <div className="ml-4 shrink-0 text-right">
                  <p className="text-sm font-semibold">{formatCurrency(Number(p.amount), "USD")}</p>
                  <p className="text-xs text-gray-400">{formatDate(p.createdAt)}</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function StatCard({
  label, value, color, href,
}: {
  label: string; value: number; color: "blue" | "yellow" | "green" | "red" | "purple"; href?: string;
}) {
  const colors = {
    blue: "bg-blue-50 text-blue-700",
    yellow: "bg-yellow-50 text-yellow-700",
    green: "bg-green-50 text-green-700",
    red: "bg-red-50 text-red-700",
    purple: "bg-purple-50 text-purple-700",
  };
  const content = (
    <div className={`card p-4 ${colors[color]}`}>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs font-medium mt-1 opacity-80">{label}</p>
    </div>
  );
  return href ? <Link href={href}>{content}</Link> : content;
}
