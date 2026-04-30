"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { useState } from "react";

interface NavbarProps {
  isAdmin?: boolean;
}

export function Navbar({ isAdmin }: NavbarProps) {
  const { data: session } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);

  const adminLinks = [
    { href: "/admin", label: "Resumen" },
    { href: "/admin/payments", label: "Pagos" },
    { href: "/admin/reportes", label: "Reportes" },
    { href: "/admin/campaigns", label: "Campañas" },
    { href: "/admin/exchange-rates", label: "Tasa" },
    { href: "/admin/comunicaciones", label: "Comunicaciones" },
    { href: "/admin/users", label: "Usuarios" },
  ];

  const userLinks = [
    { href: "/dashboard", label: "Inicio" },
    { href: "/payments", label: "Mis Pagos" },
    { href: "/payments/new", label: "Reportar Pago" },
    { href: "/perfil", label: "Mi Perfil" },
  ];

  const links = isAdmin ? adminLinks : userLinks;

  return (
    <header className="sticky top-0 z-40 border-b border-gray-200 bg-white">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-4">
          <Link href={isAdmin ? "/admin" : "/dashboard"} className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary-600">
              <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <span className="font-semibold text-gray-900 hidden sm:block">
              {process.env.NEXT_PUBLIC_APP_NAME ?? "PayReport"}
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-0.5 overflow-x-auto">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="rounded-md px-2.5 py-1.5 text-sm text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors whitespace-nowrap"
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-3">
            <span className="text-sm text-gray-600">{session?.user?.name}</span>
            {isAdmin && (
              <span className="rounded-full bg-primary-100 px-2 py-0.5 text-xs font-medium text-primary-700">
                Admin
              </span>
            )}
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Salir
            </button>
          </div>

          <button
            className="md:hidden rounded-lg p-2 text-gray-500 hover:bg-gray-100"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {menuOpen
                ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              }
            </svg>
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="md:hidden border-t border-gray-200 bg-white px-4 py-3 space-y-1">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setMenuOpen(false)}
              className="block rounded-md px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              {l.label}
            </Link>
          ))}
          <div className="pt-3 border-t border-gray-100">
            <p className="text-sm font-medium text-gray-900">{session?.user?.name}</p>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="mt-1 text-sm text-gray-500 hover:text-gray-700"
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
