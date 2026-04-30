"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const schema = z
  .object({
    name: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
    email: z.string().email("Ingresa un correo válido"),
    phone: z.string().optional(),
    password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  });

type FormData = z.infer<typeof schema>;

export function RegisterForm() {
  const router = useRouter();
  const [error, setError] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  async function onSubmit(data: FormData) {
    setError("");
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: data.name,
        email: data.email,
        phone: data.phone,
        password: data.password,
      }),
    });

    const json = await res.json();

    if (!res.ok) {
      setError(json.error ?? "Error al registrarse");
      return;
    }

    await signIn("credentials", {
      email: data.email,
      password: data.password,
      redirect: false,
    });

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <Input label="Nombre completo" required {...register("name")} error={errors.name?.message} />
      <Input
        label="Correo electrónico"
        type="email"
        required
        {...register("email")}
        error={errors.email?.message}
      />
      <Input
        label="Teléfono (opcional)"
        type="tel"
        {...register("phone")}
        error={errors.phone?.message}
      />
      <Input
        label="Contraseña"
        type="password"
        required
        {...register("password")}
        error={errors.password?.message}
      />
      <Input
        label="Confirmar contraseña"
        type="password"
        required
        {...register("confirmPassword")}
        error={errors.confirmPassword?.message}
      />

      <Button type="submit" loading={isSubmitting} className="w-full">
        Crear cuenta
      </Button>

      <p className="text-center text-sm text-gray-600">
        ¿Ya tienes cuenta?{" "}
        <Link href="/login" className="font-medium text-primary-600 hover:text-primary-700">
          Iniciar sesión
        </Link>
      </p>
    </form>
  );
}
