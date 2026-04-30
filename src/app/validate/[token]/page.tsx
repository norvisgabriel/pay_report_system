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
    ...(receipt.validUntil
      ? [{ label: "Válido hasta", value: formatDate(receipt.validUntil) }]
      : []),
  ];

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">

        {/* Tarjeta de recibo */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">

          {/* Encabezado */}
          <div className={`px-6 py-5 text-white text-center ${isExpired ? "bg-amber-500" : "bg-green-600"}`}>
            <div className="flex items-center justify-center gap-2 mb-1">
              {isExpired ? (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                </svg>
              ) : (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
              <span className="font-bold tracking-wide text-sm uppercase">
                {isExpired ? "Pago Registrado" : "Pago Verificado"}
              </span>
            </div>
            <p className={`text-xs font-medium ${isExpired ? "text-amber-100" : "text-green-100"}`}>
              {isExpired
                ? "Sin validez para el próximo año escolar"
                : `Recibo oficial · ${APP}`}
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
