import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PaymentForm } from "@/components/payments/payment-form";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Reportar Pago" };

export default async function NewPaymentPage({
  searchParams,
}: {
  searchParams: { campaignId?: string };
}) {
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

  const campaign =
    (searchParams.campaignId ? campaigns.find((c) => c.id === searchParams.campaignId) : null) ??
    campaigns[0];

  // Block if user already has a PENDING or APPROVED payment for this campaign
  const existingPayment = await prisma.payment.findFirst({
    where: {
      userId: session.user.id,
      campaignId: campaign.id,
      status: { in: ["PENDING", "APPROVED"] },
    },
  });

  if (existingPayment) {
    const isPending = existingPayment.status === "PENDING";
    return (
      <div className="max-w-md mx-auto mt-8">
        <div className="card p-8 text-center space-y-4">
          <div className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full ${isPending ? "bg-yellow-100" : "bg-green-100"}`}>
            {isPending ? (
              <svg className="h-7 w-7 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ) : (
              <svg className="h-7 w-7 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
          </div>
          <div>
            <p className="font-semibold text-gray-900">
              {isPending ? "Pago en revisión" : "Pago aprobado"}
            </p>
            <p className="mt-1 text-sm text-gray-500">
              {isPending
                ? `Tu pago para ${campaign.name} está siendo revisado por el equipo. Te notificaremos cuando haya una respuesta.`
                : `Tu pago para ${campaign.name} ya fue aprobado. No es necesario reportar otro.`}
            </p>
          </div>
          <Link href="/payments" className="btn-primary inline-block text-sm py-2 px-4">
            Ver mis pagos
          </Link>
        </div>
      </div>
    );
  }

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
