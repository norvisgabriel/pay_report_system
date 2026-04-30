import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function isAuthorized(req: NextRequest) {
  const auth = req.headers.get("authorization");
  return auth === `Bearer ${process.env.CRON_SECRET}`;
}

interface DolarApiRate {
  fuente: string;
  nombre: string;
  moneda: string;
  compra: number | null;
  venta: number | null;
  promedio: number;
  fechaActualizacion: string;
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const res = await fetch("https://ve.dolarapi.com/v1/dolares", {
      headers: { "User-Agent": "payment-system/1.0" },
      cache: "no-store",
    });

    if (!res.ok) throw new Error(`DolarAPI respondió con ${res.status}`);

    const rates: DolarApiRate[] = await res.json();

    // Usar tasa BCV (Banco Central de Venezuela — oficial)
    const bcv = rates.find((r) => r.fuente === "oficial");
    const paralelo = rates.find((r) => r.fuente === "paralelo");
    const target = bcv ?? paralelo;

    if (!target) throw new Error("No se encontraron tasas en la respuesta");

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const saved = await prisma.exchangeRate.upsert({
      where: {
        fromCurrency_toCurrency_effectiveDate: {
          fromCurrency: "USD",
          toCurrency: "VES",
          effectiveDate: today,
        },
      },
      update: { rate: target.promedio, source: `dolarapi-${target.fuente}` },
      create: {
        fromCurrency: "USD",
        toCurrency: "VES",
        rate: target.promedio,
        effectiveDate: today,
        source: `dolarapi-${target.fuente}`,
      },
    });

    console.log(`[CRON] Tasa guardada: 1 USD = ${target.promedio} VES (${target.fuente})`);
    return NextResponse.json({ data: saved });
  } catch (err) {
    console.error("[CRON exchange-rate]", err);
    return NextResponse.json({ error: "Error al obtener tasa de cambio" }, { status: 500 });
  }
}
