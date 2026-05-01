"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const schema = z
  .object({
    password: z.string().min(8, "Mínimo 8 caracteres"),
    confirm: z.string().min(1, "Confirma tu contraseña"),
  })
  .refine((d) => d.password === d.confirm, {
    path: ["confirm"],
    message: "Las contraseñas no coinciden",
  });

type FormData = z.infer<typeof schema>;

export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  async function onSubmit(data: FormData) {
    setError("");
    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password: data.password }),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error ?? "Error al restablecer la contraseña");
      return;
    }
    setDone(true);
    setTimeout(() => router.push("/login"), 3000);
  }

  if (done) {
    return (
      <div className="space-y-4 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
          <svg className="h-7 w-7 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <div>
          <p className="font-semibold text-gray-900">¡Contraseña actualizada!</p>
          <p className="mt-1 text-sm text-gray-500">
            Tu contraseña fue cambiada exitosamente. Serás redirigido al inicio de sesión en unos segundos.
          </p>
        </div>
        <Link href="/login" className="block text-sm font-medium text-indigo-600 hover:text-indigo-700">
          Ir al inicio de sesión
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-semibold text-gray-900">Nueva contraseña</p>
        <p className="mt-1 text-sm text-gray-500">Elige una contraseña segura de al menos 8 caracteres.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {error}
            {error.includes("expirado") && (
              <span>
                {" "}
                <Link href="/forgot-password" className="font-medium underline">
                  Solicitar nuevo enlace
                </Link>
              </span>
            )}
          </div>
        )}

        <Input
          label="Nueva contraseña"
          type="password"
          autoComplete="new-password"
          required
          {...register("password")}
          error={errors.password?.message}
        />

        <Input
          label="Confirmar contraseña"
          type="password"
          autoComplete="new-password"
          required
          {...register("confirm")}
          error={errors.confirm?.message}
        />

        <Button type="submit" loading={isSubmitting} className="w-full">
          {isSubmitting ? "Guardando..." : "Cambiar contraseña"}
        </Button>
      </form>
    </div>
  );
}
