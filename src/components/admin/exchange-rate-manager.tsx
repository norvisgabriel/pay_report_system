"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";

const schema = z.object({
  rate: z.string().min(1, "La tasa es requerida"),
  effectiveDate: z.string().min(1, "La fecha es requerida"),
});

type FormData = z.infer<typeof schema>;

interface Rate {
  id: string;
  fromCurrency: string;
  toCurrency: string;
  rate: string;
  effectiveDate: string;
  source: string;
}

interface FetchResult {
  bcv: { promedio: number; actualizado: string } | null;
  paralelo: { promedio: number; actualizado: string } | null;
  saved: Rate;
}

const SOURCE_LABELS: Record<string, string> = {
  "dolarapi-paralelo": "DolarAPI · Paralelo",
  "dolarapi-oficial": "DolarAPI · BCV",
  manual: "Manual",
};

export function ExchangeRateManager({ initialRates }: { initialRates: Rate[] }) {
  const [rates, setRates] = useState(initialRates);
  const [showOverride, setShowOverride] = useState(false);
  const [error, setError] = useState("");
  const [fetching, setFetching] = useState(false);
  const [fetchResult, setFetchResult] = useState<FetchResult | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { effectiveDate: new Date().toISOString().slice(0, 10) },
  });

  async function fetchRate() {
    setFetching(true);
    setError("");
    setFetchResult(null);

    const res = await fetch("/api/admin/exchange-rates/fetch", { method: "POST" });
    const json = await res.json();
    setFetching(false);

    if (res.ok) {
      setFetchResult(json.data);
      const saved = json.data.saved;
      const newRate: Rate = {
        id: saved.id,
        fromCurrency: saved.fromCurrency,
        toCurrency: saved.toCurrency,
        rate: String(saved.rate),
        effectiveDate: saved.effectiveDate,
        source: saved.source,
      };
      setRates((prev) => [newRate, ...prev.filter((r) => r.id !== saved.id)]);
    } else {
      setError(json.error ?? "Error al obtener la tasa");
    }
  }

  async function deleteRate(id: string) {
    setDeletingId(id);
    const res = await fetch(`/api/exchange-rates/${id}`, { method: "DELETE" });
    setDeletingId(null);
    if (res.ok) {
      setRates((prev) => prev.filter((r) => r.id !== id));
    } else {
      const json = await res.json();
      setError(json.error ?? "Error al eliminar la tasa");
    }
  }

  async function onSubmit(data: FormData) {
    setError("");
    const res = await fetch("/api/exchange-rates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fromCurrency: "USD",
        toCurrency: "VES",
        rate: parseFloat(data.rate),
        effectiveDate: data.effectiveDate,
        source: "manual",
      }),
    });

    const json = await res.json();
    if (!res.ok) { setError(json.error ?? "Error al guardar la tasa"); return; }

    const newRate: Rate = {
      id: json.data.id,
      fromCurrency: "USD",
      toCurrency: "VES",
      rate: data.rate,
      effectiveDate: new Date(data.effectiveDate).toISOString(),
      source: "manual",
    };

    setRates((prev) => [newRate, ...prev.filter((r) => r.id !== json.data.id)]);
    reset({ effectiveDate: new Date().toISOString().slice(0, 10) });
    setShowOverride(false);
  }

  return (
    <div className="space-y-4">
      {/* Panel de auto-fetch */}
      <div className="card p-5 space-y-3">
        <div>
          <p className="text-sm font-semibold text-gray-800">Tasa del Día — DolarAPI Venezuela</p>
          <p className="text-xs text-gray-500 mt-0.5">
            Obtiene la tasa USD/VES desde{" "}
            <span className="font-mono">ve.dolarapi.com</span>. Se guarda la tasa
            <strong> BCV</strong> (Banco Central de Venezuela). El cron la actualiza automáticamente cada día.
          </p>
        </div>

        <div className="flex gap-2">
          <Button size="sm" onClick={fetchRate} loading={fetching} variant="secondary">
            Obtener tasa ahora
          </Button>
          <Button size="sm" onClick={() => setShowOverride(!showOverride)} variant="ghost">
            {showOverride ? "Cancelar" : "Ingresar tasa manual"}
          </Button>
        </div>

        {/* Resultado del fetch: muestra BCV y paralelo */}
        {fetchResult && (
          <div className="grid grid-cols-2 gap-3 pt-1">
            {fetchResult.bcv && (
              <div className="rounded-lg bg-blue-50 border border-blue-200 p-3">
                <p className="text-xs font-medium text-blue-600 mb-0.5">Tasa BCV (oficial) ✓ guardada</p>
                <p className="text-lg font-bold text-blue-900">
                  Bs. {fetchResult.bcv.promedio.toLocaleString("es-VE", { minimumFractionDigits: 2 })}
                </p>
                <p className="text-[10px] text-blue-400 mt-0.5">por 1 USD</p>
              </div>
            )}
            {fetchResult.paralelo && (
              <div className="rounded-lg bg-green-50 border border-green-200 p-3">
                <p className="text-xs font-medium text-green-600 mb-0.5">Tasa Paralela (referencia)</p>
                <p className="text-lg font-bold text-green-900">
                  Bs. {fetchResult.paralelo.promedio.toLocaleString("es-VE", { minimumFractionDigits: 2 })}
                </p>
                <p className="text-[10px] text-green-400 mt-0.5">por 1 USD</p>
              </div>
            )}
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{error}</div>
      )}

      {/* Formulario de tasa manual */}
      {showOverride && (
        <form onSubmit={handleSubmit(onSubmit)} className="card p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700">Ingresar tasa manualmente (USD → VES)</h2>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Tasa (Bs. por 1 USD)"
              type="number"
              step="0.01"
              min="1"
              placeholder="Ej: 63.50"
              {...register("rate")}
              error={errors.rate?.message}
            />
            <Input
              label="Fecha"
              type="date"
              required
              {...register("effectiveDate")}
              error={errors.effectiveDate?.message}
            />
          </div>
          <Button type="submit" loading={isSubmitting}>Guardar tasa</Button>
        </form>
      )}

      {/* Historial */}
      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 text-xs font-medium text-gray-500 uppercase tracking-wide">
          Historial de tasas
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Par</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tasa</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fuente</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rates.length === 0 && (
              <tr>
                <td colSpan={5} className="py-8 text-center text-sm text-gray-500">
                  Sin tasas registradas — haz clic en "Obtener tasa ahora"
                </td>
              </tr>
            )}
            {rates.map((r) => (
              <tr key={r.id} className={`hover:bg-gray-50 ${r.toCurrency !== "VES" ? "bg-red-50" : ""}`}>
                <td className="px-4 py-3 font-mono text-sm font-medium text-gray-900">
                  <span className={r.toCurrency !== "VES" ? "text-red-600" : ""}>
                    {r.fromCurrency} → {r.toCurrency}
                  </span>
                  {r.toCurrency !== "VES" && (
                    <span className="ml-2 text-[10px] text-red-500 font-normal">⚠ par incorrecto</span>
                  )}
                </td>
                <td className="px-4 py-3 font-semibold text-gray-900">
                  Bs. {parseFloat(r.rate).toLocaleString("es-VE", { minimumFractionDigits: 2 })}
                </td>
                <td className="px-4 py-3 text-gray-500">{formatDate(r.effectiveDate)}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    r.source.includes("paralelo") ? "bg-green-100 text-green-700" :
                    r.source.includes("oficial") ? "bg-blue-100 text-blue-700" :
                    "bg-orange-100 text-orange-700"
                  }`}>
                    {SOURCE_LABELS[r.source] ?? r.source}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    disabled={deletingId === r.id}
                    onClick={() => deleteRate(r.id)}
                    className="text-xs text-red-500 hover:text-red-700 disabled:opacity-40"
                    title="Eliminar tasa"
                  >
                    {deletingId === r.id ? "…" : "Eliminar"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
