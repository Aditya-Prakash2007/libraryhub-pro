"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import Razorpay from "razorpay";
import crypto from "crypto";
import { generatePaymentId, generateInvoiceNumber } from "@/lib/utils";
import { sendPaymentConfirmationEmail } from "@/services/brevo";

function getRazorpayForLibrary(keyId?: string | null, keySecret?: string | null) {
  // Use library's own Razorpay keys if configured, otherwise use platform keys
  return new Razorpay({
    key_id: keyId || process.env.RAZORPAY_KEY_ID!,
    key_secret: keySecret || process.env.RAZORPAY_KEY_SECRET!,
  });
}

async function getAdminLibraryId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.libraryId ?? null;
}

// Create Razorpay order — money goes to library owner's account
export async function createRazorpayOrder(data: {
  studentId: string;
  amount: number;
  paymentType: string;
  description?: string;
}) {
  try {
    const session = await auth();
    if (!session?.user) return { error: "Unauthorized" };

    const libraryId = session.user.libraryId;
    if (!libraryId) return { error: "Library not found" };

    // Get library with their Razorpay keys
    const library = await prisma.library.findUnique({
      where: { id: libraryId },
      select: { name: true, razorpayKeyId: true, razorpaySecret: true },
    });
    if (!library) return { error: "Library not found" };

    // Use library's own keys if set, else platform keys
    const razorpay = getRazorpayForLibrary(library.razorpayKeyId, library.razorpaySecret);
    const publicKey = library.razorpayKeyId || process.env.RAZORPAY_KEY_ID;

    // Timestamp-based ID — prevents duplicate key errors
    const paymentId = generateUniquePaymentId();

    const order = await razorpay.orders.create({
      amount: Math.round(data.amount * 100),
      currency: "INR",
      receipt: paymentId,
      notes: {
        studentId: data.studentId,
        libraryId,
        libraryName: library.name,
        paymentType: data.paymentType,
      },
    });

    const payment = await prisma.payment.create({
      data: {
        paymentId,
        studentId: data.studentId,
        libraryId,
        amount: data.amount,
        paymentType: data.paymentType as "MONTHLY" | "QUARTERLY" | "HALF_YEARLY" | "YEARLY" | "REGISTRATION" | "LATE_FEE" | "OTHER",
        paymentMode: "RAZORPAY",
        status: "PENDING",
        razorpayOrderId: order.id,
        description: data.description || `${library.name} - ${data.paymentType.replace(/_/g, " ")}`,
        totalAmount: data.amount,
      },
    });

    return {
      success: true,
      orderId: order.id,
      paymentId: payment.id,
      key: publicKey,
      libraryName: library.name,
    };
  } catch (error) {
    console.error("Create Razorpay order error:", error);
    return { error: "Failed to create payment order" };
  }
}

// Verify Razorpay payment
export async function verifyPayment(data: {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
  paymentDbId: string;
}) {
  try {
    // Use library's own secret if configured
    const payment = await prisma.payment.findUnique({
      where: { id: data.paymentDbId },
      include: {
        student: {
          include: { user: { select: { email: true } } },
        },
        library: {
          select: { name: true, razorpaySecret: true },
        },
      },
    });
    if (!payment) return { error: "Payment not found" };

    const secret = payment.library?.razorpaySecret || process.env.RAZORPAY_KEY_SECRET!;
    const body = `${data.razorpay_order_id}|${data.razorpay_payment_id}`;
    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(body)
      .digest("hex");

    if (expectedSignature !== data.razorpay_signature) {
      return { error: "Invalid payment signature" };
    }

    // Use unique invoice number to prevent duplicate key errors
    const invoiceNumber = generateUniqueInvoiceNumber();

    const now = new Date();
    
    // Determine payment duration
    let monthsToAdd = 1;
    if (payment.paymentType === "QUARTERLY") monthsToAdd = 3;
    else if (payment.paymentType === "HALF_YEARLY") monthsToAdd = 6;
    else if (payment.paymentType === "YEARLY") monthsToAdd = 12;

    // Base nextDueDate on last known nextDueDate (if set), otherwise joiningDate
    const baseDate = payment.student?.nextDueDate
      ? new Date(payment.student.nextDueDate)
      : payment.student?.joiningDate ? new Date(payment.student.joiningDate) : new Date();

    const nextDue = new Date(baseDate);
    nextDue.setMonth(nextDue.getMonth() + monthsToAdd);

    await prisma.$transaction(async (tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0]) => {
      await tx.payment.update({
        where: { id: data.paymentDbId },
        data: {
          status: "PAID",
          razorpayPaymentId: data.razorpay_payment_id,
          razorpaySignature: data.razorpay_signature,
          paidAt: now,
        },
      });

      const invoice = await tx.invoice.create({
        data: {
          invoiceNumber,
          studentId: payment.studentId,
          paymentId: payment.id,
          libraryId: payment.libraryId,
          amount: payment.amount,
          tax: payment.taxAmount,
          discount: payment.discount,
          total: payment.totalAmount,
          status: "PAID",
          paidAt: now,
          items: [
            {
              description: payment.description || "Library Fee",
              quantity: 1,
              rate: payment.amount,
              amount: payment.totalAmount,
            },
          ],
        },
      });

      await tx.student.update({
        where: { id: payment.studentId },
        data: {
          paymentStatus: "PAID",
          lastPaymentDate: now,
          nextDueDate: nextDue,
          pendingMonths: 0,
          totalDueAmount: 0,
        },
      });
    });

    // Send confirmation email (non-blocking)
    const studentEmail = payment.student?.user?.email || payment.student?.email;
    if (studentEmail) {
      await sendPaymentConfirmationEmail(
        studentEmail,
        payment.student.fullName,
        payment.library?.name || "Library",
        payment.totalAmount,
        invoiceNumber,
        payment.paymentType
      ).catch(() => {});
    }

    revalidatePath("/admin/payments");
    revalidatePath("/student/payments");
    return { success: true, invoiceNumber };
  } catch (error) {
    console.error("Verify payment error:", error);
    return { error: "Payment verification failed" };
  }
}

// Generate truly unique payment ID using timestamp + random suffix
function generateUniquePaymentId(): string {
  const year = new Date().getFullYear().toString().slice(-2);
  const ts = Date.now().toString(36).toUpperCase().slice(-5);
  const rand = Math.floor(Math.random() * 1000).toString().padStart(3, "0");
  return `PAY-${year}-${ts}${rand}`;
}

function generateUniqueInvoiceNumber(): string {
  const year = new Date().getFullYear().toString().slice(-2);
  const ts = Date.now().toString(36).toUpperCase().slice(-5);
  const rand = Math.floor(Math.random() * 1000).toString().padStart(3, "0");
  return `INV-${year}-${ts}${rand}`;
}
export async function recordManualPayment(data: {
  studentId: string;
  amount: number;
  paymentType: string;
  paymentMode: "CASH" | "BANK_TRANSFER" | "UPI" | "CHEQUE";
  description?: string;
  periodStart?: string;
  periodEnd?: string;
  notes?: string;
  collectedBy?: string; // workerId of the team member who collected
}) {
  try {
    const libraryId = await getAdminLibraryId();
    if (!libraryId) return { error: "Unauthorized" };

    // Timestamp-based IDs — no duplicate key errors
    const paymentId = generateUniquePaymentId();
    const invoiceNumber = generateUniqueInvoiceNumber();

    // Get student's current fee state
    const student = await prisma.student.findUnique({
      where: { id: data.studentId },
      select: {
        monthlyFee: true,
        discountAmount: true,
        joiningDate: true,
        nextDueDate: true,
        totalDueAmount: true,  // partial balance from last payment (if any)
        pendingMonths: true,   // complete overdue months (from syncDueFees)
        paymentStatus: true,
      },
    });

    let monthsToAdd = 1;
    if (data.paymentType === "QUARTERLY") monthsToAdd = 3;
    else if (data.paymentType === "HALF_YEARLY") monthsToAdd = 6;
    else if (data.paymentType === "YEARLY") monthsToAdd = 12;

    const baseFee = student
      ? Math.max(0, (student.monthlyFee || 0) - (student.discountAmount || 0))
      : data.amount;

    // partialBalance = outstanding balance from previous payment
    // If totalDueAmount is negative → advance credit from overpayment last time
    // If totalDueAmount is positive → pending balance still owed
    const storedDue = student?.totalDueAmount ?? 0;
    const partialBalance = storedDue > 0 ? storedDue : 0;  // owed from before
    const advanceCredit = storedDue < 0 ? Math.abs(storedDue) : 0; // credit from before

    // Total expected = (months × baseFee) + any pending balance - any advance credit
    const expectedFee = Math.max(0, baseFee * monthsToAdd + partialBalance - advanceCredit);

    // Determine payment status and balances
    // Positive newBalance = still owed (partial)
    // Negative newBalance = overpaid (credit to apply next month)
    const rawBalance = expectedFee - data.amount;
    const isPartial = rawBalance > 0;
    const isOverpaid = rawBalance < 0;
    const creditAmount = isOverpaid ? Math.abs(rawBalance) : 0;   // extra paid
    const newTotalDue = isPartial ? rawBalance : isOverpaid ? -creditAmount : 0;
    // Negative totalDueAmount = advance credit (reduces next month's fee)
    const paymentStatus = isPartial ? "PARTIAL" : "PAID";

    const now = new Date();

    // Base nextDueDate on last known nextDueDate (if set), else joiningDate
    const baseDate = student?.nextDueDate
      ? new Date(student.nextDueDate)
      : student?.joiningDate ? new Date(student.joiningDate) : new Date();

    const nextDue = new Date(baseDate);
    nextDue.setMonth(nextDue.getMonth() + monthsToAdd);

    // Period labels for the payment record
    const periodLabel = (() => {
      const from = new Date(baseDate);
      const to = new Date(nextDue);
      const fmt = (d: Date) => d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
      return `${fmt(from)} – ${fmt(to)}`;
    })();

    await prisma.$transaction(async (tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0]) => {
      const payment = await tx.payment.create({
        data: {
          paymentId,
          studentId: data.studentId,
          libraryId,
          amount: data.amount,
          paymentType: data.paymentType as "MONTHLY" | "QUARTERLY" | "HALF_YEARLY" | "YEARLY" | "REGISTRATION" | "LATE_FEE" | "OTHER",
          paymentMode: data.paymentMode,
          status: paymentStatus,
          paidAt: now,
          description: isPartial
            ? `${data.description || "Library Fee"} (Partial — ₹${rawBalance} pending) | ${periodLabel}`
            : isOverpaid
            ? `${data.description || "Library Fee"} (₹${creditAmount} advance credit) | ${periodLabel}`
            : `${data.description || "Library Fee"} | ${periodLabel}`,
          periodStart: new Date(baseDate),
          periodEnd: new Date(nextDue),
          notes: isPartial
            ? `Partial payment. Remaining balance: ₹${rawBalance}. ${data.notes || ""}`
            : isOverpaid
            ? `Overpayment. ₹${creditAmount} will be adjusted in next month's fee. ${data.notes || ""}`
            : data.notes,
          totalAmount: data.amount,
          lateFee: partialBalance > 0 ? partialBalance : 0,
          metadata: data.collectedBy ? { collectedBy: data.collectedBy } : undefined,
        },
      });

      await tx.invoice.create({
        data: {
          invoiceNumber,
          studentId: data.studentId,
          paymentId: payment.id,
          libraryId,
          amount: data.amount,
          total: data.amount,
          status: paymentStatus,
          paidAt: now,
          items: [
            {
              description: isPartial
                ? `${data.description || "Library Fee"} (Partial) | ${periodLabel} — ₹${rawBalance} pending`
                : isOverpaid
                ? `${data.description || "Library Fee"} | ${periodLabel} (₹${creditAmount} advance credit applied next month)`
                : `${data.description || "Library Fee"} | ${periodLabel}`,
              quantity: monthsToAdd,
              rate: baseFee,
              amount: data.amount,
            },
          ],
        },
      });

      // Update student fee state
      // totalDueAmount: positive = still owed (partial), negative = advance credit
      await tx.student.update({
        where: { id: data.studentId },
        data: {
          paymentStatus: paymentStatus,
          lastPaymentDate: now,
          nextDueDate: nextDue,
          pendingMonths: 0,
          totalDueAmount: newTotalDue,
        },
      });
    });

    revalidatePath("/admin/payments");
    return {
      success: true,
      isPartial,
      isOverpaid,
      amountPaid: data.amount,
      balanceDue: isPartial ? rawBalance : 0,
      creditAmount,
      paymentStatus,
      periodLabel,
    };
  } catch (error) {
    console.error("Record manual payment error:", error);
    return { error: "Failed to record payment" };
  }
}

// Get payments collected by a specific team member (worker)
export async function getPaymentsByWorker(workerId: string, period: "today" | "month" = "month") {
  try {
    const libraryId = await getAdminLibraryId();
    if (!libraryId) return { error: "Unauthorized" };

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startDate = period === "today" ? today : startOfMonth;

    const payments = await prisma.payment.findMany({
      where: {
        libraryId,
        status: { in: ["PAID", "PARTIAL"] },
        paidAt: { gte: startDate },
      },
      include: {
        student: { select: { id: true, fullName: true, studentId: true } },
      },
      orderBy: { paidAt: "desc" },
    });

    // Filter by collectedBy in metadata
    const filtered = payments.filter((p) => {
      const meta = p.metadata as Record<string, string> | null;
      return meta?.collectedBy === workerId;
    });

    const totalToday = filtered
      .filter((p) => p.paidAt && new Date(p.paidAt) >= today)
      .reduce((s, p) => s + p.totalAmount, 0);

    const totalMonth = filtered.reduce((s, p) => s + p.totalAmount, 0);

    return { payments: filtered, totalToday, totalMonth };
  } catch (error) {
    console.error("Get payments by worker error:", error);
    return { error: "Failed to fetch payments" };
  }
}

// Get payments
export async function getPayments(params?: {
  studentId?: string;
  status?: string;
  page?: number;
  limit?: number;
}) {
  try {
    const libraryId = await getAdminLibraryId();
    if (!libraryId) return { error: "Unauthorized" };

    const { studentId, status = "all", page = 1, limit = 20 } = params || {};

    // ---------- helper: build virtual "pending" rows from students ----------
    const buildPendingRows = async () => {
      const now = new Date();
      // Fetch ALL active students (we filter after calculation)
      const allActive = await prisma.student.findMany({
        where: {
          libraryId,
          status: "ACTIVE" as const,
          ...(studentId && { id: studentId }),
        },
      });

      const { calculateDueFee } = await import("@/utils/fee-calculator");

      const rows: Array<{
        id: string;
        paymentId: string;
        amount: number;
        totalAmount: number;
        paymentType: string;
        paymentMode: string;
        status: string;
        paidAt: null;
        createdAt: Date;
        student: { id: string; fullName: string; studentId: string; profilePhoto: string | null };
        invoice: null;
      }> = [];

      for (const s of allActive) {
        const actualFee = Math.max(0, s.monthlyFee - (s.discountAmount || 0));
        const calc = calculateDueFee(s.joiningDate, actualFee, s.nextDueDate, now);

        // Add partial balance that might be stored in DB
        const partialBalance = s.totalDueAmount && s.totalDueAmount > 0 ? s.totalDueAmount : 0;
        const syncedDue = (s.pendingMonths || 0) * actualFee;
        const extraPartial = partialBalance > syncedDue ? partialBalance - syncedDue : 0;
        const totalDue = calc.totalDueAmount + extraPartial;

        // Only include students who actually owe money
        if (totalDue <= 0) continue;

        rows.push({
          id: s.id,
          paymentId: "PENDING",
          amount: totalDue,
          totalAmount: totalDue,
          paymentType: calc.pendingMonths > 1 ? "OTHER" : "MONTHLY",
          paymentMode: "DUE",
          status: "PENDING",
          paidAt: null,
          createdAt: s.nextDueDate || s.joiningDate,
          student: {
            id: s.id,
            fullName: s.fullName,
            studentId: s.studentId,
            profilePhoto: s.profilePhoto,
          },
          invoice: null,
        });
      }

      return rows;
    };

    // ---------- PENDING tab ----------
    if (status === "PENDING") {
      const allPending = await buildPendingRows();
      const total = allPending.length;
      const paged = allPending.slice((page - 1) * limit, page * limit);
      return { payments: paged, total, pages: Math.ceil(total / limit) };
    }

    // ---------- "all" tab: real transactions + pending rows merged ----------
    if (status === "all") {
      // 1. Fetch real payment records
      const paymentWhere = {
        libraryId,
        ...(studentId && { studentId }),
      };
      const [realPayments, realTotal] = await prisma.$transaction([
        prisma.payment.findMany({
          where: paymentWhere,
          include: {
            student: { select: { id: true, fullName: true, studentId: true, profilePhoto: true } },
            invoice: { select: { invoiceNumber: true } },
          },
          orderBy: { createdAt: "desc" },
        }),
        prisma.payment.count({ where: paymentWhere }),
      ]);

      // 2. Build virtual pending rows
      const pendingRows = await buildPendingRows();

      // 3. Merge: pending first, then real payments (newest first)
      const merged = [...pendingRows, ...realPayments];
      const total = merged.length;
      const paged = merged.slice((page - 1) * limit, page * limit);

      return { payments: paged, total, pages: Math.ceil(total / limit) };
    }

    // ---------- Other specific status filters (PAID, PARTIAL, etc.) ----------
    const where = {
      libraryId,
      ...(studentId && { studentId }),
      status: status as "PAID" | "OVERDUE" | "FAILED" | "REFUNDED" | "PARTIAL",
    };

    const [payments, total] = await prisma.$transaction([
      prisma.payment.findMany({
        where,
        include: {
          student: { select: { id: true, fullName: true, studentId: true, profilePhoto: true } },
          invoice: { select: { invoiceNumber: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.payment.count({ where }),
    ]);

    return { payments, total, pages: Math.ceil(total / limit) };
  } catch (error) {
    console.error("Get payments error:", error);
    return { error: "Failed to fetch payments" };
  }
}

// Get revenue analytics
export async function getRevenueAnalytics(period: "week" | "month" | "year" = "month") {
  try {
    const libraryId = await getAdminLibraryId();
    if (!libraryId) return { error: "Unauthorized" };

    const now = new Date();
    let startDate: Date;
    let groupBy: string;

    if (period === "week") {
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      groupBy = "day";
    } else if (period === "month") {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      groupBy = "day";
    } else {
      startDate = new Date(now.getFullYear(), 0, 1);
      groupBy = "month";
    }

    const payments = await prisma.payment.findMany({
      where: {
        libraryId,
        status: "PAID",
        paidAt: { gte: startDate },
      },
      select: {
        amount: true,
        totalAmount: true,
        paidAt: true,
        paymentType: true,
      },
    });

    // Group by date
    const grouped: Record<string, number> = {};
    payments.forEach((p) => {
      if (!p.paidAt) return;
      let key: string;
      if (groupBy === "day") {
        key = p.paidAt.toISOString().split("T")[0];
      } else {
        key = `${p.paidAt.getFullYear()}-${String(p.paidAt.getMonth() + 1).padStart(2, "0")}`;
      }
      grouped[key] = (grouped[key] || 0) + p.totalAmount;
    });

    const chartData = Object.entries(grouped).map(([date, revenue]) => ({
      date,
      revenue,
    }));

    const totalRevenue = payments.reduce((sum, p) => sum + p.totalAmount, 0);

    return { chartData, totalRevenue };
  } catch (error) {
    console.error("Revenue analytics error:", error);
    return { error: "Failed to fetch analytics" };
  }
}

// Get combined financial reports (Income vs Expense)
export async function getFinancialReportsData(period: "week" | "month" | "year" = "month") {
  try {
    const libraryId = await getAdminLibraryId();
    if (!libraryId) return { error: "Unauthorized" };

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    let startDate: Date;
    let groupBy: "day" | "month";

    if (period === "week") {
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      startDate.setHours(0, 0, 0, 0);
      groupBy = "day";
    } else if (period === "month") {
      startDate = startOfMonth;
      groupBy = "day";
    } else {
      startDate = new Date(now.getFullYear(), 0, 1);
      groupBy = "month";
    }

    // Query PAID payments
    const payments = await prisma.payment.findMany({
      where: {
        libraryId,
        status: "PAID",
        paidAt: { gte: startDate },
      },
      select: {
        totalAmount: true,
        paidAt: true,
      },
    });

    // Query expenses
    const expenses = await prisma.workerExpense.findMany({
      where: {
        libraryId,
        date: { gte: startDate },
      },
      select: {
        amount: true,
        date: true,
      },
    });

    // Calculate totals
    const todayIncome = payments
      .filter((p) => p.paidAt && new Date(p.paidAt) >= today)
      .reduce((sum, p) => sum + p.totalAmount, 0);

    const todayExpense = expenses
      .filter((e) => new Date(e.date) >= today)
      .reduce((sum, e) => sum + e.amount, 0);

    const monthIncome = payments
      .filter((p) => p.paidAt && new Date(p.paidAt) >= startOfMonth)
      .reduce((sum, p) => sum + p.totalAmount, 0);

    const monthExpense = expenses
      .filter((e) => new Date(e.date) >= startOfMonth)
      .reduce((sum, e) => sum + e.amount, 0);

    // Group both by date
    const groupedData: Record<string, { income: number; expense: number }> = {};

    // Helper to format date keys
    const getDateKey = (date: Date) => {
      if (groupBy === "day") {
        return date.toISOString().split("T")[0];
      } else {
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      }
    };

    // Initialize all dates in period to 0
    const temp = new Date(startDate);
    while (temp <= now) {
      const key = getDateKey(temp);
      groupedData[key] = { income: 0, expense: 0 };
      if (groupBy === "day") {
        temp.setDate(temp.getDate() + 1);
      } else {
        temp.setMonth(temp.getMonth() + 1);
      }
    }

    // Populate payments
    payments.forEach((p) => {
      if (!p.paidAt) return;
      const key = getDateKey(p.paidAt);
      if (!groupedData[key]) {
        groupedData[key] = { income: 0, expense: 0 };
      }
      groupedData[key].income += p.totalAmount;
    });

    // Populate expenses
    expenses.forEach((e) => {
      const key = getDateKey(e.date);
      if (!groupedData[key]) {
        groupedData[key] = { income: 0, expense: 0 };
      }
      groupedData[key].expense += e.amount;
    });

    const chartData = Object.entries(groupedData).map(([date, val]) => ({
      date,
      income: val.income,
      expense: val.expense,
    })).sort((a, b) => a.date.localeCompare(b.date));

    return {
      todayIncome,
      todayExpense,
      monthIncome,
      monthExpense,
      chartData,
    };
  } catch (error) {
    console.error("Get financial reports error:", error);
    return { error: "Failed to fetch financial reports" };
  }
}
