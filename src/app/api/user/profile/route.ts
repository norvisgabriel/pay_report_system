import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const schema = z
  .object({
    name: z.string().min(2).max(100).optional(),
    currentPassword: z.string().optional(),
    newPassword: z.string().min(8).max(100).optional(),
  })
  .refine(
    (d) => !(d.newPassword && !d.currentPassword),
    { message: "La contraseña actual es requerida para cambiar la contraseña", path: ["currentPassword"] }
  );

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const data = schema.parse(body);

    const user = await prisma.user.findUnique({ where: { id: session.user.id } });
    if (!user) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });

    if (data.newPassword) {
      if (!user.password) {
        return NextResponse.json({ error: "Esta cuenta usa autenticación social y no tiene contraseña" }, { status: 400 });
      }
      const valid = await bcrypt.compare(data.currentPassword!, user.password);
      if (!valid) {
        return NextResponse.json({ error: "La contraseña actual es incorrecta" }, { status: 400 });
      }
    }

    const updated = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        ...(data.name ? { name: data.name } : {}),
        ...(data.newPassword ? { password: await bcrypt.hash(data.newPassword, 12) } : {}),
      },
      select: { id: true, name: true, email: true },
    });

    return NextResponse.json({ data: updated });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors[0].message }, { status: 400 });
    }
    console.error("[PROFILE PATCH]", err);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
