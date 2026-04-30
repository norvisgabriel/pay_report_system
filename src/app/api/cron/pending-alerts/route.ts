export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendPendingAlertsEmail, sendDailySummaryEmail } from "@/lib/resend";

function isAuthorized(req: NextRequest) {
  const auth = req.headers.get("authorization");
  return auth === `Bearer ${process.env.CRON_SECRET}`;
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const cutoff48h = new Date(Date.now() - 48 * 60 * 60 * 1000);
    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);

    const [stalePending, admins, todayApproved, todayRejected, totalPending] = await Promise.all([
      // Payments pending for more than 48h
      prisma.payment.findMany({
        where: { status: "PENDING", createdAt: { lte: cutoff48h } },
        include: { user: { select: { name: true } } },
        orderBy: { createdAt: "asc" },
      }),
      // All admins
      prisma.user.findMany({
        where: { role: "ADMIN" },
        select: { name: true, email: true },
      }),
      // Approved today
      prisma.payment.count({
        where: { status: "APPROVED", approvedAt: { gte: todayStart } },
      }),
      // Rejected today
      prisma.payment.count({
        where: { status: "REJECTED", approvedAt: { gte: todayStart } },
      }),
      // All pending
      prisma.payment.count({ where: { status: "PENDING" } }),
    ]);

    if (admins.length === 0) {
      return NextResponse.json({ message: "No admins found", sent: 0 });
    }

    const now = Date.now();
    const pendingList = stalePending.map((p) => ({
      userName: p.user.name,
      reference: p.reference ?? undefined,
      hoursOld: Math.floor((now - p.createdAt.getTime()) / (60 * 60 * 1000)),
    }));

    let alertsSent = 0;

    for (const admin of admins) {
      // Send 48h alert only if there are stale payments
      if (pendingList.length > 0) {
        await sendPendingAlertsEmail(admin.email, admin.name, pendingList).catch(console.error);
        alertsSent++;
      }

      // Always send daily summary
      await sendDailySummaryEmail(admin.email, admin.name, {
        pending: totalPending,
        approved: todayApproved,
        rejected: todayRejected,
      }).catch(console.error);
    }

    console.log(`[CRON] Pending alerts: ${stalePending.length} stale, ${alertsSent} emails sent`);
    return NextResponse.json({
      stalePending: stalePending.length,
      alertsSent,
      summary: { pending: totalPending, approved: todayApproved, rejected: todayRejected },
    });
  } catch (err) {
    console.error("[CRON pending-alerts]", err);
    return NextResponse.json({ error: "Failed to send alerts" }, { status: 500 });
  }
}
