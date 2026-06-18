// Vercel Cron Job — runs daily at 8 AM IST
// vercel.json: { "crons": [{ "path": "/api/cron/reminders", "schedule": "30 2 * * *" }] }
import { NextRequest, NextResponse } from "next/server";
import { sendSubscriptionReminders, sendStudentFeeReminders } from "@/actions/subscription-reminders";

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  // Protect with secret header
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const [subResult, feeResult] = await Promise.all([
      sendSubscriptionReminders(),
      sendStudentFeeReminders(),
    ]);

    return NextResponse.json({
      success: true,
      subscriptionEmails: subResult.emailsSent,
      expiredTrials: subResult.expiredTrials,
      expiredSubs: subResult.expiredSubs,
      feeRemindersSent: feeResult.sent,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Cron job error:", error);
    return NextResponse.json({ error: "Cron job failed" }, { status: 500 });
  }
}
