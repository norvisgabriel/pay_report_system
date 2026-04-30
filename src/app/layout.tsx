import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: {
    default: process.env.NEXT_PUBLIC_APP_NAME ?? "Payment Report",
    template: `%s | ${process.env.NEXT_PUBLIC_APP_NAME ?? "Payment Report"}`,
  },
  description: "Sistema de reporte y validación de pagos",
  viewport: "width=device-width, initial-scale=1",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="h-full bg-gray-50">
      <body className="h-full">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
