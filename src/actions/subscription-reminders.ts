"use server";

import { prisma } from "@/lib/prisma";
import {
  sendSubscriptionExpiryReminder,
  sendTrialExpiryEmail,
} from "@/services/brevo";

// Run this daily via cron (e.g. Vercel cron job)
export async function sendSubscriptionReminders() {
  const now = new Date();
  let emailsSent = 0;

  // ─── Subscription expiry reminders (3, 2, 1, 0 days) ──────────────────
  const reminderDays = [3, 2, 1, 0];

  for (const days of reminderDays) {
    const targetStart = new Date(now);
    targetStart.setDate(targetStart.getDate() + days);
    targetStart.setHours(0, 0, 0, 0);

    const targetEnd = new Date(targetStart);
    targetEnd.setHours(23, 59, 59, 999);

    const expiringLibraries = await prisma.library.findMany({
      where: {
        isActive: true,
        approvalStatus: "APPROVED",
        subscription: {
          endDate: { gte: targetStart, lte: targetEnd },
          status: { in: ["ACTIVE"] },
        },
      },
      include: {
        admin: { select: { email: true, name: true } },
        subscription: { select: { endDate: true } },
      },
    });

    for (const lib of expiringLibraries) {
      if (!lib.subscription?.endDate) continue;

      const expiryDateStr = lib.subscription.endDate.toLocaleDateString("en-IN", {
        day: "numeric", month: "long", year: "numeric",
      });

      await sendSubscriptionExpiryReminder(
        lib.admin.email,
        lib.admin.name,
        lib.name,
        days,
        expiryDateStr
      ).catch(() => {});

      emailsSent++;
    }
  }

  // ─── Trial expiry reminders (24h and 6h before) ───────────────────────
  const trialHours = [24, 6];

  for (const hours of trialHours) {
    const targetStart = new Date(now.getTime() + hours * 60 * 60 * 1000 - 30 * 60 * 1000);
    const targetEnd = new Date(now.getTime() + hours * 60 * 60 * 1000 + 30 * 60 * 1000);

    const trialLibraries = await prisma.library.findMany({
      where: {
        isTrialActive: true,
        trialEndsAt: { gte: targetStart, lte: targetEnd },
      },
      include: {
        admin: { select: { email: true, name: true } },
      },
    });

    for (const lib of trialLibraries) {
      await sendTrialExpiryEmail(
        lib.admin.email,
        lib.admin.name,
        lib.name,
        hours
      ).catch(() => {});
      emailsSent++;
    }
  }

  // ─── Mark expired trials ───────────────────────────────────────────────
  const expiredTrials = await prisma.library.findMany({
    where: {
      isTrialActive: true,
      trialEndsAt: { lt: now },
    },
    select: { id: true },
  });

  if (expiredTrials.length > 0) {
    await prisma.library.updateMany({
      where: { id: { in: expiredTrials.map((l) => l.id) } },
      data: { isTrialActive: false, trialExpired: true },
    });
  }

  // ─── Mark expired subscriptions ───────────────────────────────────────
  const expiredSubs = await prisma.subscription.findMany({
    where: {
      status: "ACTIVE",
      endDate: { lt: now },
    },
    select: { id: true },
  });

  if (expiredSubs.length > 0) {
    await prisma.subscription.updateMany({
      where: { id: { in: expiredSubs.map((s) => s.id) } },
      data: { status: "EXPIRED" },
    });
  }

  return { emailsSent, expiredTrials: expiredTrials.length, expiredSubs: expiredSubs.length };
}

// Send fee reminders to students
export async function sendStudentFeeReminders() {
  const { sendFeeReminderEmail } = await import("@/services/brevo");
  const now = new Date();
  let sent = 0;

  // Students with fees due in 7, 3, 1 days or overdue
  const checkDays = [7, 3, 1, 0, -1]; // negative = overdue

  for (const daysAhead of checkDays) {
    const targetDate = new Date(now);
    targetDate.setDate(targetDate.getDate() + daysAhead);

    const students = await prisma.student.findMany({
      where: {
        status: "ACTIVE",
        nextDueDate: {
          gte: new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate()),
          lt: new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate() + 1),
        },
        userId: { not: null },
      },
      include: {
        user: { select: { email: true } },
        library: { select: { name: true } },
      },
    });

    for (const student of students) {
      if (!student.user?.email) continue;

      const dueDateStr = student.nextDueDate
        ? student.nextDueDate.toLocaleDateString("en-IN", { day: "numeric", month: "long" })
        : "Soon";

      await sendFeeReminderEmail(
        student.user.email,
        student.fullName,
        student.library.name,
        daysAhead,
        student.monthlyFee,
        dueDateStr
      ).catch(() => {});

      sent++;
    }
  }

  return { sent };
}
