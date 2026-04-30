"use client";

import { Fragment, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/utils";

const schema = z.object({
  name:        z.string().min(3, "Mínimo 3 caracteres"),
  description: z.string().optional(),
  price:       z.string().min(1, "El precio es requerido"),
  currency:    z.string().length(3),
  startDate:   z.string().min(1, "Fecha de inicio requerida"),
  endDate:     z.string().min(1, "Fecha de fin requerida"),
  isActive:    z.boolean().default(false),
});

type FormData = z.infer<typeof schema>;

interface Campaign {
  id:           string;
  name:         string;
  slug:         string;
  description:  string | null;
  price:        string | number;
  currency:     string;
  startDate:    string;
  endDate:      string;
  isActive:     boolean;
  paymentCount: number;
}

const CURRENCIES = ["USD", "EUR", "GBP", "VES", "COP", "MXN", "BRL"];

function toDateInput(iso: string) {
  return iso.slice(0, 10);
}

export function CampaignManager({ initialCampaigns }: { initialCampaigns: Campaign[] }) {
  const router = useRouter();
  const [campaigns, setCampaigns]   = useState(initialCampaigns);
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId]   = useState<string | null>(null);
  const [globalError, setGlobalError] = useState("");

  // ── Create form ────────────────────────────────────────────────────────────
  const createForm = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { currency: "USD", isActive: false },
  });

  async function onCreate(data: FormData) {
    setGlobalError("");
    const res = await fetch("/api/campaigns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: data.name, description: data.description,
        price: parseFloat(data.price), currency: data.currency,
        startDate: new Date(data.startDate).toISOString(),
        endDate:   new Date(data.endDate).toISOString(),
        isActive:  data.isActive,
      }),
    });
    const json = await res.json();
    if (!res.ok) { setGlobalError(json.error ?? "Error al crear la campaña"); return; }

    setCampaigns((prev) => {
      const updated = json.data.isActive ? prev.map((c) => ({ ...c, isActive: false })) : prev;
      return [{ ...json.data, price: json.data.price, paymentCount: 0 }, ...updated];
    });
    createForm.reset({ currency: "USD", isActive: false });
    setShowCreate(false);
    router.refresh();
  }

  // ── Edit form ──────────────────────────────────────────────────────────────
  const editForm = useForm<FormData>({ resolver: zodResolver(schema) });
  const [editError, setEditError] = useState("");

  function openEdit(c: Campaign) {
    setEditingId(c.id);
    setEditError("");
    editForm.reset({
      name:        c.name,
      description: c.description ?? "",
      price:       String(Number(c.price)),
      currency:    c.currency,
      startDate:   toDateInput(c.startDate),
      endDate:     toDateInput(c.endDate),
      isActive:    c.isActive,
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setEditError("");
  }

  async function onEdit(data: FormData) {
    if (!editingId) return;
    setEditError("");
    const res = await fetch(`/api/campaigns/${editingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: data.name, description: data.description,
        price: parseFloat(data.price), currency: data.currency,
        startDate: new Date(data.startDate).toISOString(),
        endDate:   new Date(data.endDate).toISOString(),
        isActive:  data.isActive,
      }),
    });
    const json = await res.json();
    if (!res.ok) { setEditError(json.error ?? "Error al actualizar"); return; }

    setCampaigns((prev) =>
      prev.map((c) => {
        if (json.data.isActive && c.id !== editingId) return { ...c, isActive: false };
        if (c.id !== editingId) return c;
        return { ...c, ...json.data, price: Number(json.data.price) };
      })
    );
    setEditingId(null);
    router.refresh();
  }

  // ── Toggle active ──────────────────────────────────────────────────────────
  async function toggleActive(id: string, current: boolean) {
    const res = await fetch(`/api/campaigns/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !current }),
    });
    if (res.ok) {
      setCampaigns((prev) =>
        prev.map((c) => ({
          ...c,
          isActive: c.id === id ? !current : !current ? c.isActive : false,
        }))
      );
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          onClick={() => { setShowCreate(!showCreate); setEditingId(null); }}
          variant={showCreate ? "secondary" : "primary"}
        >
          {showCreate ? "Cancelar" : "+ Nueva campaña"}
        </Button>
      </div>

      {/* ── Formulario crear ── */}
      {showCreate && (
        <form onSubmit={createForm.handleSubmit(onCreate)} className="card p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700">Nueva campaña</h2>
          {globalError && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{globalError}</div>
          )}
          <CampaignFields form={createForm} />
          <Button type="submit" loading={createForm.formState.isSubmitting}>Crear campaña</Button>
        </form>
      )}

      {/* ── Tabla ── */}
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nombre</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden sm:table-cell">Precio</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden md:table-cell">Período</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pagos</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {campaigns.length === 0 && (
              <tr><td colSpan={6} className="py-8 text-center text-sm text-gray-500">Sin campañas</td></tr>
            )}
            {campaigns.map((c) => {
              const locked = c.paymentCount > 0;
              const isEditing = editingId === c.id;

              return (
                <Fragment key={c.id}>
                  <tr className={`hover:bg-gray-50 ${isEditing ? "bg-primary-50" : ""}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        {locked && (
                          <svg className="h-3.5 w-3.5 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                          </svg>
                        )}
                        <div>
                          <p className="font-medium text-gray-900">{c.name}</p>
                          <p className="text-xs text-gray-400">{c.slug}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-900 hidden sm:table-cell">
                      {formatCurrency(Number(c.price), c.currency)}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs hidden md:table-cell">
                      {formatDate(c.startDate)} – {formatDate(c.endDate)}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{c.paymentCount}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        c.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
                      }`}>
                        {c.isActive ? "Activa" : "Inactiva"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-3">
                        {locked ? (
                          <span className="text-xs text-gray-400" title={`Bloqueada: ${c.paymentCount} pago(s) registrado(s)`}>
                            🔒 Bloqueada
                          </span>
                        ) : (
                          <button
                            onClick={() => isEditing ? cancelEdit() : openEdit(c)}
                            className="text-xs text-primary-600 hover:text-primary-700 font-medium"
                          >
                            {isEditing ? "Cancelar" : "Editar"}
                          </button>
                        )}
                        <button
                          onClick={() => toggleActive(c.id, c.isActive)}
                          className="text-xs text-gray-500 hover:text-gray-700 font-medium"
                        >
                          {c.isActive ? "Desactivar" : "Activar"}
                        </button>
                      </div>
                    </td>
                  </tr>

                  {/* ── Formulario edición inline ── */}
                  {isEditing && (
                    <tr>
                      <td colSpan={6} className="px-4 py-4 bg-primary-50 border-b border-primary-100">
                        <form onSubmit={editForm.handleSubmit(onEdit)} className="space-y-4">
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-sm font-semibold text-primary-700">Editar campaña</p>
                            <p className="text-xs text-gray-400">Sin pagos registrados — edición permitida</p>
                          </div>
                          {editError && (
                            <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{editError}</div>
                          )}
                          <CampaignFields form={editForm} />
                          <div className="flex gap-2">
                            <Button type="submit" loading={editForm.formState.isSubmitting}>
                              Guardar cambios
                            </Button>
                            <Button type="button" variant="secondary" onClick={cancelEdit}>
                              Cancelar
                            </Button>
                          </div>
                        </form>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── Leyenda ── */}
      <p className="text-xs text-gray-400 text-right">
        🔒 Las campañas con pagos registrados no pueden editarse para mantener la integridad de los datos.
      </p>
    </div>
  );
}

// ── Campos reutilizables ───────────────────────────────────────────────────
function CampaignFields({ form }: { form: ReturnType<typeof useForm<FormData>> }) {
  const { register, formState: { errors } } = form;
  return (
    <>
      <Input
        label="Nombre de la campaña"
        required
        placeholder="Ej: Año Escolar 2026-2027"
        {...register("name")}
        error={errors.name?.message}
      />
      <Input label="Descripción (opcional)" {...register("description")} />
      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Precio"
          type="number"
          step="0.01"
          min="0.01"
          required
          placeholder="100.00"
          hint="Monto esperado por representante"
          {...register("price")}
          error={errors.price?.message}
        />
        <Select
          label="Moneda"
          required
          options={CURRENCIES.map((c) => ({ value: c, label: c }))}
          {...register("currency")}
          error={errors.currency?.message}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Input label="Fecha de inicio" type="date" required {...register("startDate")} error={errors.startDate?.message} />
        <Input label="Fecha de fin"    type="date" required {...register("endDate")}   error={errors.endDate?.message} />
      </div>
      <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
        <input type="checkbox" {...register("isActive")} className="rounded" />
        Establecer como campaña activa (desactiva la actual)
      </label>
    </>
  );
}
