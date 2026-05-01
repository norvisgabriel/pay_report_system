export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export const metadata: Metadata = { title: "Nueva contraseña" };

export default async function ResetPasswordPage({ params }: { params: { token: string } }) {
  const record = await prisma.verificationToken.findUnique({
    where: { token: params.token },
  });

  const isValid = record && record.expires > new Date();

  return (
    <main
      className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-12"
      style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #312e81 100%)" }}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />
      <div className="pointer-events-none absolute -top-32 -left-32 h-96 w-96 rounded-full bg-indigo-600 opacity-20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-primary-600 opacity-20 blur-3xl" />

      <div className="relative w-full max-w-sm space-y-6">
        <div className="text-center">
          <div
            className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl shadow-lg"
            style={{ background: "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)" }}
          >
            <svg className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">
            {process.env.NEXT_PUBLIC_APP_NAME ?? "Payment Report"}
          </h1>
          <p className="mt-1 text-sm text-indigo-200">Crea tu nueva contraseña</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/95 p-6 shadow-2xl backdrop-blur-sm">
          {isValid ? (
            <ResetPasswordForm token={params.token} />
          ) : (
            <div className="space-y-4 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-100">
                <svg className="h-7 w-7 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-gray-900">Enlace inválido o expirado</p>
                <p className="mt-1 text-sm text-gray-500">
                  Este enlace de recuperación ya no es válido. Por favor solicita uno nuevo.
                </p>
              </div>
              <Link
                href="/forgot-password"
                className="block rounded-lg bg-indigo-600 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
              >
                Solicitar nuevo enlace
              </Link>
              <Link href="/login" className="block text-sm text-gray-500 hover:text-gray-700">
                Volver al inicio de sesión
              </Link>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-indigo-300/60">
          © {new Date().getFullYear()} {process.env.NEXT_PUBLIC_APP_NAME ?? "Payment Report"} · Todos los derechos reservados
        </p>
      </div>
    </main>
  );
}
