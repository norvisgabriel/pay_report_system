export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDate } from "@/lib/utils";

const APP = process.env.NEXT_PUBLIC_APP_NAME ?? "PayReport";

const METHOD_LABELS: Record<string, string> = {
  efectivo:      "Efectivo en Caja",
  efectivo_caja: "Efectivo en Caja",
  transferencia: "Transferencia Bancaria",
  transfer:      "Transferencia Bancaria",
  pago_movil:    "Pago Móvil",
};

export default async function ValidateReceiptPage({ params }: { params: { token: string } }) {
  const receipt = await prisma.receipt.findUnique({
    where: { token: params.token },
    include: {
      payment: {
        include: {
          user: { select: { name: true } },
          campaign: { select: { name: true } },
        },
      },
    },
  });

  if (!receipt || receipt.payment.status !== "APPROVED") {
    notFound();
  }

  const isExpired = receipt.validUntil != null && receipt.validUntil < new Date();
  const { payment } = receipt;

  const rows = [
    { label: "Representante", value: payment.user.name },
    { label: "Campaña", value: payment.campaign.name },
    { label: "Monto", value: formatCurrency(Number(payment.amount), "USD") },
    ...(payment.localAmount
      ? [{ label: "Monto Bs.", value: `Bs. ${Number(payment.localAmount).toLocaleString("es-VE", { minimumFractionDigits: 2 })}` }]
      : []),
    { label: "Método de Pago", value: METHOD_LABELS[payment.method] ?? payment.method },
    ...(payment.reference ? [{ label: "Referencia", value: payment.reference }] : []),
    ...(payment.bankName ? [{ label: "Banco", value: payment.bankName }] : []),
    { label: "Fecha de pago", value: formatDate(payment.paymentDate) },
    { label: "Validado", value: formatDate(payment.approvedAt!) },
  ];

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">

        {/* Tarjeta de recibo */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">

          {/* Encabezado */}
          <div
            className="px-6 py-5 text-white text-center"
            style={isExpired
              ? { background: "linear-gradient(135deg, #d97706 0%, #f59e0b 100%)" }
              : { background: "linear-gradient(135deg, #4338ca 0%, #6366f1 100%)" }
            }
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-widest opacity-80">{APP}</span>
              <span className={`flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
                isExpired ? "bg-amber-600/50" : "bg-white/20"
              }`}>
                {isExpired ? (
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01" />
                  </svg>
                ) : (
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
                {isExpired ? "Vencido" : "Aprobado"}
              </span>
            </div>
            <p className="text-3xl font-bold leading-none">
              {formatCurrency(Number(payment.amount), "USD")}
            </p>
            {payment.localAmount && (
              <p className="text-sm opacity-80 mt-1">
                Bs. {Number(payment.localAmount).toLocaleString("es-VE", { minimumFractionDigits: 2 })}
              </p>
            )}
            <p className="text-xs opacity-70 mt-2">
              {isExpired ? "Sin validez para el próximo año escolar" : "Recibo oficial verificado"}
            </p>
          </div>

          {/* Datos del pago */}
          <div className="px-5 py-4 divide-y divide-gray-100">
            {rows.map(({ label, value }) => (
              <div key={label} className="flex justify-between items-baseline py-2 gap-4">
                <span className="text-xs text-gray-400 shrink-0">{label}</span>
                <span className="text-xs font-semibold text-gray-800 text-right">{value}</span>
              </div>
            ))}
          </div>

          {/* Mensaje de gracias */}
          {!isExpired && (
            <div className="px-5 py-3 text-center border-t border-gray-100"
              style={{ background: "linear-gradient(135deg, #eef2ff 0%, #f5f3ff 100%)" }}
            >
              <p className="text-sm font-semibold text-indigo-700">¡Gracias por tu pago!</p>
              <p className="text-xs text-indigo-400 mt-0.5">Este recibo es válido como comprobante oficial.</p>
            </div>
          )}

          {/* Pie — token de verificación */}
          <div className="border-t border-dashed border-gray-200 bg-gray-50 px-5 py-3 text-center">
            <p className="text-[10px] text-gray-400 uppercase tracking-widest mb-0.5">ID de verificación</p>
            <p className="font-mono text-[10px] text-gray-500 break-all">{receipt.token}</p>
          </div>
        </div>

        {/* Nota al pie */}
        <p className="text-center text-[11px] text-gray-400 mt-3">
          {isExpired
            ? `Este recibo estuvo vigente hasta el ${receipt.validUntil ? formatDate(receipt.validUntil) : "fecha desconocida"}`
            : `Verificado automáticamente por ${APP}`}
        </p>

        <div className="text-center mt-2">
          <Link href="/" className="text-xs text-gray-400 hover:text-gray-600">
            ← Ir a {APP}
          </Link>
        </div>
      </div>
    </main>
  );
}
