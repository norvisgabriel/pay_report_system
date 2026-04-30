import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const adminPass = await bcrypt.hash("admin123456", 12);
  const admin = await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: {},
    create: {
      name: "Admin User",
      email: "admin@example.com",
      password: adminPass,
      role: "ADMIN",
    },
  });

  const userPass = await bcrypt.hash("user123456", 12);
  const user = await prisma.user.upsert({
    where: { email: "user@example.com" },
    update: {},
    create: {
      name: "Test User",
      email: "user@example.com",
      password: userPass,
      role: "USER",
    },
  });

  const campaign = await prisma.campaign.upsert({
    where: { slug: "school-year-2026-2027" },
    update: {},
    create: {
      name: "School Year 2026-2027",
      slug: "school-year-2026-2027",
      description: "Payment collection for the 2026-2027 school year",
      price: 150.00,
      currency: "USD",
      startDate: new Date("2026-09-01"),
      endDate: new Date("2027-06-30"),
      isActive: true,
    },
  });

  // Seed today's exchange rate (normally from cron)
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  await prisma.exchangeRate.upsert({
    where: {
      fromCurrency_toCurrency_effectiveDate: {
        fromCurrency: "USD",
        toCurrency: "VES",
        effectiveDate: today,
      },
    },
    update: {},
    create: {
      fromCurrency: "USD",
      toCurrency: "VES",
      rate: 487.12,
      effectiveDate: today,
      source: "manual",
    },
  });

  console.log("Seeded:", {
    admin: admin.email,
    user: user.email,
    campaign: `${campaign.name} ($${campaign.price} USD)`,
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
