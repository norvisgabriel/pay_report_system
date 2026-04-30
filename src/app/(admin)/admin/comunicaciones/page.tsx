export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { ComunicacionesForm } from "@/components/admin/comunicaciones-form";

export const metadata: Metadata = { title: "Comunicaciones" };

export default async function AdminComunicacionesPage() {
  const campaigns = await prisma.campaign.findMany({
    orderBy: { startDate: "desc" },
    select: { id: true, name: true },
  });

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Comunicaciones Masivas</h1>
        <p className="text-sm text-gray-500 mt-1">
          Envía correos (y SMS opcional) a usuarios sin pago aprobado en una campaña.
        </p>
      </div>

      {campaigns.length === 0 ? (
        <div className="card p-8 text-center text-sm text-gray-500">
          No hay campañas registradas.
        </div>
      ) : (
        <div className="card p-6">
          <ComunicacionesForm campaigns={campaigns} />
        </div>
      )}
    </div>
  );
}
