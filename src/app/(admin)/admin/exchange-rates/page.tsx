export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { ExchangeRateManager } from "@/components/admin/exchange-rate-manager";

export const metadata: Metadata = { title: "Tasa de Cambio" };

export default async function ExchangeRatesPage() {
  const rates = await prisma.exchangeRate.findMany({
    orderBy: { effectiveDate: "desc" },
    take: 60,
  });

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <h1 className="text-xl font-bold text-gray-900">Tasa de Cambio</h1>
      <ExchangeRateManager
        initialRates={rates.map((r) => ({
          id: r.id,
          fromCurrency: r.fromCurrency,
          toCurrency: r.toCurrency,
          rate: r.rate.toString(),
          effectiveDate: r.effectiveDate.toISOString(),
          source: r.source,
        }))}
      />
    </div>
  );
}
