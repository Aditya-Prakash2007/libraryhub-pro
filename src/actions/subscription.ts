"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Razorpay from "razorpay";
import crypto from "crypto";
import { revalidatePath } from "next/cache";

function getRazorpay() {
  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID!,
    key_secret: process.env.RAZORPAY_KEY_SECRET!,
  });
}

export async function createSubscriptionOrder(data: {
  libraryId: string;
  planId: string;
  amount: number;
  months: number;
}) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "LIBRARY_ADMIN") return { error: "Unauthorized" };
    if (session.user.libraryId !== data.libraryId) return { error: "Unauthorized" };

    const razorpay = getRazorpay();
    const receipt = `SUB-${data.libraryId.slice(-6)}-${Date.now()}`;

    const order = await razorpay.orders.create({
      amount: data.amount * 100, // paise
      currency: "INR",
      receipt,
      notes: {
        libraryId: data.libraryId,
        planId: data.planId,
        months: String(data.months),
        type: "SUBSCRIPTION",
      },
    });

    // Save pending order record
    const dbRecord = await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        libraryId: data.libraryId,
        type: "PAYMENT_RECEIVED",
        description: `Subscription order created: ${data.planId} x${data.months}mo`,
        metadata: {
          orderId: order.id,
          planId: data.planId,
          amount: data.amount,
          months: data.months,
          status: "PENDING",
        },
      },
    });

    return {
      success: true,
      orderId: order.id,
      dbOrderId: dbRecord.id,
      key: process.env.RAZORPAY_KEY_ID,
    };
  } catch (error) {
    console.error("Create subscription order error:", error);
    return { error: "Failed to create payment order" };
  }
}

export async function verifySubscriptionPayment(data: {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
  libraryId: string;
  months: number;
  planId: string;
}) {
  try {
    // Verify Razorpay signature
    const body = `${data.razorpay_order_id}|${data.razorpay_payment_id}`;
    const expectedSig = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
      .update(body)
      .digest("hex");

    if (expectedSig !== data.razorpay_signature) {
      return { error: "Invalid payment signature" };
    }

    // Calculate new expiry
    const library = await prisma.library.findUnique({
      where: { id: data.libraryId },
      include: { subscription: true },
    });
    if (!library) return { error: "Library not found" };

    // Start from today or extend existing subscription
    const baseDate =
      library.subscription?.endDate && library.subscription.endDate > new Date()
        ? library.subscription.endDate
        : new Date();

    const newEndDate = new Date(baseDate);
    newEndDate.setMonth(newEndDate.getMonth() + data.months);

    const planName =
      data.months === 1 ? "STARTER" :
      data.months === 3 ? "PROFESSIONAL" :
      "PROFESSIONAL";

    // Update subscription
    await prisma.$transaction([
      prisma.library.update({
        where: { id: data.libraryId },
        data: {
          isActive: true,
          isTrialActive: false,
          trialExpired: false,
          approvalStatus: "APPROVED",
        },
      }),
      prisma.subscription.upsert({
        where: { libraryId: data.libraryId },
        create: {
          libraryId: data.libraryId,
          plan: planName as "STARTER" | "PROFESSIONAL",
          status: "ACTIVE",
          startDate: new Date(),
          endDate: newEndDate,
          amount: data.months === 1 ? 4999 : data.months === 3 ? Math.round(4999 * 3 * 0.9) : Math.round(4999 * 6 * 0.85),
          maxStudents: 500,
          maxSeats: 1000,
        },
        update: {
          plan: planName as "STARTER" | "PROFESSIONAL",
          status: "ACTIVE",
          endDate: newEndDate,
          amount: data.months === 1 ? 4999 : data.months === 3 ? Math.round(4999 * 3 * 0.9) : Math.round(4999 * 6 * 0.85),
        },
      }),
    ]);

    revalidatePath("/admin/dashboard");
    revalidatePath("/admin/subscription");
    return { success: true };
  } catch (error) {
    console.error("Verify subscription payment error:", error);
    return { error: "Payment verification failed" };
  }
}
