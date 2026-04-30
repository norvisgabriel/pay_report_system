import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ManualPaymentForm } from "@/components/admin/manual-payment-form";

export const metadata: Metadata = { title: "Registrar Cobro Manual" };

export default async function AdminNewPaymentPage() {
  const [campaigns, latestRate] = await Promise.all([
    prisma.campaign.findMany({ where: { isActive: true }, orderBy: { startDate: "desc" } }),
    prisma.exchangeRate.findFirst({ orderBy: { effectiveDate: "desc" } }),
  ]);

  if (campaigns.length === 0) {
    return (
      <div className="max-w-lg mx-auto mt-8 card p-8 text-center">
        <p className="text-sm text-gray-500">No hay campañas activas.</p>
        <Link href="/admin/campaigns" className="mt-3 inline-block btn-primary text-sm">
          Gestionar Campañas
        </Link>
      </div>
    );
  }

  const campaign = campaigns[0];

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="flex items-center gap-3">
        <Link href="/admin/payments" className="text-sm text-gray-500 hover:text-gray-700">← Volver</Link>
        <h1 className="text-xl font-bold text-gray-900">Registrar Cobro Manual</h1>
      </div>
      <div className="card p-6">
        <ManualPaymentForm
          campaign={{ id: campaign.id, name: campaign.name, price: Number(campaign.price) }}
          exchangeRate={latestRate ? Number(latestRate.rate) : null}
        />
      </div>
    </div>
  );
}
