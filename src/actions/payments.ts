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
    // Calculate next due date (1 month from now)
    const nextDue = new Date(now);
    nextDue.setMonth(nextDue.getMonth() + 1);

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
}) {
  try {
    const libraryId = await getAdminLibraryId();
    if (!libraryId) return { error: "Unauthorized" };

    // Timestamp-based IDs — no duplicate key errors
    const paymentId = generateUniquePaymentId();
    const invoiceNumber = generateUniqueInvoiceNumber();

    // Get student's monthly fee to determine if payment is partial
    const student = await prisma.student.findUnique({
      where: { id: data.studentId },
      select: { monthlyFee: true, discountAmount: true },
    });

    const expectedFee = student
      ? Math.max(0, (student.monthlyFee || 0) - (student.discountAmount || 0))
      : data.amount;

    // Determine payment status: PARTIAL if paid less than expected, PAID if full
    const isPartial = data.amount < expectedFee;
    const balanceDue = isPartial ? expectedFee - data.amount : 0;
    const paymentStatus = isPartial ? "PARTIAL" : "PAID";

    const now = new Date();
    const nextDue = new Date(now);
    nextDue.setMonth(nextDue.getMonth() + 1);

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
            ? `${data.description || "Library Fee"} (Partial — ₹${balanceDue} due)`
            : data.description,
          periodStart: data.periodStart ? new Date(data.periodStart) : undefined,
          periodEnd: data.periodEnd ? new Date(data.periodEnd) : undefined,
          notes: isPartial
            ? `Partial payment. Balance due: ₹${balanceDue}. ${data.notes || ""}`
            : data.notes,
          totalAmount: data.amount,
          lateFee: balanceDue, // store balance due in lateFee field
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
                ? `${data.description || "Library Fee"} (Partial payment — ₹${balanceDue} pending)`
                : data.description || "Library Fee",
              quantity: 1,
              rate: expectedFee,
              amount: data.amount,
            },
          ],
        },
      });

      // Update student payment status
      // PARTIAL = dues exist, PAID = fully paid
      await tx.student.update({
        where: { id: data.studentId },
        data: {
          paymentStatus: isPartial ? "PARTIAL" : "PAID",
          lastPaymentDate: now,
          ...(isPartial ? {
            // Keep dues tracking
            totalDueAmount: balanceDue,
            pendingMonths: 0, // current month partially paid
          } : {
            nextDueDate: nextDue,
            pendingMonths: 0,
            totalDueAmount: 0,
          }),
        },
      });
    });

    revalidatePath("/admin/payments");
    return {
      success: true,
      isPartial,
      amountPaid: data.amount,
      balanceDue,
      paymentStatus,
    };
  } catch (error) {
    console.error("Record manual payment error:", error);
    return { error: "Failed to record payment" };
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

    const where = {
      libraryId,
      ...(studentId && { studentId }),
      ...(status !== "all" && { status: status as "PENDING" | "PAID" | "OVERDUE" | "FAILED" | "REFUNDED" | "PARTIAL" }),
    };

    const [payments, total] = await prisma.$transaction([
      prisma.payment.findMany({
        where,
        include: {
          student: { select: { fullName: true, studentId: true, profilePhoto: true } },
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
