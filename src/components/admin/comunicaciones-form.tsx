"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";

interface Target {
  id: string;
  name: string;
  email: string;
  phone: string | null;
}

interface Campaign {
  id: string;
  name: string;
}

interface Props {
  campaigns: Campaign[];
}

export function ComunicacionesForm({ campaigns }: Props) {
  const [campaignId, setCampaignId] = useState(campaigns[0]?.id ?? "");
  const [targets, setTargets] = useState<Target[] | null>(null);
  const [loadingTargets, setLoadingTargets] = useState(false);

  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [withSMS, setWithSMS] = useState(false);

  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ emailsSent: number; smsSent: number } | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!campaignId) return;
    setTargets(null);
    setResult(null);
    setLoadingTargets(true);

    fetch(`/api/admin/comunicaciones?campaignId=${campaignId}`)
      .then((r) => r.json())
      .then((json) => setTargets(json.data ?? []))
      .catch(() => setTargets([]))
      .finally(() => setLoadingTargets(false));
  }, [campaignId]);

  const smsCount = targets?.filter((t) => t.phone).length ?? 0;

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!targets || targets.length === 0) return;
    setError("");
    setResult(null);
    setSending(true);

    const res = await fetch("/api/admin/comunicaciones", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ campaignId, subject, body, sendSMS: withSMS }),
    });

    const json = await res.json();
    setSending(false);

    if (!res.ok) { setError(json.error ?? "Error al enviar"); return; }
    setResult(json.data);
    setSubject("");
    setBody("");
  }

  return (
    <div className="space-y-6">
      {/* Selección de campaña */}
      <div className="space-y-1">
        <label className="text-sm font-medium text-gray-700">Campaña de referencia</label>
        <select
          value={campaignId}
          onChange={(e) => setCampaignId(e.target.value)}
          className="input-base"
        >
          {campaigns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <p className="text-xs text-gray-500">
          Se envía a usuarios que <strong>no</strong> tienen un pago aprobado en esta campaña.
        </p>
      </div>

      {/* Lista de destinatarios */}
      {loadingTargets && <p className="text-sm text-gray-500">Cargando destinatarios…</p>}

      {targets !== null && (
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-gray-700">
              {targets.length === 0
                ? "✓ Todos los usuarios tienen pago aprobado"
                : `${targets.length} destinatario${targets.length !== 1 ? "s" : ""} sin pago aprobado`}
            </p>
            {withSMS && smsCount > 0 && (
              <span className="text-xs text-gray-500">📱 {smsCount} con teléfono</span>
            )}
          </div>

          {targets.length > 0 && (
            <div className="max-h-48 overflow-y-auto space-y-1">
              {targets.map((t) => (
                <div key={t.id} className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-white text-sm">
                  <div>
                    <span className="font-medium text-gray-800">{t.name}</span>
                    <span className="text-gray-400 ml-2 text-xs">{t.email}</span>
                  </div>
                  {t.phone && <span className="text-xs text-gray-400">{t.phone}</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Formulario de mensaje */}
      {targets !== null && targets.length > 0 && (
        <form onSubmit={handleSend} className="space-y-4">
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
          )}
          {result && (
            <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
              ✓ Enviado: <strong>{result.emailsSent}</strong> correos
              {result.smsSent > 0 && <> · <strong>{result.smsSent}</strong> SMS</>}
            </div>
          )}

          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Asunto del correo *</label>
            <input
              type="text"
              required
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Ej: Recuerda reportar tu pago"
              className="input-base"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Cuerpo del mensaje *</label>
            <textarea
              required
              rows={6}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Escribe el mensaje que recibirán los usuarios..."
              className="input-base resize-none"
            />
            <p className="text-xs text-gray-400">{body.length}/2000 caracteres</p>
          </div>

          {smsCount > 0 && (
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={withSMS}
                onChange={(e) => setWithSMS(e.target.checked)}
                className="rounded border-gray-300"
              />
              <span className="text-sm text-gray-700">
                Enviar también SMS a los {smsCount} usuarios con teléfono registrado
              </span>
            </label>
          )}

          <div className="flex items-center gap-3">
            <Button type="submit" loading={sending} className="flex-1">
              Enviar a {targets.length} usuario{targets.length !== 1 ? "s" : ""}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
