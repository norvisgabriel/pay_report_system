"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const schema = z
  .object({
    name: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
    currentPassword: z.string().optional(),
    newPassword: z.string().optional(),
    confirmPassword: z.string().optional(),
  })
  .refine((d) => !d.newPassword || d.newPassword.length >= 8, {
    message: "La contraseña debe tener al menos 8 caracteres",
    path: ["newPassword"],
  })
  .refine((d) => !d.newPassword || d.newPassword === d.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  })
  .refine((d) => !d.newPassword || !!d.currentPassword, {
    message: "La contraseña actual es requerida",
    path: ["currentPassword"],
  });

type FormData = z.infer<typeof schema>;

export function ProfileForm({ name }: { name: string }) {
  const { update } = useSession();
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { name },
  });

  async function onSubmit(data: FormData) {
    setError("");
    setSuccess("");

    const payload: Record<string, string> = { name: data.name };
    if (data.newPassword) {
      payload.currentPassword = data.currentPassword!;
      payload.newPassword = data.newPassword;
    }

    const res = await fetch("/api/user/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const json = await res.json();
    if (!res.ok) {
      setError(json.error ?? "Error al actualizar perfil");
      return;
    }

    await update({ name: json.data.name });
    setSuccess("Perfil actualizado correctamente");
    reset({ name: json.data.name, currentPassword: "", newPassword: "", confirmPassword: "" });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {success && (
        <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
          {success}
        </div>
      )}
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <Input
        label="Nombre completo"
        required
        {...register("name")}
        error={errors.name?.message}
      />

      <div className="pt-2 border-t border-gray-100">
        <p className="text-sm font-medium text-gray-700 mb-3">Cambiar contraseña</p>
        <div className="space-y-3">
          <Input
            label="Contraseña actual"
            type="password"
            autoComplete="current-password"
            {...register("currentPassword")}
            error={errors.currentPassword?.message}
          />
          <Input
            label="Nueva contraseña"
            type="password"
            autoComplete="new-password"
            {...register("newPassword")}
            error={errors.newPassword?.message}
          />
          <Input
            label="Confirmar nueva contraseña"
            type="password"
            autoComplete="new-password"
            {...register("confirmPassword")}
            error={errors.confirmPassword?.message}
          />
        </div>
      </div>

      <Button type="submit" loading={isSubmitting} className="w-full">
        Guardar cambios
      </Button>
    </form>
  );
}
