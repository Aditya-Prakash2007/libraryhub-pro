"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { workerSchema, workerExpenseSchema } from "@/schemas";
import type { WorkerFormData, WorkerExpenseFormData } from "@/schemas";

async function getAdminLibraryId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.libraryId ?? null;
}

// ----------------- WORKER CRUD -----------------

export async function getWorkers() {
  try {
    const libraryId = await getAdminLibraryId();
    if (!libraryId) return { error: "Unauthorized" };

    const workers = await prisma.worker.findMany({
      where: { libraryId },
      orderBy: { name: "asc" },
    });

    // Fetch shift details for each worker
    const shifts = await prisma.shift.findMany({
      where: { libraryId },
    });

    const workersWithShifts = workers.map(worker => {
      const workerShifts = shifts.filter(s => worker.shiftIds.includes(s.id));
      return {
        ...worker,
        shifts: workerShifts,
      };
    });

    return { workers: workersWithShifts };
  } catch (error) {
    console.error("Get workers error:", error);
    return { error: "Failed to fetch workers" };
  }
}

export async function createWorker(data: WorkerFormData) {
  try {
    const libraryId = await getAdminLibraryId();
    if (!libraryId) return { error: "Unauthorized" };

    // Validate using Zod
    const validated = workerSchema.parse(data);

    const worker = await prisma.worker.create({
      data: {
        name: validated.name,
        phone: validated.phone,
        email: validated.email || null,
        shiftIds: validated.shiftIds,
        libraryId,
        status: "ACTIVE",
      },
    });

    revalidatePath("/admin/workers");
    return { success: true, worker };
  } catch (error) {
    console.error("Create worker error:", error);
    return { error: "Failed to create worker" };
  }
}

export async function updateWorker(id: string, data: Partial<WorkerFormData>) {
  try {
    const libraryId = await getAdminLibraryId();
    if (!libraryId) return { error: "Unauthorized" };

    const worker = await prisma.worker.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.phone && { phone: data.phone }),
        email: data.email === "" ? null : data.email,
        ...(data.shiftIds && { shiftIds: data.shiftIds }),
      },
    });

    revalidatePath("/admin/workers");
    revalidatePath(`/admin/workers/${id}`);
    return { success: true, worker };
  } catch (error) {
    console.error("Update worker error:", error);
    return { error: "Failed to update worker" };
  }
}

export async function deleteWorker(id: string) {
  try {
    const libraryId = await getAdminLibraryId();
    if (!libraryId) return { error: "Unauthorized" };

    // Verify worker belongs to library
    const worker = await prisma.worker.findFirst({
      where: { id, libraryId },
    });

    if (!worker) return { error: "Worker not found" };

    // Delete expenses manually to ensure cleanup in MongoDB if needed
    await prisma.workerExpense.deleteMany({
      where: { workerId: id },
    });

    // Delete worker
    await prisma.worker.delete({
      where: { id },
    });

    revalidatePath("/admin/workers");
    return { success: true };
  } catch (error) {
    console.error("Delete worker error:", error);
    return { error: "Failed to delete worker" };
  }
}

// ----------------- WORKER DETAILS & STATS -----------------

export async function getWorkerDetails(id: string) {
  try {
    const libraryId = await getAdminLibraryId();
    if (!libraryId) return { error: "Unauthorized" };

    const worker = await prisma.worker.findFirst({
      where: { id, libraryId },
    });

    if (!worker) return { error: "Worker not found" };

    // Fetch shift details
    const shifts = await prisma.shift.findMany({
      where: {
        id: { in: worker.shiftIds },
      },
    });

    // Fetch active expenses
    const activeExpenses = await prisma.workerExpense.findMany({
      where: { workerId: id, isArchived: false },
      orderBy: { date: "desc" },
    });

    // Fetch archived expenses
    const archivedExpenses = await prisma.workerExpense.findMany({
      where: { workerId: id, isArchived: true },
      orderBy: { date: "desc" },
    });

    // Stats calculations
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const spentToday = activeExpenses
      .filter(exp => new Date(exp.date) >= today)
      .reduce((sum, exp) => sum + exp.amount, 0);

    // Sum of all active expenses this month
    const spentThisMonth = activeExpenses
      .filter(exp => new Date(exp.date) >= startOfMonth)
      .reduce((sum, exp) => sum + exp.amount, 0);

    // Fetch payments collected by this worker
    const payments = await prisma.payment.findMany({
      where: {
        libraryId,
        status: { in: ["PAID", "PARTIAL"] },
      },
      include: {
        student: { select: { id: true, fullName: true, studentId: true } },
      },
      orderBy: { paidAt: "desc" },
    });

    const collectedPayments = payments.filter((p) => {
      const meta = p.metadata as Record<string, string> | null;
      return meta?.collectedBy === id;
    }).map(p => ({
      id: p.id,
      paymentId: p.paymentId,
      amount: p.amount,
      totalAmount: p.totalAmount,
      paymentType: p.paymentType,
      paymentMode: p.paymentMode,
      status: p.status,
      paidAt: p.paidAt,
      studentName: p.student.fullName,
      studentId: p.student.studentId,
    }));

    const collectedToday = collectedPayments
      .filter(p => p.paidAt && new Date(p.paidAt) >= today)
      .reduce((sum, p) => sum + p.totalAmount, 0);

    const collectedThisMonth = collectedPayments
      .filter(p => p.paidAt && new Date(p.paidAt) >= startOfMonth)
      .reduce((sum, p) => sum + p.totalAmount, 0);

    return {
      worker: { ...worker, shifts },
      activeExpenses,
      archivedExpenses,
      collectedPayments,
      stats: {
        spentToday,
        spentThisMonth,
        collectedToday,
        collectedThisMonth,
      },
    };
  } catch (error) {
    console.error("Get worker details error:", error);
    return { error: "Failed to fetch worker details" };
  }
}

// ----------------- WORKER EXPENSES -----------------

export async function createWorkerExpense(data: WorkerExpenseFormData) {
  try {
    // Validate inputs
    const validated = workerExpenseSchema.parse(data);

    // Fetch worker to get their libraryId (no session needed, since it's a public report form)
    const worker = await prisma.worker.findUnique({
      where: { id: validated.workerId },
      select: { libraryId: true },
    });

    if (!worker) return { error: "Worker not found" };

    const expense = await prisma.workerExpense.create({
      data: {
        workerId: validated.workerId,
        libraryId: worker.libraryId,
        amount: validated.amount,
        description: validated.description,
        imageUrl: validated.imageUrl || null,
        date: new Date(), // captured automatically at submission time
        isArchived: false,
      },
    });

    revalidatePath("/admin/workers");
    revalidatePath(`/admin/workers/${validated.workerId}`);
    return { success: true, expense };
  } catch (error) {
    console.error("Create worker expense error:", error);
    return { error: "Failed to create worker expense" };
  }
}

// ----------------- CRON ARCHIVE & CLEANUP -----------------

export async function archiveAndDeleteExpenses() {
  try {
    const oneMonthAgo = new Date();
    oneMonthAgo.setDate(oneMonthAgo.getDate() - 30);

    const threeMonthsAgo = new Date();
    threeMonthsAgo.setDate(threeMonthsAgo.getDate() - 90);

    // 1. Archive active expenses older than 30 days
    const archiveResult = await prisma.workerExpense.updateMany({
      where: {
        isArchived: false,
        date: { lt: oneMonthAgo },
      },
      data: {
        isArchived: true,
        archivedAt: new Date(),
      },
    });

    // 2. Hard-delete archived expenses where archivedAt is older than 90 days
    const deleteResult = await prisma.workerExpense.deleteMany({
      where: {
        isArchived: true,
        archivedAt: { lt: threeMonthsAgo },
      },
    });

    console.log(`Cron: Archived ${archiveResult.count} and deleted ${deleteResult.count} worker expenses.`);

    return {
      success: true,
      archivedCount: archiveResult.count,
      deletedCount: deleteResult.count,
    };
  } catch (error) {
    console.error("Archive & delete worker expenses error:", error);
    return { error: "Archive/cleanup operations failed" };
  }
}

export async function getWorkersExpenseStats() {
  try {
    const libraryId = await getAdminLibraryId();
    if (!libraryId) return { error: "Unauthorized" };

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const fifteenDaysAgo = new Date();
    fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 14);
    fifteenDaysAgo.setHours(0, 0, 0, 0);

    const queryStartDate = startOfMonth < fifteenDaysAgo ? startOfMonth : fifteenDaysAgo;

    const expenses = await prisma.workerExpense.findMany({
      where: {
        libraryId,
        date: { gte: queryStartDate },
      },
      orderBy: { date: "asc" },
    });

    const spentToday = expenses
      .filter(exp => new Date(exp.date) >= today)
      .reduce((sum, exp) => sum + exp.amount, 0);

    const spentThisMonth = expenses
      .filter(exp => new Date(exp.date) >= startOfMonth)
      .reduce((sum, exp) => sum + exp.amount, 0);

    // Group expenses by date for the last 15 days
    const chartDataMap = new Map<string, number>();
    for (let i = 0; i < 15; i++) {
      const d = new Date();
      d.setDate(d.getDate() - (14 - i));
      const dateStr = d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
      chartDataMap.set(dateStr, 0);
    }

    expenses.forEach((exp) => {
      const expDate = new Date(exp.date);
      if (expDate >= fifteenDaysAgo) {
        const dateStr = expDate.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
        if (chartDataMap.has(dateStr)) {
          chartDataMap.set(dateStr, (chartDataMap.get(dateStr) || 0) + exp.amount);
        }
      }
    });

    const chartData = Array.from(chartDataMap.entries()).map(([date, amount]) => ({
      date,
      amount,
    }));

    return {
      stats: {
        spentToday,
        spentThisMonth,
      },
      chartData,
    };
  } catch (error) {
    console.error("Get workers expense stats error:", error);
    return { error: "Failed to fetch workers expense statistics" };
  }
}

