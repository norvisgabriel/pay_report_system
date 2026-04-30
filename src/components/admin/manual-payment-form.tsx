"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const BANCOS_VE = [
  "Banco de Venezuela", "Banesco", "Mercantil", "BBVA Provincial",
  "Banco Bicentenario", "BNC", "Bancaribe", "Banco Exterior",
  "Banco Activo", "Bancamiga", "Otro",
];

const METODOS = [
  { value: "efectivo", label: "💵 Efectivo en Caja" },
  { value: "transferencia", label: "🏦 Transferencia Bancaria" },
  { value: "pago_movil", label: "📱 Pago Móvil" },
];

interface Campaign {
  id: string;
  name: string;
  price: number;
}

interface ExistingUser {
  id: string;
  name: string;
  email: string;
  phone: string | null;
}

interface Props {
  campaign: Campaign;
  exchangeRate: number | null;
}

export function ManualPaymentForm({ campaign, exchangeRate }: Props) {
  const router = useRouter();

  // Estado del usuario
  const [email, setEmail] = useState("");
  const [lookingUp, setLookingUp] = useState(false);
  const [foundUser, setFoundUser] = useState<ExistingUser | null | "not_found">(null);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");

  // Estado del pago
  const [method, setMethod] = useState("");
  const [bankName, setBankName] = useState("");
  const [reference, setReference] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");

  // Comprobante
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  // Estado de envío
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const vesAmount = exchangeRate ? (campaign.price * exchangeRate).toFixed(2) : null;

  async function lookupUser() {
    if (!email.trim()) return;
    setLookingUp(true);
    setFoundUser(null);
    const res = await fetch(`/api/admin/users/lookup?email=${encodeURIComponent(email.trim())}`);
    const json = await res.json();
    setLookingUp(false);
    setFoundUser(json.data ?? "not_found");
    if (json.data) {
      setNewName(json.data.name);
      setNewPhone(json.data.phone ?? "");
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    if (f.type.startsWith("image/")) setPreview(URL.createObjectURL(f));
    else setPreview(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!foundUser) { setError("Busca primero el usuario por correo"); return; }
    if (!method) { setError("Selecciona un método de pago"); return; }

    const needsImage = method === "transferencia" || method === "pago_movil";
    if (method === "transferencia" && !reference.trim()) { setError("La referencia es requerida"); return; }
    if ((method === "transferencia" || method === "pago_movil") && !bankName) { setError("Selecciona el banco"); return; }
    if (method === "pago_movil" && !phoneNumber.trim()) { setError("El teléfono es requerido"); return; }

    let imageUrl: string | undefined;
    let imagePublicId: string | undefined;

    if (file) {
      const formData = new FormData();
      formData.append("file", file);
      const uploadRes = await fetch("/api/upload", { method: "POST", body: formData });
      const uploadJson = await uploadRes.json();
      if (!uploadRes.ok) { setError(uploadJson.error ?? "Error al subir comprobante"); return; }
      imageUrl = uploadJson.data.url;
      imagePublicId = uploadJson.data.publicId;
    }

    setSubmitting(true);

    const payload: Record<string, unknown> = {
      email: email.trim(),
      campaignId: campaign.id,
      method,
      paymentDate: new Date(paymentDate).toISOString(),
      notes: notes || undefined,
      imageUrl,
      imagePublicId,
      exchangeRate: exchangeRate ?? undefined,
      localAmount: vesAmount ? parseFloat(vesAmount) : undefined,
    };

    if (foundUser === "not_found") {
      if (!newName.trim()) { setError("El nombre es requerido para el nuevo usuario"); setSubmitting(false); return; }
      payload.name = newName.trim();
      payload.phone = newPhone.trim() || undefined;
    }

    if (method === "transferencia") {
      payload.bankName = bankName;
      payload.reference = reference.trim();
    }
    if (method === "pago_movil") {
      payload.bankName = bankName;
      payload.phoneNumber = phoneNumber.trim();
    }

    const res = await fetch("/api/admin/payments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const json = await res.json();
    setSubmitting(false);

    if (!res.ok) { setError(json.error ?? "Error al registrar pago"); return; }

    router.push(`/admin/payments/${json.data.id}`);
    router.refresh();
  }

  const today = new Date().toISOString().slice(0, 10);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Resumen campaña */}
      <div className="rounded-xl bg-primary-50 border border-primary-200 p-4">
        <p className="text-xs font-medium text-primary-600 uppercase tracking-wide mb-1">
          Campaña — {campaign.name}
        </p>
        <p className="text-2xl font-bold text-primary-900">${campaign.price.toFixed(2)} USD</p>
        {vesAmount && exchangeRate && (
          <p className="text-sm text-primary-700 mt-0.5">
            = Bs. {parseFloat(vesAmount).toLocaleString("es-VE", { minimumFractionDigits: 2 })}
            <span className="text-xs text-primary-500 ml-2">(1 USD = Bs. {exchangeRate.toLocaleString("es-VE")})</span>
          </p>
        )}
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {/* Búsqueda de usuario */}
      <div className="space-y-3">
        <p className="text-sm font-semibold text-gray-700">1. Identificar participante</p>
        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <Input
              label="Correo electrónico"
              type="email"
              required
              value={email}
              onChange={(e) => { setEmail(e.target.value); setFoundUser(null); }}
              placeholder="correo@ejemplo.com"
            />
          </div>
          <Button type="button" variant="secondary" loading={lookingUp} onClick={lookupUser} className="shrink-0">
            Buscar
          </Button>
        </div>

        {foundUser === "not_found" && (
          <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 space-y-3">
            <p className="text-sm font-medium text-yellow-800">Usuario no encontrado — se creará una cuenta nueva</p>
            <Input
              label="Nombre completo *"
              required
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Nombre del participante"
            />
            <Input
              label="Teléfono (opcional)"
              type="tel"
              value={newPhone}
              onChange={(e) => setNewPhone(e.target.value)}
              placeholder="0414-1234567"
            />
          </div>
        )}

        {foundUser && foundUser !== "not_found" && (
          <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
            ✓ Usuario encontrado: <strong>{foundUser.name}</strong>
            {foundUser.phone && <span className="text-green-600 ml-2">· {foundUser.phone}</span>}
          </div>
        )}
      </div>

      {/* Método de pago */}
      <div className="space-y-2">
        <p className="text-sm font-semibold text-gray-700">2. Método de pago</p>
        <div className="grid gap-2 sm:grid-cols-3">
          {METODOS.map((m) => (
            <label
              key={m.value}
              className={`flex items-center gap-2 rounded-xl border-2 p-3 cursor-pointer transition-colors ${
                method === m.value
                  ? "border-primary-500 bg-primary-50"
                  : "border-gray-200 hover:border-primary-300"
              }`}
            >
              <input type="radio" name="method" value={m.value} onChange={(e) => setMethod(e.target.value)} className="sr-only" />
              <span className="text-sm font-medium text-gray-900">{m.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Campos por método */}
      {method === "transferencia" && (
        <div className="space-y-3 rounded-xl border border-gray-200 p-4 bg-gray-50">
          <p className="text-sm font-semibold text-gray-700">Datos de la transferencia</p>
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Banco emisor *</label>
            <select value={bankName} onChange={(e) => setBankName(e.target.value)} className="input-base">
              <option value="">Selecciona el banco</option>
              {BANCOS_VE.map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
          <Input
            label="Número de referencia *"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            placeholder="Ej: 00123456789"
          />
        </div>
      )}

      {method === "pago_movil" && (
        <div className="space-y-3 rounded-xl border border-gray-200 p-4 bg-gray-50">
          <p className="text-sm font-semibold text-gray-700">Datos del Pago Móvil</p>
          <Input
            label="Teléfono asociado *"
            type="tel"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            placeholder="0414-1234567"
          />
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Banco *</label>
            <select value={bankName} onChange={(e) => setBankName(e.target.value)} className="input-base">
              <option value="">Selecciona el banco</option>
              {BANCOS_VE.map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
        </div>
      )}

      {/* Fecha */}
      <div className="space-y-1">
        <label className="text-sm font-medium text-gray-700">Fecha del pago *</label>
        <input
          type="date"
          max={today}
          value={paymentDate}
          onChange={(e) => setPaymentDate(e.target.value)}
          className="input-base"
          required
        />
      </div>

      {/* Comprobante */}
      {method && (
        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700">
            Comprobante{method === "efectivo" ? " (opcional)" : " (opcional para cobro manual)"}
          </label>
          <div className="rounded-xl border-2 border-dashed border-gray-300 p-4 text-center hover:border-primary-400 transition-colors">
            <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFileChange} className="hidden" id="comprobante-admin" />
            <label htmlFor="comprobante-admin" className="cursor-pointer">
              {preview ? (
                <div className="relative mx-auto h-40 w-full max-w-sm">
                  <Image src={preview} alt="Vista previa" fill className="object-contain rounded-lg" />
                </div>
              ) : (
                <div className="py-4">
                  <p className="text-sm text-gray-500"><span className="font-medium text-primary-600">Haz clic para subir</span> o arrastra</p>
                  <p className="text-xs text-gray-400">PNG, JPG o WebP</p>
                </div>
              )}
            </label>
          </div>
          {file && <p className="text-xs text-gray-500">📎 {file.name}</p>}
        </div>
      )}

      {/* Observaciones */}
      <div className="space-y-1">
        <label className="block text-sm font-medium text-gray-700">Observaciones (opcional)</label>
        <textarea
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Notas sobre este cobro manual..."
          className="input-base resize-none"
        />
      </div>

      <Button type="submit" loading={submitting} className="w-full" disabled={!foundUser || !method}>
        Registrar Cobro Manual
      </Button>
    </form>
  );
}
