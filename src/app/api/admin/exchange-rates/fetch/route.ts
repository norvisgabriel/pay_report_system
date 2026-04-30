export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

interface DolarApiRate {
  fuente: string;
  nombre: string;
  moneda: string;
  compra: number | null;
  venta: number | null;
  promedio: number;
  fechaActualizacion: string;
}

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const res = await fetch("https://ve.dolarapi.com/v1/dolares", {
      headers: { "User-Agent": "payment-system/1.0" },
      cache: "no-store",
    });

    if (!res.ok) throw new Error(`DolarAPI respondió con ${res.status}`);

    const rates: DolarApiRate[] = await res.json();

    const bcv = rates.find((r) => r.fuente === "oficial");
    const paralelo = rates.find((r) => r.fuente === "paralelo");

    if (!bcv && !paralelo) {
      return NextResponse.json({ error: "No se obtuvieron tasas de la API" }, { status: 502 });
    }

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    // Guarda la tasa BCV (oficial del Banco Central de Venezuela)
    const rateToSave = bcv ?? paralelo!;
    const saved = await prisma.exchangeRate.upsert({
      where: {
        fromCurrency_toCurrency_effectiveDate: {
          fromCurrency: "USD",
          toCurrency: "VES",
          effectiveDate: today,
        },
      },
      update: { rate: rateToSave.promedio, source: `dolarapi-${rateToSave.fuente}` },
      create: {
        fromCurrency: "USD",
        toCurrency: "VES",
        rate: rateToSave.promedio,
        effectiveDate: today,
        source: `dolarapi-${rateToSave.fuente}`,
      },
    });

    return NextResponse.json({
      data: {
        saved,
        bcv: bcv ? { promedio: bcv.promedio, actualizado: bcv.fechaActualizacion } : null,
        paralelo: paralelo ? { promedio: paralelo.promedio, actualizado: paralelo.fechaActualizacion } : null,
      },
    });
  } catch (err) {
    console.error("[ADMIN FETCH RATE]", err);
    return NextResponse.json({ error: "Error al obtener la tasa de cambio" }, { status: 500 });
  }
}
