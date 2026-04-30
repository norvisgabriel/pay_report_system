export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendWelcomeEmail, sendPaymentReceivedEmail, sendPaymentApprovedEmail } from "@/lib/resend";

const schema = z.object({
  // Usuario destino
  email: z.string().email(),
  name: z.string().min(2).max(100).optional(),    // sólo si es usuario nuevo
  phone: z.string().max(20).optional(),

  // Pago
  campaignId: z.string().cuid(),
  amount: z.number().positive().optional(),        // por defecto el precio de la campaña
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

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const data = schema.parse(body);

    const campaign = await prisma.campaign.findUnique({
      where: { id: data.campaignId, isActive: true },
    });
    if (!campaign) {
      return NextResponse.json({ error: "Campaña no encontrada o inactiva" }, { status: 404 });
    }

    // Buscar o crear usuario
    let user = await prisma.user.findUnique({
      where: { email: data.email.toLowerCase() },
    });

    let isNewUser = false;
    if (!user) {
      if (!data.name?.trim()) {
        return NextResponse.json({ error: "El nombre es requerido para crear un nuevo usuario" }, { status: 400 });
      }
      const tempPassword = Math.random().toString(36).slice(-10);
      user = await prisma.user.create({
        data: {
          name: data.name.trim(),
          email: data.email.toLowerCase(),
          phone: data.phone,
          password: await bcrypt.hash(tempPassword, 12),
        },
      });
      isNewUser = true;
    }

    const isCash = data.method === "efectivo";
    const now = new Date();

    const paymentData = {
      userId: user.id,
      createdById: session.user.id,
      campaignId: data.campaignId,
      amount: data.amount ?? Number(campaign.price),
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
      isManual: true,
    };

    let payment;
    let receiptToken: string | undefined;

    if (isCash) {
      // Cobro en caja → aprobado automáticamente + recibo inmediato
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

    // Notificaciones fire-and-forget
    if (isNewUser) {
      sendWelcomeEmail(user.email, user.name).catch(console.error);
    }

    if (isCash && receiptToken) {
      const receiptUrl = `${process.env.NEXT_PUBLIC_APP_URL}/validate/${receiptToken}`;
      sendPaymentApprovedEmail(user.email, user.name, data.reference, receiptUrl).catch(console.error);
    } else {
      sendPaymentReceivedEmail(user.email, user.name, data.reference).catch(console.error);
    }

    return NextResponse.json({ data: payment }, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors[0].message }, { status: 400 });
    }
    console.error("[ADMIN PAYMENTS POST]", err);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
