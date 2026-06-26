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
        payments: {
          where: { status: "PAID" },
          orderBy: { paidAt: "desc" },
          take: 1,
          select: { paidAt: true },
        },
      },
    });

    const today = new Date();
    let updated = 0;

    for (const student of students) {
      const lastPaidDate = student.lastPaymentDate
        ?? student.payments[0]?.paidAt
        ?? null;

      const expectedFee = Math.max(0, student.monthlyFee - (student.discountAmount || 0));

      const fee = calculateDueFee(
        student.joiningDate,
        expectedFee,
        lastPaidDate,
        today
      );

      // Only update if something changed
      if (
        fee.pendingMonths !== undefined &&
        fee.totalDueAmount !== undefined
      ) {
        await prisma.student.update({
          where: { id: student.id },
          data: {
            pendingMonths: fee.pendingMonths,
            totalDueAmount: fee.totalDueAmount,
            nextDueDate: fee.nextDueDate,
            paymentStatus:
              fee.pendingMonths > 0
                ? fee.pendingMonths > 1
                  ? "OVERDUE"
                  : "PENDING"
                : "PAID",
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
        paymentStatus: { in: ["PENDING", "OVERDUE"] },
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
        paymentStatus: { in: ["PENDING", "OVERDUE"] },
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
