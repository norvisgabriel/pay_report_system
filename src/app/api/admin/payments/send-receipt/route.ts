import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendPaymentApprovedEmail } from "@/lib/resend";

const schema = z.object({ paymentId: z.string().cuid() });

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { paymentId } = schema.parse(body);

    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        user: { select: { name: true, email: true } },
        receipt: true,
      },
    });

    if (!payment) return NextResponse.json({ error: "Pago no encontrado" }, { status: 404 });
    if (payment.status !== "APPROVED" || !payment.receipt) {
      return NextResponse.json({ error: "El pago no está aprobado o no tiene recibo" }, { status: 400 });
    }

    const receiptUrl = `${process.env.NEXT_PUBLIC_APP_URL}/validate/${payment.receipt.token}`;
    await sendPaymentApprovedEmail(
      payment.user.email,
      payment.user.name,
      payment.reference ?? undefined,
      receiptUrl
    );

    return NextResponse.json({ data: { sent: true } });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors[0].message }, { status: 400 });
    }
    console.error("[SEND_RECEIPT]", err);
    return NextResponse.json({ error: "Error al enviar el correo" }, { status: 500 });
  }
}
