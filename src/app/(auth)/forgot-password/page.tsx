import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export const metadata: Metadata = { title: "Recuperar contraseña" };

export default function ForgotPasswordPage() {
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
                d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">
            {process.env.NEXT_PUBLIC_APP_NAME ?? "Payment Report"}
          </h1>
          <p className="mt-1 text-sm text-indigo-200">Recupera el acceso a tu cuenta</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/95 p-6 shadow-2xl backdrop-blur-sm">
          <ForgotPasswordForm />
        </div>

        <p className="text-center text-xs text-indigo-300/60">
          © {new Date().getFullYear()} {process.env.NEXT_PUBLIC_APP_NAME ?? "Payment Report"} · Todos los derechos reservados
        </p>
      </div>
    </main>
  );
}
