export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { sendPasswordResetEmail } from "@/lib/resend";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const email = (body.email ?? "").toString().toLowerCase().trim();

  if (!email) {
    return NextResponse.json({ error: "Correo requerido" }, { status: 400 });
  }

  // Always respond with ok to prevent email enumeration
  const user = await prisma.user.findUnique({ where: { email } });

  if (user && user.password) {
    await prisma.verificationToken.deleteMany({ where: { identifier: email } });

    const token = randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await prisma.verificationToken.create({
      data: { identifier: email, token, expires },
    });

    const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password/${token}`;

    try {
      await sendPasswordResetEmail(user.email, user.name, resetUrl);
    } catch {
      // silent — don't reveal email errors
    }
  }

  return NextResponse.json({ ok: true });
}
