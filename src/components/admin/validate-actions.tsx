"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";

export function ValidateActions({ paymentId }: { paymentId: string }) {
  const router = useRouter();
  const [action, setAction] = useState<"APPROVED" | "REJECTED" | null>(null);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    if (!action) return;
    if (action === "REJECTED" && !notes.trim()) {
      setError("Por favor indica el motivo del rechazo");
      return;
    }

    setLoading(true);
    setError("");

    const res = await fetch(`/api/payments/${paymentId}/validate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, adminNotes: notes || undefined }),
    });

    const json = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(json.error ?? "La acción falló");
      return;
    }

    router.refresh();
    setAction(null);
    setNotes("");
  }

  return (
    <div className="card p-5 space-y-4 border-2 border-dashed border-gray-200">
      <h2 className="text-sm font-semibold text-gray-700">Decisión de Revisión</h2>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={() => setAction("APPROVED")}
          className={`flex-1 rounded-lg border-2 p-3 text-sm font-medium transition-colors ${
            action === "APPROVED"
              ? "border-green-500 bg-green-50 text-green-700"
              : "border-gray-200 text-gray-600 hover:border-green-300 hover:bg-green-50"
          }`}
        >
          ✓ Aprobar
        </button>
        <button
          onClick={() => setAction("REJECTED")}
          className={`flex-1 rounded-lg border-2 p-3 text-sm font-medium transition-colors ${
            action === "REJECTED"
              ? "border-red-500 bg-red-50 text-red-700"
              : "border-gray-200 text-gray-600 hover:border-red-300 hover:bg-red-50"
          }`}
        >
          ✗ Rechazar
        </button>
      </div>

      {action && (
        <div className="space-y-3">
          <Textarea
            label={action === "REJECTED" ? "Motivo del rechazo *" : "Notas del administrador (opcional)"}
            placeholder={
              action === "REJECTED"
                ? "Explica por qué se rechaza este pago..."
                : "Notas opcionales sobre esta aprobación..."
            }
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />

          <div className="flex gap-2">
            <Button
              onClick={submit}
              loading={loading}
              variant={action === "APPROVED" ? "primary" : "danger"}
              className="flex-1"
            >
              Confirmar {action === "APPROVED" ? "Aprobación" : "Rechazo"}
            </Button>
            <Button variant="secondary" onClick={() => { setAction(null); setNotes(""); }}>
              Cancelar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
