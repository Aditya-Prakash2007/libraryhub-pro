"use server";

import { prisma } from "@/lib/prisma";
import {
  sendSubscriptionExpiryReminder,
  sendTrialExpiryEmail,
} from "@/services/brevo";

// Run this daily via cron (e.g. Vercel cron job at 8 AM IST → 2:30 AM UTC)
// vercel.json: { "crons": [{ "path": "/api/cron/reminders", "schedule": "30 2 * * *" }] }

// ─── Library Subscription Reminders (SaaS platform level) ─────────────────────

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

// ─── Student Fee Reminders (7, 3, 1 days before due date) ─────────────────────
//
// Logic:
//   1. Check students whose nextDueDate falls exactly 7, 3, or 1 day from today
//   2. Also check new students: joiningDate + 30 days falls in that window (if no nextDueDate)
//   3. Respect per-library WhatsApp notification settings
//   4. Send email always (if email available)
//   5. Send WhatsApp template message (if phone available + library has WA enabled)

export async function sendStudentFeeReminders() {
  const { sendFeeReminderEmail } = await import("@/services/brevo");
  const { sendFeeReminderWhatsApp } = await import("@/services/whatsapp");

  const now = new Date();
  let sent = 0;
  let whatsappSent = 0;
  let emailSent = 0;

  // Only send reminders at 7, 3, 1 days before due date
  // (removed 0 = same day and -1 = overdue from WhatsApp to avoid spam)
  const reminderDays = [7, 3, 1];

  for (const daysAhead of reminderDays) {
    // Build the date window for this reminder slot
    const targetDate = new Date(now);
    targetDate.setDate(targetDate.getDate() + daysAhead);

    const dayStart = new Date(
      targetDate.getFullYear(),
      targetDate.getMonth(),
      targetDate.getDate(),
      0, 0, 0, 0
    );
    const dayEnd = new Date(
      targetDate.getFullYear(),
      targetDate.getMonth(),
      targetDate.getDate(),
      23, 59, 59, 999
    );

    // ── Query 1: Students with nextDueDate in this window ─────────────────
    const studentsWithDueDate = await prisma.student.findMany({
      where: {
        status: "ACTIVE",
        paymentStatus: { notIn: ["PAID"] },      // Skip already-paid students
        nextDueDate: { gte: dayStart, lte: dayEnd },
      },
      include: {
        library: {
          select: {
            name: true,
            settings: {
              select: {
                whatsappNotifications: true,
                emailNotifications: true,
              },
            },
          },
        },
      },
    });

    // ── Query 2: New students (no nextDueDate) — joiningDate + 30 days ───
    // joiningDate + 30 days = first fee due → check if it falls in window
    const studentsNewNoPayment = await prisma.student.findMany({
      where: {
        status: "ACTIVE",
        nextDueDate: null,                        // No payment recorded yet
        lastPaymentDate: null,                   // Never paid
        joiningDate: {
          // joiningDate + 30 days = target → joiningDate = target - 30 days
          gte: new Date(dayStart.getTime() - 30 * 24 * 60 * 60 * 1000),
          lte: new Date(dayEnd.getTime() - 30 * 24 * 60 * 60 * 1000),
        },
      },
      include: {
        library: {
          select: {
            name: true,
            settings: {
              select: {
                whatsappNotifications: true,
                emailNotifications: true,
              },
            },
          },
        },
      },
    });

    // Merge & deduplicate by student ID
    const allStudentsMap = new Map(
      [...studentsWithDueDate, ...studentsNewNoPayment].map((s) => [s.id, s])
    );
    const students = Array.from(allStudentsMap.values());

    for (const student of students) {
      // Calculate the actual due date string to show in message
      let dueDateObj: Date;
      if (student.nextDueDate) {
        dueDateObj = student.nextDueDate;
      } else {
        // joiningDate + 30 days
        dueDateObj = new Date(student.joiningDate);
        dueDateObj.setDate(dueDateObj.getDate() + 30);
      }

      const dueDateStr = dueDateObj.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });

      const feeAmount = Math.max(
        0,
        (student.monthlyFee || 0) - (student.discountAmount || 0)
      );

      const libraryName = student.library?.name || "Library";
      const waEnabled = student.library?.settings?.whatsappNotifications ?? false;
      const emailEnabled = student.library?.settings?.emailNotifications ?? true;

      // ── Send Email ────────────────────────────────────────────────────
      if (emailEnabled && student.email) {
        await sendFeeReminderEmail(
          student.email,
          student.fullName,
          libraryName,
          daysAhead,
          feeAmount,
          dueDateStr
        ).catch((err) => {
          console.error(`[FeeReminder] Email failed for ${student.id}:`, err);
        });
        emailSent++;
      }

      // ── Send WhatsApp (only if library has WA notifications enabled) ─
      if (waEnabled && student.phone) {
        const result = await sendFeeReminderWhatsApp(
          student.phone,
          student.fullName,
          libraryName,
          daysAhead,
          feeAmount,
          dueDateStr
        ).catch((err) => {
          console.error(`[FeeReminder] WhatsApp failed for ${student.id}:`, err);
          return { success: false };
        });

        if (result.success) {
          whatsappSent++;
        }
      }

      sent++;
    }
  }

  console.log(
    `[FeeReminder] Done — ${sent} students processed, ` +
    `${emailSent} emails sent, ${whatsappSent} WhatsApp messages sent`
  );

  return { sent, emailSent, whatsappSent };
}
