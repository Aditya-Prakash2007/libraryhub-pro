// Vercel Cron Job — runs daily at midnight IST (18:30 UTC previous day)
// vercel.json: { "crons": [{ "path": "/api/cron/reminders", "schedule": "30 18 * * *" }] }
import { NextRequest, NextResponse } from "next/server";
import { sendSubscriptionReminders, sendStudentFeeReminders } from "@/actions/subscription-reminders";
import { archiveAndDeleteExpenses } from "@/actions/workers";
import { cleanOldAttendanceRecords } from "@/actions/attendance";

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  // Protect with secret header (set CRON_SECRET in .env)
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const [subResult, feeResult, expenseResult, attendanceCleanup] = await Promise.all([
      sendSubscriptionReminders(),
      sendStudentFeeReminders(),
      archiveAndDeleteExpenses(),
      cleanOldAttendanceRecords(),
    ]);

    return NextResponse.json({
      success: true,
      subscriptionEmailsSent: subResult.emailsSent,
      expiredTrials: subResult.expiredTrials,
      expiredSubs: subResult.expiredSubs,
      feeReminders: {
        studentsProcessed: feeResult.sent,
        emailsSent: feeResult.emailSent,
        whatsappSent: feeResult.whatsappSent,
      },
      workerExpensesArchived: "archivedCount" in expenseResult ? expenseResult.archivedCount : 0,
      workerExpensesDeleted: "deletedCount" in expenseResult ? expenseResult.deletedCount : 0,
      attendanceRecordsDeleted: "deletedCount" in attendanceCleanup ? attendanceCleanup.deletedCount : 0,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Cron job error:", error);
    return NextResponse.json({ error: "Cron job failed" }, { status: 500 });
  }
}
