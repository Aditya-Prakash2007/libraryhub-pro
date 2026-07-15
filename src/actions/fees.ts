"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calculateDueFee, buildDueFeeRows, type StudentFeeRow } from "@/utils/fee-calculator";
import { revalidatePath } from "next/cache";

async function getAdminLibraryId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.libraryId ?? null;
}

// Sync due fees for all active students in the library
export async function syncDueFees() {
  try {
    const libraryId = await getAdminLibraryId();
    if (!libraryId) return { error: "Unauthorized" };

    const students = await prisma.student.findMany({
      where: { libraryId, status: "ACTIVE" },
      select: {
        id: true,
        joiningDate: true,
        monthlyFee: true,
        discountAmount: true,
        lastPaymentDate: true,
        nextDueDate: true,
        paymentStatus: true,
        totalDueAmount: true,
        pendingMonths: true,
      },
    });

    const today = new Date();
    let updated = 0;

    // One-time cleanup: students who have NEVER paid (lastPaymentDate=null) should
    // NOT have a nextDueDate — it was incorrectly set by the old student-creation code.
    // Clear it so the display shows "Not yet paid" correctly.
    for (const student of students) {
      if (!student.lastPaymentDate && student.nextDueDate) {
        await prisma.student.update({
          where: { id: student.id },
          data: { nextDueDate: null },
        });
      }
    }

    for (const student of students) {
      const baseFee = Math.max(0, student.monthlyFee - (student.discountAmount || 0));

      const fee = calculateDueFee(
        student.joiningDate,
        baseFee,
        student.nextDueDate,
        today
      );

      // Determine new paymentStatus:
      let newStatus: string;
      if (fee.pendingMonths > 0) {
        newStatus = fee.pendingMonths > 1 ? "OVERDUE" : "PENDING";
      } else if (student.paymentStatus === "PARTIAL") {
        const partialExpiry = student.nextDueDate ? new Date(student.nextDueDate) : null;
        if (partialExpiry && today >= partialExpiry) {
          // Partial billing cycle ended → now the new cycle is pending
          newStatus = "PENDING";
        } else {
          newStatus = "PARTIAL"; // still within the partially-paid month
        }
      } else {
        newStatus = "PAID";
      }

      if (student.pendingMonths !== fee.pendingMonths || student.paymentStatus !== newStatus) {
        await prisma.student.update({
          where: { id: student.id },
          data: {
            pendingMonths: fee.pendingMonths,
            paymentStatus: newStatus as any,
          },
        });
        updated++;
      }
    }

    revalidatePath("/admin/dashboard");
    revalidatePath("/admin/payments");
    return { success: true, updated };
  } catch (error) {
    console.error("Sync due fees error:", error);
    return { error: "Failed to sync fee data" };
  }
}

// Global Sync for CRON JOB - Updates all libraries
export async function syncGlobalDueFees() {
  try {
    const students = await prisma.student.findMany({
      where: { status: "ACTIVE" },
      select: {
        id: true,
        joiningDate: true,
        monthlyFee: true,
        discountAmount: true,
        lastPaymentDate: true,
        nextDueDate: true,
        paymentStatus: true,
        totalDueAmount: true,
        pendingMonths: true,
      },
    });

    const today = new Date();
    let updated = 0;

    for (const student of students) {
      if (!student.lastPaymentDate && student.nextDueDate) {
        await prisma.student.update({
          where: { id: student.id },
          data: { nextDueDate: null },
        });
      }
    }

    for (const student of students) {
      const baseFee = Math.max(0, student.monthlyFee - (student.discountAmount || 0));

      const fee = calculateDueFee(
        student.joiningDate,
        baseFee,
        student.nextDueDate,
        today
      );

      let newStatus: string;
      if (fee.pendingMonths > 0) {
        newStatus = fee.pendingMonths > 1 ? "OVERDUE" : "PENDING";
      } else if (student.paymentStatus === "PARTIAL") {
        const partialExpiry = student.nextDueDate ? new Date(student.nextDueDate) : null;
        if (partialExpiry && today >= partialExpiry) {
          newStatus = "PENDING";
        } else {
          newStatus = "PARTIAL";
        }
      } else {
        newStatus = "PAID";
      }

      if (student.pendingMonths !== fee.pendingMonths || student.paymentStatus !== newStatus) {
        await prisma.student.update({
          where: { id: student.id },
          data: {
            pendingMonths: fee.pendingMonths,
            paymentStatus: newStatus as any,
          },
        });
        updated++;
      }
    }

    return { success: true, updated };
  } catch (error) {
    console.error("Global sync due fees error:", error);
    return { error: "Failed to sync global fee data" };
  }
}

// Get students with due fees (for Due Fees dashboard card)
export async function getDueFeesData(params?: {
  search?: string;
  page?: number;
  limit?: number;
}) {
  try {
    const libraryId = await getAdminLibraryId();
    if (!libraryId) return { error: "Unauthorized" };

    const { search = "", page = 1, limit = 20 } = params ?? {};

    const students = await prisma.student.findMany({
      where: {
        libraryId,
        status: "ACTIVE",
        paymentStatus: { in: ["PENDING", "OVERDUE", "PARTIAL"] },
        ...(search && {
          OR: [
            { fullName: { contains: search, mode: "insensitive" as const } },
            { phone: { contains: search } },
            { studentId: { contains: search, mode: "insensitive" as const } },
          ],
        }),
      },
      include: {
        seat: { select: { seatNumber: true } },
        shift: { select: { name: true } },
      },
      orderBy: { pendingMonths: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    });

    const total = await prisma.student.count({
      where: {
        libraryId,
        status: "ACTIVE",
        paymentStatus: { in: ["PENDING", "OVERDUE", "PARTIAL"] },
      },
    });

    // Recalculate on the fly for accuracy
    const rows = buildDueFeeRows(students as unknown as StudentFeeRow[]);

    const totalDueRevenue = rows.reduce((sum, r) => sum + r.totalDueAmount, 0);

    return {
      rows,
      total,
      pages: Math.ceil(total / limit),
      totalDueRevenue,
    };
  } catch (error) {
    console.error("Get due fees error:", error);
    return { error: "Failed to fetch due fees" };
  }
}

// Send fee reminder to a single student
export async function sendSingleFeeReminder(studentId: string) {
  try {
    const libraryId = await getAdminLibraryId();
    if (!libraryId) return { error: "Unauthorized" };

    const student = await prisma.student.findFirst({
      where: { id: studentId, libraryId },
      include: {
        user: { select: { email: true } },
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

    if (!student) return { error: "Student not found" };

    const { sendFeeReminderEmail } = await import("@/services/brevo");
    const { sendFeeReminderWhatsApp } = await import("@/services/whatsapp");

    const dueDateStr = student.nextDueDate
      ? student.nextDueDate.toLocaleDateString("en-IN", { day: "numeric", month: "long" })
      : "Soon";

    // Calculate days ahead: if nextDueDate is in the future or past
    let daysAhead = 0;
    if (student.nextDueDate) {
      const diffTime = student.nextDueDate.getTime() - Date.now();
      daysAhead = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    let emailSent = false;
    let whatsappSent = false;

    const emailEnabled = student.library.settings?.emailNotifications ?? true;
    const waEnabled = student.library.settings?.whatsappNotifications ?? false;

    if (emailEnabled && student.user?.email) {
      await sendFeeReminderEmail(
        student.user.email,
        student.fullName,
        student.library.name,
        daysAhead,
        student.monthlyFee,
        dueDateStr
      ).then(() => { emailSent = true; }).catch((e) => console.error("Email reminder error:", e));
    }

    if (waEnabled && student.phone) {
      await sendFeeReminderWhatsApp(
        student.phone,
        student.fullName,
        student.library.name,
        daysAhead,
        student.monthlyFee,
        dueDateStr
      ).then(() => { whatsappSent = true; }).catch((e) => console.error("WhatsApp reminder error:", e));
    }

    // Log this notification in DB
    await prisma.notification.create({
      data: {
        userId: student.userId || "",
        studentId: student.id,
        libraryId,
        title: "Fee Payment Reminder",
        message: `Reminder sent for monthly fee of ₹${student.monthlyFee}. Next due date is ${dueDateStr}.`,
        type: student.paymentStatus === "OVERDUE" ? "FEE_OVERDUE" : "FEE_DUE",
        channel: "IN_APP",
        sentAt: new Date(),
      },
    });

    return { success: true, emailSent, whatsappSent };
  } catch (error) {
    console.error("Send single fee reminder error:", error);
    return { error: "Failed to send reminder" };
  }
}

