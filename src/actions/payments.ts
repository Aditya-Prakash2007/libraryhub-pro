"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import Razorpay from "razorpay";
import crypto from "crypto";
import { generatePaymentId, generateInvoiceNumber } from "@/lib/utils";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

async function getAdminLibraryId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.libraryId ?? null;
}

// Create Razorpay order
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

    // Get payment count for ID generation
    const count = await prisma.payment.count({ where: { libraryId } });
    const paymentId = generatePaymentId(count + 1);

    // Create Razorpay order
    const order = await razorpay.orders.create({
      amount: Math.round(data.amount * 100), // Convert to paise
      currency: "INR",
      receipt: paymentId,
      notes: {
        studentId: data.studentId,
        libraryId,
        paymentType: data.paymentType,
      },
    });

    // Create pending payment record
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
        description: data.description,
        totalAmount: data.amount,
      },
    });

    return {
      success: true,
      orderId: order.id,
      paymentId: payment.id,
      key: process.env.RAZORPAY_KEY_ID,
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
    const body = `${data.razorpay_order_id}|${data.razorpay_payment_id}`;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
      .update(body)
      .digest("hex");

    if (expectedSignature !== data.razorpay_signature) {
      return { error: "Invalid payment signature" };
    }

    const payment = await prisma.payment.findUnique({
      where: { id: data.paymentDbId },
      include: { student: true },
    });

    if (!payment) return { error: "Payment not found" };

    // Get invoice count
    const invoiceCount = await prisma.invoice.count({
      where: { libraryId: payment.libraryId },
    });
    const invoiceNumber = generateInvoiceNumber(invoiceCount + 1);

    await prisma.$transaction(async (tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0]) => {
      // Update payment
      await tx.payment.update({
        where: { id: data.paymentDbId },
        data: {
          status: "PAID",
          razorpayPaymentId: data.razorpay_payment_id,
          razorpaySignature: data.razorpay_signature,
          paidAt: new Date(),
        },
      });

      // Create invoice
      await tx.invoice.create({
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
          paidAt: new Date(),
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

      // Update student payment status
      await tx.student.update({
        where: { id: payment.studentId },
        data: { paymentStatus: "PAID" },
      });
    });

    revalidatePath("/admin/payments");
    revalidatePath("/student/payments");
    return { success: true };
  } catch (error) {
    console.error("Verify payment error:", error);
    return { error: "Payment verification failed" };
  }
}

// Record cash/manual payment
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

    const count = await prisma.payment.count({ where: { libraryId } });
    const paymentId = generatePaymentId(count + 1);
    const invoiceCount = await prisma.invoice.count({
      where: { libraryId },
    });
    const invoiceNumber = generateInvoiceNumber(invoiceCount + 1);

    await prisma.$transaction(async (tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0]) => {
      const payment = await tx.payment.create({
        data: {
          paymentId,
          studentId: data.studentId,
          libraryId,
          amount: data.amount,
          paymentType: data.paymentType as "MONTHLY" | "QUARTERLY" | "HALF_YEARLY" | "YEARLY" | "REGISTRATION" | "LATE_FEE" | "OTHER",
          paymentMode: data.paymentMode,
          status: "PAID",
          paidAt: new Date(),
          description: data.description,
          periodStart: data.periodStart ? new Date(data.periodStart) : undefined,
          periodEnd: data.periodEnd ? new Date(data.periodEnd) : undefined,
          notes: data.notes,
          totalAmount: data.amount,
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
          status: "PAID",
          paidAt: new Date(),
          items: [
            {
              description: data.description || "Library Fee",
              quantity: 1,
              rate: data.amount,
              amount: data.amount,
            },
          ],
        },
      });

      await tx.student.update({
        where: { id: data.studentId },
        data: { paymentStatus: "PAID" },
      });
    });

    revalidatePath("/admin/payments");
    return { success: true };
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
