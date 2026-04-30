import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PaymentForm } from "@/components/payments/payment-form";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Reportar Pago" };

export default async function NewPaymentPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const [campaigns, latestRate] = await Promise.all([
    prisma.campaign.findMany({
      where: { isActive: true },
      orderBy: { startDate: "desc" },
    }),
    prisma.exchangeRate.findFirst({
      where: { fromCurrency: "USD", toCurrency: "VES" },
      orderBy: { effectiveDate: "desc" },
    }),
  ]);

  if (campaigns.length === 0) {
    return (
      <div className="card p-8 text-center max-w-md mx-auto mt-8">
        <svg className="mx-auto h-12 w-12 text-gray-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
        <p className="text-sm text-gray-500">No hay campañas activas en este momento.</p>
        <p className="text-xs text-gray-400 mt-1">Por favor regresa más tarde o contacta al administrador.</p>
      </div>
    );
  }

  const campaign = campaigns[0];

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <h1 className="text-xl font-bold text-gray-900">Reportar Pago</h1>
      <div className="card p-6">
        <PaymentForm
          campaign={{
            id: campaign.id,
            name: campaign.name,
            price: Number(campaign.price),
            currency: campaign.currency,
          }}
          exchangeRate={latestRate ? Number(latestRate.rate) : null}
          exchangeRateSource={latestRate?.source ?? null}
          campaignId={campaign.id}
        />
      </div>
    </div>
  );
}
