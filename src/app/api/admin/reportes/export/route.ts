export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";

const METHOD_LABELS: Record<string, string> = {
  efectivo:      "Efectivo en Caja",
  efectivo_caja: "Efectivo en Caja",
  transferencia: "Transferencia Bancaria",
  transfer:      "Transferencia Bancaria",
  pago_movil:    "Pago Móvil",
};

const STATUS_LABELS: Record<string, string> = {
  APPROVED: "Aprobado",
  PENDING:  "Pendiente",
  REJECTED: "Rechazado",
};

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const desde      = searchParams.get("desde") ? new Date(searchParams.get("desde")!) : undefined;
  const hasta      = searchParams.get("hasta")
    ? new Date(new Date(searchParams.get("hasta")!).setHours(23, 59, 59, 999))
    : undefined;
  const campaignId = searchParams.get("campaignId") || undefined;
  const status     = searchParams.get("status");
  const method     = searchParams.get("method") || undefined;

  const statusFilter = status && status !== "ALL"
    ? { status: status as "APPROVED" | "PENDING" | "REJECTED" }
    : {};

  const where = {
    ...statusFilter,
    ...(method ? { method } : {}),
    ...(campaignId ? { campaignId } : {}),
    ...(desde || hasta
      ? { approvedAt: { ...(desde ? { gte: desde } : {}), ...(hasta ? { lte: hasta } : {}) } }
      : {}),
  };

  const payments = await prisma.payment.findMany({
    where,
    include: {
      user:     { select: { name: true, email: true, phone: true } },
      campaign: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  // Construir filas para Excel
  const rows = payments.map((p, i) => ({
    "#":               i + 1,
    "Representante":   p.user.name,
    "Correo":          p.user.email,
    "Teléfono":        p.user.phone ?? "",
    "Campaña":         p.campaign.name,
    "Método de Pago":  METHOD_LABELS[p.method] ?? p.method,
    "Estado":          STATUS_LABELS[p.status] ?? p.status,
    "Monto USD":       Number(p.amount),
    "Monto Bs.":       p.localAmount ? Number(p.localAmount) : "",
    "Tasa (Bs/USD)":   p.exchangeRate ? Number(p.exchangeRate) : "",
    "Referencia":      p.reference ?? "",
    "Banco":           p.bankName ?? "",
    "Fecha de Pago":   p.paymentDate.toISOString().slice(0, 10),
    "Fecha Aprobación": p.approvedAt ? p.approvedAt.toISOString().slice(0, 10) : "",
  }));

  // Fila de totales
  const totalUSD = payments.filter(p => p.status === "APPROVED").reduce((s, p) => s + Number(p.amount), 0);
  const totalVES = payments.filter(p => p.status === "APPROVED").reduce((s, p) => s + Number(p.localAmount ?? 0), 0);

  rows.push({
    "#":               "" as unknown as number,
    "Representante":   `TOTAL APROBADOS (${payments.filter(p => p.status === "APPROVED").length})`,
    "Correo":          "",
    "Teléfono":        "",
    "Campaña":         "",
    "Método de Pago":  "",
    "Estado":          "",
    "Monto USD":       totalUSD,
    "Monto Bs.":       totalVES || "",
    "Tasa (Bs/USD)":   "",
    "Referencia":      "",
    "Banco":           "",
    "Fecha de Pago":   "",
    "Fecha Aprobación": "",
  });

  const ws = XLSX.utils.json_to_sheet(rows);

  // Anchos de columna
  ws["!cols"] = [
    { wch: 4  },  // #
    { wch: 25 },  // Representante
    { wch: 28 },  // Correo
    { wch: 14 },  // Teléfono
    { wch: 22 },  // Campaña
    { wch: 22 },  // Método
    { wch: 12 },  // Estado
    { wch: 12 },  // Monto USD
    { wch: 14 },  // Monto Bs.
    { wch: 14 },  // Tasa
    { wch: 14 },  // Referencia
    { wch: 14 },  // Banco
    { wch: 14 },  // Fecha Pago
    { wch: 16 },  // Fecha Aprobación
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Pagos");

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  const filename = `reporte-pagos-${new Date().toISOString().slice(0, 10)}.xlsx`;

  return new NextResponse(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
