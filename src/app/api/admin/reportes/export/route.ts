import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const METHOD_LABELS: Record<string, string> = {
  efectivo: "Efectivo",
  transferencia: "Transferencia",
  pago_movil: "Pago Movil",
};

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const desde = searchParams.get("desde") ? new Date(searchParams.get("desde")!) : undefined;
  const hasta = searchParams.get("hasta")
    ? new Date(new Date(searchParams.get("hasta")!).setHours(23, 59, 59, 999))
    : undefined;
  const campaignId = searchParams.get("campaignId") || undefined;

  const where = {
    status: "APPROVED" as const,
    ...(desde || hasta ? { approvedAt: { ...(desde ? { gte: desde } : {}), ...(hasta ? { lte: hasta } : {}) } } : {}),
    ...(campaignId ? { campaignId } : {}),
  };

  const payments = await prisma.payment.findMany({
    where,
    include: {
      user: { select: { name: true, email: true, phone: true } },
      campaign: { select: { name: true } },
    },
    orderBy: { approvedAt: "desc" },
  });

  const header = "Nombre,Correo,Telefono,Campaña,Metodo,Monto USD,Monto Bs,Referencia,Banco,Fecha Pago,Fecha Aprobacion\n";
  const rows = payments.map((p) =>
    [
      `"${p.user.name}"`,
      `"${p.user.email}"`,
      `"${p.user.phone ?? ""}"`,
      `"${p.campaign.name}"`,
      `"${METHOD_LABELS[p.method] ?? p.method}"`,
      Number(p.amount).toFixed(2),
      p.localAmount ? Number(p.localAmount).toFixed(2) : "",
      `"${p.reference ?? ""}"`,
      `"${p.bankName ?? ""}"`,
      p.paymentDate.toISOString().slice(0, 10),
      p.approvedAt ? p.approvedAt.toISOString().slice(0, 10) : "",
    ].join(",")
  ).join("\n");

  const csv = "﻿" + header + rows; // BOM for Excel UTF-8

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="reporte-pagos-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
