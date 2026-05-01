"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const schema = z.object({
  email: z.string().email("Ingresa un correo válido"),
});

type FormData = z.infer<typeof schema>;

export function ForgotPasswordForm() {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  async function onSubmit(data: FormData) {
    setError("");
    const res = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: data.email }),
    });
    if (!res.ok) {
      const json = await res.json();
      setError(json.error ?? "Error al enviar el correo");
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <div className="space-y-4 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-indigo-100">
          <svg className="h-7 w-7 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        <div>
          <p className="font-semibold text-gray-900">Revisa tu correo</p>
          <p className="mt-1 text-sm text-gray-500">
            Si existe una cuenta con ese correo, recibirás un enlace para restablecer tu contraseña. El enlace expira en 1 hora.
          </p>
        </div>
        <Link href="/login" className="block text-sm font-medium text-indigo-600 hover:text-indigo-700">
          Volver al inicio de sesión
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-semibold text-gray-900">¿Olvidaste tu contraseña?</p>
        <p className="mt-1 text-sm text-gray-500">
          Ingresa tu correo y te enviaremos un enlace para restablecerla.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <Input
          label="Correo electrónico"
          type="email"
          autoComplete="email"
          required
          {...register("email")}
          error={errors.email?.message}
        />

        <Button type="submit" loading={isSubmitting} className="w-full">
          {isSubmitting ? "Enviando..." : "Enviar enlace de recuperación"}
        </Button>

        <p className="text-center text-sm text-gray-600">
          <Link href="/login" className="font-medium text-indigo-600 hover:text-indigo-700">
            Volver al inicio de sesión
          </Link>
        </p>
      </form>
    </div>
  );
}
