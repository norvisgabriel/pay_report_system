"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Image from "next/image";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const schema = z.object({
  method: z.enum(["efectivo", "transferencia", "pago_movil"], {
    required_error: "Selecciona un método de pago",
  }),
  bankName: z.string().optional(),
  reference: z.string().optional(),
  phoneNumber: z.string().optional(),
  paymentDate: z.string().min(1, "La fecha de pago es requerida"),
  notes: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.method === "transferencia") {
    if (!data.bankName?.trim()) ctx.addIssue({ code: "custom", path: ["bankName"], message: "El banco es requerido" });
    if (!data.reference?.trim()) ctx.addIssue({ code: "custom", path: ["reference"], message: "El número de referencia es requerido" });
  }
  if (data.method === "pago_movil") {
    if (!data.phoneNumber?.trim()) ctx.addIssue({ code: "custom", path: ["phoneNumber"], message: "El número de teléfono es requerido" });
    if (!data.bankName?.trim()) ctx.addIssue({ code: "custom", path: ["bankName"], message: "El banco es requerido" });
  }
});

type FormData = z.infer<typeof schema>;

const RATE_SOURCE_LABELS: Record<string, string> = {
  "dolarapi-oficial":  "BCV (Banco Central)",
  "dolarapi-paralelo": "Paralelo",
  manual:              "Manual",
};

interface Props {
  campaign: { id: string; name: string; price: number; currency: string };
  exchangeRate: number | null;
  exchangeRateSource: string | null;
  campaignId: string;
}

const METODOS = [
  { value: "efectivo", label: "💵 Efectivo en Caja", desc: "Pago presencial en oficina" },
  { value: "transferencia", label: "🏦 Transferencia Bancaria", desc: "Transferencia desde tu banco" },
  { value: "pago_movil", label: "📱 Pago Móvil", desc: "Pago móvil interbancario" },
];

const BANCOS_VE = [
  "Banco de Venezuela", "Banesco", "Mercantil", "BBVA Provincial",
  "Banco Bicentenario", "BNC", "Bancaribe", "Banco Exterior",
  "Banco Activo", "Bancamiga", "Otro",
];

export function PaymentForm({ campaign, exchangeRate, exchangeRateSource, campaignId }: Props) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState("");
  const [error, setError] = useState("");

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const method = watch("method");
  const vesAmount = exchangeRate ? (campaign.price * exchangeRate).toFixed(2) : null;
  const needsImage = method === "transferencia" || method === "pago_movil";

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setUploadError("");
    setFile(f);
    if (f.type.startsWith("image/")) setPreview(URL.createObjectURL(f));
    else setPreview(null);
  }

  async function onSubmit(data: FormData) {
    setError("");
    if (needsImage && !file) {
      setUploadError("El comprobante de pago es requerido");
      return;
    }

    let imageUrl: string | undefined;
    let imagePublicId: string | undefined;

    if (file) {
      const formData = new FormData();
      formData.append("file", file);
      const uploadRes = await fetch("/api/upload", { method: "POST", body: formData });
      const uploadJson = await uploadRes.json();
      if (!uploadRes.ok) { setUploadError(uploadJson.error ?? "Error al subir comprobante"); return; }
      imageUrl = uploadJson.data.url;
      imagePublicId = uploadJson.data.publicId;
    }

    const res = await fetch("/api/payments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        campaignId,
        amount: campaign.price,
        exchangeRate: exchangeRate ?? undefined,
        localAmount: vesAmount ? parseFloat(vesAmount) : undefined,
        method: data.method,
        bankName: data.bankName || undefined,
        reference: data.reference || undefined,
        phoneNumber: data.phoneNumber || undefined,
        paymentDate: new Date(data.paymentDate).toISOString(),
        imageUrl,
        imagePublicId,
        notes: data.notes,
      }),
    });

    const json = await res.json();
    if (!res.ok) { setError(json.error ?? "Error al reportar el pago"); return; }

    router.push(`/payments/${json.data.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Resumen del monto */}
      <div className="rounded-xl bg-primary-50 border border-primary-200 p-4">
        <p className="text-xs font-medium text-primary-600 uppercase tracking-wide mb-3">
          Monto a pagar — {campaign.name}
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-white border border-primary-100 px-3 py-2.5">
            <p className="text-[10px] font-medium text-primary-500 uppercase tracking-wide mb-0.5">Dólares (USD)</p>
            <p className="text-2xl font-bold text-primary-900">${campaign.price.toFixed(2)}</p>
          </div>
          <div className={`rounded-lg border px-3 py-2.5 ${vesAmount ? "bg-white border-primary-100" : "bg-yellow-50 border-yellow-200"}`}>
            <p className="text-[10px] font-medium text-primary-500 uppercase tracking-wide mb-0.5">Bolívares (VES)</p>
            {vesAmount && exchangeRate ? (
              <p className="text-2xl font-bold text-primary-900">
                Bs.{" "}
                {parseFloat(vesAmount).toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            ) : (
              <p className="text-sm font-medium text-yellow-600 mt-1">⚠ Sin tasa</p>
            )}
          </div>
        </div>
        {vesAmount && exchangeRate && (
          <p className="text-xs text-primary-400 mt-2 text-center">
            Tasa del día ({exchangeRateSource ? RATE_SOURCE_LABELS[exchangeRateSource] ?? exchangeRateSource : "Manual"}
            ): 1 USD = Bs.{" "}
            {exchangeRate.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        )}
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {/* Método de pago */}
      <div className="space-y-2">
        <p className="text-sm font-medium text-gray-700">Método de pago <span className="text-red-500">*</span></p>
        <div className="grid gap-2 sm:grid-cols-3">
          {METODOS.map((m) => (
            <label
              key={m.value}
              className={`flex flex-col gap-1 rounded-xl border-2 p-3 cursor-pointer transition-colors ${
                method === m.value
                  ? "border-primary-500 bg-primary-50"
                  : "border-gray-200 hover:border-primary-300"
              }`}
            >
              <input type="radio" value={m.value} {...register("method")} className="sr-only" />
              <span className="text-sm font-medium text-gray-900">{m.label}</span>
              <span className="text-xs text-gray-500">{m.desc}</span>
            </label>
          ))}
        </div>
        {errors.method && <p className="text-xs text-red-600">{errors.method.message}</p>}
      </div>

      {/* Campos según método */}
      {method === "transferencia" && (
        <div className="space-y-4 rounded-xl border border-gray-200 p-4 bg-gray-50">
          <p className="text-sm font-semibold text-gray-700">Datos de la transferencia</p>
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Banco emisor <span className="text-red-500">*</span></label>
            <select {...register("bankName")} className="input-base">
              <option value="">Selecciona el banco</option>
              {BANCOS_VE.map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
            {errors.bankName && <p className="text-xs text-red-600">{errors.bankName.message}</p>}
          </div>
          <Input
            label="Número de referencia / operación"
            required
            placeholder="Ej: 00123456789"
            {...register("reference")}
            error={errors.reference?.message}
          />
        </div>
      )}

      {method === "pago_movil" && (
        <div className="space-y-4 rounded-xl border border-gray-200 p-4 bg-gray-50">
          <p className="text-sm font-semibold text-gray-700">Datos del Pago Móvil</p>
          <Input
            label="Número de teléfono asociado"
            required
            placeholder="Ej: 0414-1234567"
            type="tel"
            {...register("phoneNumber")}
            error={errors.phoneNumber?.message}
          />
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Banco <span className="text-red-500">*</span></label>
            <select {...register("bankName")} className="input-base">
              <option value="">Selecciona el banco</option>
              {BANCOS_VE.map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
            {errors.bankName && <p className="text-xs text-red-600">{errors.bankName.message}</p>}
          </div>
        </div>
      )}

      {/* Fecha de pago */}
      <Input
        label="Fecha del pago"
        type="date"
        required
        {...register("paymentDate")}
        error={errors.paymentDate?.message}
      />

      {/* Comprobante */}
      {method && (
        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700">
            Comprobante de pago
            {needsImage && <span className="text-red-500 ml-1">*</span>}
            {!needsImage && <span className="text-gray-400 ml-1">(opcional)</span>}
          </label>
          <div className="rounded-xl border-2 border-dashed border-gray-300 p-4 text-center hover:border-primary-400 transition-colors">
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileChange}
              className="hidden"
              id="comprobante"
            />
            <label htmlFor="comprobante" className="cursor-pointer">
              {preview ? (
                <div className="relative mx-auto h-48 w-full max-w-sm">
                  <Image src={preview} alt="Vista previa" fill className="object-contain rounded-lg" />
                </div>
              ) : (
                <div className="py-4">
                  <svg className="mx-auto h-10 w-10 text-gray-300" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                    <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <p className="mt-2 text-sm text-gray-500">
                    <span className="font-medium text-primary-600">Haz clic para subir</span> o arrastra tu imagen
                  </p>
                  <p className="text-xs text-gray-400">PNG, JPG o WebP — máx. 10MB</p>
                </div>
              )}
            </label>
          </div>
          {file && <p className="text-xs text-gray-500">📎 {file.name}</p>}
          {uploadError && <p className="text-xs text-red-600">{uploadError}</p>}
        </div>
      )}

      <div className="space-y-1">
        <label className="block text-sm font-medium text-gray-700">Observaciones (opcional)</label>
        <textarea
          rows={2}
          placeholder="Algún detalle adicional..."
          className="input-base resize-none"
          {...register("notes")}
        />
      </div>

      <Button type="submit" loading={isSubmitting} className="w-full" disabled={!method}>
        Reportar Pago
      </Button>
    </form>
  );
}
