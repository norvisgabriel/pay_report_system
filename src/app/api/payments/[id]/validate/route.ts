export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendPaymentApprovedEmail, sendPaymentRejectedEmail } from "@/lib/resend";
import { sendPaymentApprovedSMS } from "@/lib/twilio";

const schema = z.object({
  action: z.enum(["APPROVED", "REJECTED"]),
  adminNotes: z.string().max(500).optional(),
});

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { action, adminNotes } = schema.parse(body);

    const payment = await prisma.payment.findUnique({
      where: { id: params.id },
      include: { user: true },
    });

    if (!payment) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (payment.status !== "PENDING") {
      return NextResponse.json({ error: "Payment already processed" }, { status: 400 });
    }

    // Update payment + optionally create Receipt in one transaction
    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.payment.update({
        where: { id: params.id },
        data: {
          status: action,
          adminNotes,
          approvedAt: new Date(),
          approvedById: session.user.id,
        },
      });

      let receipt = null;
      if (action === "APPROVED") {
        const validUntil = new Date();
        validUntil.setMonth(validUntil.getMonth() + 6);
        receipt = await tx.receipt.create({ data: { paymentId: params.id, validUntil } });
      }

      return { payment: updated, receipt };
    });

    // Fire-and-forget notifications
    if (action === "APPROVED" && result.receipt) {
      const receiptUrl = `${process.env.NEXT_PUBLIC_APP_URL}/validate/${result.receipt.token}`;
      sendPaymentApprovedEmail(
        payment.user.email,
        payment.user.name,
        payment.reference ?? undefined,
        receiptUrl
      ).catch(console.error);

      if (payment.user.phone) {
        sendPaymentApprovedSMS(payment.user.phone, payment.reference ?? undefined, receiptUrl).catch(
          console.error
        );
      }
    } else if (action === "REJECTED") {
      sendPaymentRejectedEmail(
        payment.user.email,
        payment.user.name,
        payment.reference ?? undefined,
        adminNotes ?? "Sin motivo especificado"
      ).catch(console.error);
    }

    return NextResponse.json({ data: result.payment });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors[0].message }, { status: 400 });
    }
    console.error("[VALIDATE]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
