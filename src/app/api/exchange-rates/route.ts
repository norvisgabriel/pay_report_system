export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const createSchema = z.object({
  campaignId: z.string().cuid().optional(),
  fromCurrency: z.string().length(3).default("USD"),
  toCurrency: z.string().length(3),
  rate: z.number().positive(),
  effectiveDate: z.string(),
  source: z.enum(["dolarapi", "manual"]).default("manual"),
});

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const campaignId = searchParams.get("campaignId");

  const rates = await prisma.exchangeRate.findMany({
    where: campaignId ? { campaignId } : undefined,
    orderBy: { effectiveDate: "desc" },
    take: 60,
  });

  return NextResponse.json({ data: rates });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const data = createSchema.parse(body);

    const effectiveDate = new Date(data.effectiveDate);
    effectiveDate.setUTCHours(0, 0, 0, 0);

    const rate = await prisma.exchangeRate.upsert({
      where: {
        fromCurrency_toCurrency_effectiveDate: {
          fromCurrency: data.fromCurrency,
          toCurrency: data.toCurrency,
          effectiveDate,
        },
      },
      update: { rate: data.rate, source: data.source },
      create: {
        campaignId: data.campaignId,
        fromCurrency: data.fromCurrency,
        toCurrency: data.toCurrency,
        rate: data.rate,
        effectiveDate,
        source: data.source,
      },
    });

    return NextResponse.json({ data: rate }, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors[0].message }, { status: 400 });
    }
    console.error("[EXCHANGE RATES POST]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
