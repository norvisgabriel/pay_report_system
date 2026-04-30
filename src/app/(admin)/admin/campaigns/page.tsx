import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { CampaignManager } from "@/components/admin/campaign-manager";

export const metadata: Metadata = { title: "Campañas" };

export default async function AdminCampaignsPage() {
  const campaigns = await prisma.campaign.findMany({
    orderBy: { startDate: "desc" },
    include: { _count: { select: { payments: true } } },
  });

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <h1 className="text-xl font-bold text-gray-900">Campañas</h1>
      <CampaignManager initialCampaigns={campaigns.map((c) => ({
        ...c,
        price: Number(c.price),
        startDate: c.startDate.toISOString(),
        endDate: c.endDate.toISOString(),
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
        paymentCount: c._count.payments,
      }))} />
    </div>
  );
}
