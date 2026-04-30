import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const patchSchema = z.object({
  isActive:    z.boolean().optional(),
  name:        z.string().min(3).optional(),
  description: z.string().optional(),
  price:       z.number().positive().optional(),
  currency:    z.string().length(3).optional(),
  startDate:   z.string().datetime().optional(),
  endDate:     z.string().datetime().optional(),
});

const LOCKED_FIELDS = ["name", "description", "price", "currency", "startDate", "endDate"] as const;

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const data = patchSchema.parse(body);

    // Check if any locked fields are being modified
    const wantsToEditCore = LOCKED_FIELDS.some((f) => f in data && data[f] !== undefined);

    if (wantsToEditCore) {
      const paymentCount = await prisma.payment.count({ where: { campaignId: params.id } });
      if (paymentCount > 0) {
        return NextResponse.json(
          { error: `Esta campaña tiene ${paymentCount} pago(s) registrado(s) y no puede modificarse. Solo puedes activarla o desactivarla.` },
          { status: 409 }
        );
      }
    }

    const campaign = await prisma.$transaction(async (tx) => {
      if (data.isActive === true) {
        await tx.campaign.updateMany({
          where: { isActive: true, id: { not: params.id } },
          data: { isActive: false },
        });
      }

      return tx.campaign.update({
        where: { id: params.id },
        data: {
          ...data,
          ...(data.startDate ? { startDate: new Date(data.startDate) } : {}),
          ...(data.endDate   ? { endDate:   new Date(data.endDate)   } : {}),
        },
      });
    });

    return NextResponse.json({ data: campaign });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
