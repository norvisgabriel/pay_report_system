export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resend } from "@/lib/resend";
import { sendSMS } from "@/lib/twilio";

const FROM = `${process.env.RESEND_FROM_NAME ?? "PayReport"} <${process.env.RESEND_FROM_EMAIL ?? "noreply@example.com"}>`;
const APP = process.env.NEXT_PUBLIC_APP_NAME ?? "PayReport";

const schema = z.object({
  campaignId: z.string().cuid(),
  subject: z.string().min(3).max(150),
  body: z.string().min(10).max(2000),
  sendSMS: z.boolean().default(false),
});

// GET: obtener usuarios sin pago aprobado en la campaña activa
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const campaignId = new URL(req.url).searchParams.get("campaignId");
  if (!campaignId) return NextResponse.json({ error: "campaignId requerido" }, { status: 400 });

  // Usuarios que tienen al menos un pago APROBADO en esta campaña
  const usersWithApproved = await prisma.payment.findMany({
    where: { campaignId, status: "APPROVED" },
    select: { userId: true },
    distinct: ["userId"],
  });
  const approvedIds = new Set(usersWithApproved.map((p) => p.userId));

  // Todos los usuarios (exceptuando admins)
  const allUsers = await prisma.user.findMany({
    where: { role: "USER" },
    select: { id: true, name: true, email: true, phone: true },
    orderBy: { name: "asc" },
  });

  const targets = allUsers.filter((u) => !approvedIds.has(u.id));

  return NextResponse.json({ data: targets });
}

// POST: enviar email (y SMS opcional) a usuarios sin pago
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const data = schema.parse(body);

    // Obtener destinatarios (misma lógica que GET)
    const usersWithApproved = await prisma.payment.findMany({
      where: { campaignId: data.campaignId, status: "APPROVED" },
      select: { userId: true },
      distinct: ["userId"],
    });
    const approvedIds = new Set(usersWithApproved.map((p) => p.userId));

    const allUsers = await prisma.user.findMany({
      where: { role: "USER" },
      select: { id: true, name: true, email: true, phone: true },
    });

    const targets = allUsers.filter((u) => !approvedIds.has(u.id));

    if (targets.length === 0) {
      return NextResponse.json({ data: { emailsSent: 0, smsSent: 0 } });
    }

    // Enviar emails en lotes de 50 (límite Resend batch)
    let emailsSent = 0;
    let smsSent = 0;

    const emailBatch = targets.map((u) => ({
      from: FROM,
      to: u.email,
      subject: data.subject,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
          <p>Hola ${u.name},</p>
          <div>${data.body.replace(/\n/g, "<br>")}</div>
          <p style="margin-top:24px;color:#6b7280;font-size:.875rem">— ${APP}</p>
        </div>
      `,
    }));

    // Resend permite máx 100 por batch
    for (let i = 0; i < emailBatch.length; i += 100) {
      const batch = emailBatch.slice(i, i + 100);
      await resend.batch.send(batch);
      emailsSent += batch.length;
    }

    // SMS opcionales
    if (data.sendSMS) {
      const smsText = `${data.subject}\n\n${data.body.slice(0, 140)}`;
      for (const u of targets) {
        if (u.phone) {
          await sendSMS(u.phone, smsText).catch(console.error);
          smsSent++;
        }
      }
    }

    return NextResponse.json({ data: { emailsSent, smsSent } });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors[0].message }, { status: 400 });
    }
    console.error("[COMUNICACIONES POST]", err);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
