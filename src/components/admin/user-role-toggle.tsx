"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  userId:      string;
  currentRole: string;
  isSelf:      boolean;
}

export function UserRoleToggle({ userId, currentRole, isSelf }: Props) {
  const router = useRouter();
  const [role, setRole]       = useState(currentRole);
  const [loading, setLoading] = useState(false);
  const [confirm, setConfirm] = useState(false);

  const isAdmin = role === "ADMIN";

  async function applyChange() {
    const next = isAdmin ? "USER" : "ADMIN";
    setLoading(true);
    setConfirm(false);

    const res = await fetch(`/api/admin/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: next }),
    });

    setLoading(false);
    if (res.ok) {
      setRole(next);
      router.refresh();
    }
  }

  /* Propio admin — no puede cambiar su propio rol */
  if (isSelf) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-primary-100 text-primary-700 px-2.5 py-0.5 text-xs font-medium">
        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M5 3l14 9-14 9V3z" />
        </svg>
        Administrador (tú)
      </span>
    );
  }

  /* Confirmación inline */
  if (confirm) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-500">
          {isAdmin ? "¿Quitar acceso admin?" : "¿Dar acceso admin?"}
        </span>
        <button
          onClick={applyChange}
          disabled={loading}
          className={`text-xs font-medium px-2 py-0.5 rounded ${
            isAdmin
              ? "bg-red-100 text-red-700 hover:bg-red-200"
              : "bg-green-100 text-green-700 hover:bg-green-200"
          } disabled:opacity-50`}
        >
          {loading ? "..." : "Confirmar"}
        </button>
        <button
          onClick={() => setConfirm(false)}
          className="text-xs text-gray-400 hover:text-gray-600"
        >
          Cancelar
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {/* Badge de rol actual */}
      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
        isAdmin ? "bg-primary-100 text-primary-700" : "bg-gray-100 text-gray-600"
      }`}>
        {isAdmin ? "Administrador" : "Usuario"}
      </span>

      {/* Botón de acción */}
      <button
        onClick={() => setConfirm(true)}
        className={`text-xs font-medium underline-offset-2 hover:underline ${
          isAdmin ? "text-red-500 hover:text-red-700" : "text-primary-600 hover:text-primary-800"
        }`}
      >
        {isAdmin ? "Quitar admin" : "Hacer admin"}
      </button>
    </div>
  );
}
