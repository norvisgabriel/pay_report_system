export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendPaymentReceivedEmail, sendPaymentApprovedEmail } from "@/lib/resend";

const createSchema = z.object({
  campaignId: z.string().cuid(),
  amount: z.number().positive(),
  exchangeRate: z.number().positive().optional(),
  localAmount: z.number().positive().optional(),
  method: z.enum(["efectivo", "transferencia", "pago_movil"]),
  bankName: z.string().optional(),
  reference: z.string().optional(),
  phoneNumber: z.string().optional(),
  paymentDate: z.string(),
  imageUrl: z.string().url().optional(),
  imagePublicId: z.string().optional(),
  notes: z.string().max(500).optional(),
});

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const campaignId = searchParams.get("campaignId");
  const status = searchParams.get("status");
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const limit = Math.min(50, parseInt(searchParams.get("limit") ?? "10"));
  const skip = (page - 1) * limit;
  const isAdmin = session.user.role === "ADMIN";

  const where = {
    ...(isAdmin ? {} : { userId: session.user.id }),
    ...(campaignId ? { campaignId } : {}),
    ...(status ? { status: status as "PENDING" | "APPROVED" | "REJECTED" } : {}),
  };

  const [payments, total] = await Promise.all([
    prisma.payment.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true } },
        campaign: { select: { id: true, name: true, slug: true } },
        receipt: { select: { token: true } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.payment.count({ where }),
  ]);

  return NextResponse.json({
    data: payments,
    meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
  });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const data = createSchema.parse(body);

    const campaign = await prisma.campaign.findUnique({
      where: { id: data.campaignId, isActive: true },
    });
    if (!campaign) {
      return NextResponse.json({ error: "Campaña no encontrada o inactiva" }, { status: 404 });
    }

    const activePayment = await prisma.payment.findFirst({
      where: {
        userId: session.user.id,
        campaignId: data.campaignId,
        status: { in: ["PENDING", "APPROVED"] },
      },
    });
    if (activePayment) {
      const msg =
        activePayment.status === "APPROVED"
          ? "Ya tienes un pago aprobado para esta campaña"
          : "Ya tienes un pago en revisión para esta campaña";
      return NextResponse.json({ error: msg }, { status: 409 });
    }

    const isCash = data.method === "efectivo";
    const now = new Date();

    const paymentData = {
      userId: session.user.id,
      campaignId: data.campaignId,
      amount: data.amount,
      exchangeRate: data.exchangeRate,
      localAmount: data.localAmount,
      method: data.method,
      bankName: data.bankName,
      reference: data.reference,
      phoneNumber: data.phoneNumber,
      paymentDate: new Date(data.paymentDate),
      imageUrl: data.imageUrl,
      imagePublicId: data.imagePublicId,
      notes: data.notes,
    };

    let payment;
    let receiptToken: string | undefined;

    if (isCash) {
      // Efectivo en caja → aprobado automáticamente + recibo inmediato
      const validUntil = new Date(now);
      validUntil.setMonth(validUntil.getMonth() + 6);

      const result = await prisma.$transaction(async (tx) => {
        const p = await tx.payment.create({
          data: { ...paymentData, status: "APPROVED", approvedAt: now },
        });
        const r = await tx.receipt.create({ data: { paymentId: p.id, validUntil } });
        return { payment: p, receipt: r };
      });

      payment = result.payment;
      receiptToken = result.receipt.token;
    } else {
      payment = await prisma.payment.create({ data: paymentData });
    }

    // Notificaciones
    if (isCash && receiptToken) {
      const receiptUrl = `${process.env.NEXT_PUBLIC_APP_URL}/validate/${receiptToken}`;
      sendPaymentApprovedEmail(session.user.email!, session.user.name!, data.reference, receiptUrl).catch(console.error);
    } else {
      sendPaymentReceivedEmail(session.user.email!, session.user.name!, data.reference).catch(console.error);
    }

    return NextResponse.json({ data: payment }, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors[0].message }, { status: 400 });
    }
    console.error("[PAYMENTS POST]", err);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
