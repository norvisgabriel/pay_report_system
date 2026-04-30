export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { StatusBadge } from "@/components/ui/badge";
import { formatCurrency, formatDate, PAYMENT_METHODS } from "@/lib/utils";

const APP = process.env.NEXT_PUBLIC_APP_NAME ?? "PayReport";
import { ValidateActions } from "@/components/admin/validate-actions";
import { AdminReceiptActions } from "@/components/admin/receipt-actions";
import { generateReceiptQR } from "@/lib/qr";

export default async function AdminPaymentDetailPage({ params }: { params: { id: string } }) {
  const payment = await prisma.payment.findUnique({
    where: { id: params.id },
    include: {
      user: { select: { id: true, name: true, email: true, phone: true } },
      campaign: true,
      receipt: true,
    },
  });

  if (!payment) notFound();

  const qrDataUrl =
    payment.status === "APPROVED" && payment.receipt
      ? await generateReceiptQR(payment.receipt.token)
      : null;

  const receiptUrl =
    payment.receipt
      ? `${process.env.NEXT_PUBLIC_APP_URL}/validate/${payment.receipt.token}`
      : null;

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div className="flex items-center gap-3 no-print">
        <Link href="/admin/payments" className="text-sm text-gray-500 hover:text-gray-700">← Volver</Link>
        <h1 className="text-xl font-bold text-gray-900">Revisar Pago</h1>
        <StatusBadge status={payment.status} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 no-print">
        <div className="card p-5 space-y-3">
          <h2 className="text-sm font-semibold text-gray-700 border-b border-gray-100 pb-2">Usuario</h2>
          <Field label="Nombre" value={payment.user.name} />
          <Field label="Correo" value={payment.user.email} />
          {payment.user.phone && <Field label="Teléfono" value={payment.user.phone} />}
        </div>

        <div className="card p-5 space-y-3">
          <h2 className="text-sm font-semibold text-gray-700 border-b border-gray-100 pb-2">Pago</h2>
          <Field label="Campaña" value={payment.campaign.name} />
          <Field label="Monto" value={formatCurrency(Number(payment.amount), "USD")} />
          {payment.localAmount && (
            <Field
              label="Monto en Bs."
              value={`Bs. ${Number(payment.localAmount).toLocaleString("es-VE", { minimumFractionDigits: 2 })} (tasa: ${Number(payment.exchangeRate).toFixed(2)})`}
            />
          )}
          {payment.reference && <Field label="Referencia" value={payment.reference} />}
          {payment.bankName && <Field label="Banco" value={payment.bankName} />}
          {payment.phoneNumber && <Field label="Teléfono pago" value={payment.phoneNumber} />}
          <Field label="Fecha de pago" value={formatDate(payment.paymentDate)} />
          <Field label="Reportado el" value={formatDate(payment.createdAt)} />
          {payment.approvedAt && <Field label="Aprobado el" value={formatDate(payment.approvedAt)} />}
        </div>
      </div>

      {payment.notes && (
        <div className="card p-4 no-print">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Observaciones del usuario</p>
          <p className="text-sm text-gray-700">{payment.notes}</p>
        </div>
      )}

      {payment.imageUrl ? (
        <div className="card p-4 no-print">
          <p className="text-sm font-medium text-gray-700 mb-3">Comprobante de Pago</p>
          <a href={payment.imageUrl} target="_blank" rel="noopener noreferrer" className="block">
            <div className="relative rounded-lg overflow-hidden bg-gray-50 border border-gray-200">
              <Image
                src={payment.imageUrl}
                alt="Comprobante de pago"
                width={800}
                height={600}
                className="w-full object-contain max-h-96"
              />
            </div>
            <p className="mt-1 text-xs text-primary-600">Haz clic para abrir en tamaño completo</p>
          </a>
        </div>
      ) : (
        <div className="card p-4 text-sm text-gray-500 no-print">
          Sin comprobante adjunto (pago en efectivo).
        </div>
      )}

      {/* Recibo con QR — visible si el pago está aprobado */}
      {qrDataUrl && payment.receipt && receiptUrl && (
        <div className="card p-6 text-center" id="receipt">

          {/* ── Visible en pantalla ── */}
          <div className="no-print">
            <div className="flex items-center justify-center gap-2 mb-1">
              <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <p className="text-sm font-semibold text-gray-700">Recibo Oficial — Código QR</p>
            </div>
            <p className="text-xs text-gray-400 mb-4">
              Escanea para verificar autenticidad · Válido hasta {payment.receipt.validUntil ? formatDate(payment.receipt.validUntil) : "sin fecha"}
            </p>
            <Image
              src={qrDataUrl}
              alt="Código QR del recibo"
              width={180}
              height={180}
              className="mx-auto rounded-lg"
            />
            <p className="mt-2 text-xs text-gray-400 font-mono">{payment.receipt.token.slice(0, 20)}…</p>
          </div>

          {/* ── Solo al imprimir: recibo completo con datos + QR ── */}
          <div className="print-only text-left">
            {/* Encabezado */}
            <div className="text-center mb-3 pb-2 border-b border-gray-200">
              <p className="font-bold text-sm">{APP}</p>
              <p className="text-xs text-green-700 font-semibold mt-0.5">✓ Pago Aprobado</p>
            </div>

            {/* Datos del pago */}
            <div className="space-y-1.5 mb-3">
              {[
                { label: "Representante",  value: payment.user.name },
                { label: "Campaña",        value: payment.campaign.name },
                { label: "Monto",          value: formatCurrency(Number(payment.amount), "USD") },
                ...(payment.localAmount ? [{
                  label: "Bolívares",
                  value: `Bs. ${Number(payment.localAmount).toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                }] : []),
                { label: "Método de Pago", value: PAYMENT_METHODS.find((m) => m.value === payment.method)?.label ?? payment.method },
                ...(payment.reference ? [{ label: "Referencia", value: payment.reference }] : []),
                ...(payment.bankName  ? [{ label: "Banco",      value: payment.bankName  }] : []),
                { label: "Fecha de pago",  value: formatDate(payment.paymentDate) },
                { label: "Validado",       value: formatDate(payment.approvedAt!) },
                ...(payment.receipt.validUntil ? [{ label: "Válido hasta", value: formatDate(payment.receipt.validUntil) }] : []),
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between gap-3 text-xs border-b border-gray-100 pb-1">
                  <span className="text-gray-400 shrink-0">{label}</span>
                  <span className="font-medium text-gray-800 text-right">{value}</span>
                </div>
              ))}
            </div>

            {/* Separador perforado */}
            <div className="border-t-2 border-dashed border-gray-300 my-3" />

            {/* QR */}
            <div className="text-center">
              <Image
                src={qrDataUrl}
                alt="Código QR del recibo"
                width={160}
                height={160}
                className="mx-auto"
              />
              <p className="text-[9px] text-gray-400 mt-1 uppercase tracking-widest">ID de verificación</p>
              <p className="font-mono text-[9px] text-gray-400 break-all mt-0.5 px-2">{payment.receipt.token}</p>
            </div>
          </div>

          <AdminReceiptActions
            paymentId={payment.id}
            receiptUrl={receiptUrl}
            userName={payment.user.name}
          />
        </div>
      )}

      {payment.status === "PENDING" && (
        <ValidateActions paymentId={payment.id} />
      )}

      {payment.adminNotes && payment.status !== "PENDING" && (
        <div className={`card p-4 text-sm no-print ${payment.status === "REJECTED" ? "border-red-200 bg-red-50 text-red-700" : "border-green-200 bg-green-50 text-green-700"}`}>
          <p className="font-medium mb-1">Nota del administrador</p>
          <p>{payment.adminNotes}</p>
          {payment.approvedAt && (
            <p className="text-xs opacity-70 mt-1">{formatDate(payment.approvedAt)}</p>
          )}
        </div>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
      <p className="mt-0.5 text-sm text-gray-900">{value ?? "—"}</p>
    </div>
  );
}
