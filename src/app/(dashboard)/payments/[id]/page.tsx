export const dynamic = "force-dynamic";

import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { StatusBadge } from "@/components/ui/badge";
import { PrintButton } from "@/components/ui/print-button";
import { formatCurrency, formatDate, PAYMENT_METHODS } from "@/lib/utils";
import { generateReceiptQR } from "@/lib/qr";

const APP = process.env.NEXT_PUBLIC_APP_NAME ?? "Payment Report";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "";

const WA_ICON = (
  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);

export default async function PaymentDetailPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const payment = await prisma.payment.findUnique({
    where: { id: params.id },
    include: {
      user: { select: { name: true, email: true } },
      campaign: true,
      receipt: true,
    },
  });

  if (!payment) notFound();

  const isOwner = payment.userId === session.user.id;
  const isAdmin = session.user.role === "ADMIN";
  if (!isOwner && !isAdmin) redirect("/dashboard");

  const isApproved = payment.status === "APPROVED" && payment.receipt;
  const qrDataUrl = isApproved ? await generateReceiptQR(payment.receipt!.token) : null;
  const methodLabel = PAYMENT_METHODS.find((m) => m.value === payment.method)?.label ?? payment.method;
  const validateUrl = payment.receipt ? `${APP_URL}/validate/${payment.receipt.token}` : "";
  const waUrl = `https://wa.me/?text=${encodeURIComponent(`Mi recibo de pago verificado:\n${validateUrl}`)}`;

  /* ── RECIBO APROBADO: vista compacta tipo ticket ── */
  if (isApproved && qrDataUrl && payment.receipt) {
    return (
      <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-start py-6 px-4">

        {/* Nav — solo en pantalla */}
        <div className="no-print w-full max-w-xs mb-4 flex items-center justify-between">
          <Link href="/payments" className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1">
            ← Volver
          </Link>
          <StatusBadge status={payment.status} />
        </div>

        {/* Tarjeta recibo */}
        <div id="receipt" className="w-full max-w-xs bg-white rounded-2xl shadow-lg overflow-hidden">

          {/* Cabecera */}
          <div className="bg-green-600 px-5 pt-5 pb-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-green-200">{APP}</span>
              <span className="flex items-center gap-1 bg-white/20 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide">
                <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
                Aprobado
              </span>
            </div>
            <p className="text-3xl font-extrabold tracking-tight">
              {formatCurrency(Number(payment.amount), "USD")}
            </p>
            {payment.localAmount && (
              <p className="text-green-200 text-sm mt-0.5">
                Bs. {Number(payment.localAmount).toLocaleString("es-VE", { minimumFractionDigits: 2 })}
              </p>
            )}
          </div>

          {/* Datos */}
          <div className="px-5 py-4 space-y-2.5 text-xs">
            <Row label="Representante"   value={payment.user.name} bold />
            <Row label="Campaña"         value={payment.campaign.name} />
            <Row label="Método de Pago"  value={methodLabel} />
            {payment.reference && <Row label="Referencia" value={payment.reference} mono />}
            {payment.bankName  && <Row label="Banco"      value={payment.bankName} />}
            <Row label="Fecha de pago"  value={formatDate(payment.paymentDate)} />
            <Row label="Validado"        value={formatDate(payment.approvedAt!)} />
            {payment.receipt.validUntil && (
              <Row label="Válido hasta" value={formatDate(payment.receipt.validUntil)} />
            )}
          </div>

          {/* Separador perforado */}
          <div className="relative flex items-center mx-0 my-1">
            <div className="-ml-3 w-6 h-6 rounded-full bg-gray-100 shrink-0" />
            <div className="flex-1 border-t-2 border-dashed border-gray-200 mx-1" />
            <div className="-mr-3 w-6 h-6 rounded-full bg-gray-100 shrink-0" />
          </div>

          {/* QR */}
          <div className="px-5 py-4 text-center">
            <Image
              src={qrDataUrl}
              alt="Código QR"
              width={130}
              height={130}
              className="mx-auto rounded-lg"
            />
            <p className="text-[10px] text-gray-400 mt-2">Escanea para verificar autenticidad</p>
            <p className="font-mono text-[9px] text-gray-300 mt-1 break-all px-2 leading-relaxed">
              {payment.receipt.token}
            </p>
          </div>
        </div>

        {/* Botones — solo en pantalla */}
        <div className="no-print w-full max-w-xs mt-4 flex gap-2">
          <PrintButton label="Imprimir" className="flex-1 justify-center" />
          <a
            href={waUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 btn-secondary flex items-center justify-center gap-1.5 text-sm text-green-700 border-green-300 hover:bg-green-50"
          >
            {WA_ICON}
            WhatsApp
          </a>
          <Link
            href={validateUrl}
            target="_blank"
            className="flex-1 btn-secondary flex items-center justify-center text-sm text-center"
          >
            Verificar
          </Link>
        </div>
      </div>
    );
  }

  /* ── PENDIENTE / RECHAZADO: vista de detalle normal ── */
  return (
    <div className="max-w-xl mx-auto space-y-4 py-6 px-4">
      <div className="flex items-center gap-3">
        <Link href="/payments" className="text-sm text-gray-500 hover:text-gray-700">← Volver</Link>
        <h1 className="text-xl font-bold text-gray-900">Detalle del Pago</h1>
        <StatusBadge status={payment.status} />
      </div>

      <div className="card p-5 space-y-3 text-sm">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Campaña"     value={payment.campaign.name} />
          <Field label="Método"      value={methodLabel} />
          <Field label="Monto"       value={formatCurrency(Number(payment.amount), "USD")} />
          {payment.localAmount && (
            <Field label="Monto Bs." value={`Bs. ${Number(payment.localAmount).toLocaleString("es-VE", { minimumFractionDigits: 2 })}`} />
          )}
          {payment.reference  && <Field label="Referencia" value={payment.reference} />}
          {payment.bankName   && <Field label="Banco"      value={payment.bankName} />}
          {payment.phoneNumber && <Field label="Teléfono"  value={payment.phoneNumber} />}
          <Field label="Fecha de pago"  value={formatDate(payment.paymentDate)} />
          <Field label="Enviado el"     value={formatDate(payment.createdAt)} />
        </div>

        {payment.notes && (
          <div className="border-t border-gray-100 pt-3">
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Observaciones</p>
            <p className="text-sm text-gray-700">{payment.notes}</p>
          </div>
        )}

        {payment.adminNotes && (
          <div className={`rounded-lg px-4 py-3 text-sm ${payment.status === "REJECTED" ? "bg-red-50 border border-red-200 text-red-700" : "bg-blue-50 border border-blue-200 text-blue-700"}`}>
            <p className="font-medium mb-0.5">Nota del administrador</p>
            <p>{payment.adminNotes}</p>
          </div>
        )}
      </div>

      {payment.imageUrl && (
        <div className="card p-4">
          <p className="text-sm font-medium text-gray-700 mb-2">Comprobante</p>
          <a href={payment.imageUrl} target="_blank" rel="noopener noreferrer">
            <Image
              src={payment.imageUrl}
              alt="Comprobante"
              width={600}
              height={400}
              className="w-full object-contain max-h-64 rounded-lg border border-gray-100"
            />
          </a>
        </div>
      )}
    </div>
  );
}

function Row({ label, value, bold, mono }: { label: string; value: string; bold?: boolean; mono?: boolean }) {
  return (
    <div className="flex justify-between items-baseline gap-3 border-b border-gray-100 pb-2 last:border-0 last:pb-0">
      <span className="text-gray-400 shrink-0">{label}</span>
      <span className={`text-right ${bold ? "font-semibold text-gray-900" : "text-gray-700"} ${mono ? "font-mono text-[10px]" : ""}`}>
        {value}
      </span>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-gray-400 uppercase tracking-wide">{label}</p>
      <p className="mt-0.5 text-sm font-medium text-gray-900">{value}</p>
    </div>
  );
}
