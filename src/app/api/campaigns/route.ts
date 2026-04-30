import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/utils";

const createSchema = z.object({
  name: z.string().min(3).max(100),
  description: z.string().optional(),
  price: z.number().positive(),
  currency: z.string().length(3).default("USD"),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  isActive: z.boolean().default(false),
});

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const activeOnly = searchParams.get("active") === "true";

  const campaigns = await prisma.campaign.findMany({
    where: activeOnly ? { isActive: true } : undefined,
    orderBy: { startDate: "desc" },
  });

  return NextResponse.json({ data: campaigns });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const data = createSchema.parse(body);
    const slug = slugify(data.name);

    // Enforce one active campaign at a time
    const campaign = await prisma.$transaction(async (tx) => {
      if (data.isActive) {
        await tx.campaign.updateMany({ where: { isActive: true }, data: { isActive: false } });
      }
      return tx.campaign.create({
        data: {
          name: data.name,
          slug,
          description: data.description,
          price: data.price,
          currency: data.currency,
          startDate: new Date(data.startDate),
          endDate: new Date(data.endDate),
          isActive: data.isActive,
        },
      });
    });

    return NextResponse.json({ data: campaign }, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors[0].message }, { status: 400 });
    }
    console.error("[CAMPAIGNS POST]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
