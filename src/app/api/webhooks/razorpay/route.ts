// Razorpay Webhook Handler
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { generateInvoiceNumber } from "@/lib/utils";

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const signature = req.headers.get("x-razorpay-signature");

    if (!signature) {
      return NextResponse.json({ error: "No signature" }, { status: 400 });
    }

    // Verify webhook signature
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
      .update(body)
      .digest("hex");

    if (expectedSignature !== signature) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const event = JSON.parse(body);
    const { event: eventType, payload } = event;

    if (eventType === "payment.captured") {
      const payment = payload.payment.entity;
      const orderId = payment.order_id;

      // Find pending payment record
      const paymentRecord = await prisma.payment.findFirst({
        where: { razorpayOrderId: orderId, status: "PENDING" },
      });

      if (paymentRecord) {
        const invoiceCount = await prisma.invoice.count({
          where: { libraryId: paymentRecord.libraryId },
        });
        const invoiceNumber = generateInvoiceNumber(invoiceCount + 1);

        await prisma.$transaction(async (tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0]) => {
          await tx.payment.update({
            where: { id: paymentRecord.id },
            data: {
              status: "PAID",
              razorpayPaymentId: payment.id,
              paidAt: new Date(),
            },
          });

          await tx.invoice.create({
            data: {
              invoiceNumber,
              studentId: paymentRecord.studentId,
              paymentId: paymentRecord.id,
              libraryId: paymentRecord.libraryId,
              amount: paymentRecord.amount,
              total: paymentRecord.totalAmount,
              status: "PAID",
              paidAt: new Date(),
              items: [
                {
                  description: paymentRecord.description || "Library Fee",
                  quantity: 1,
                  rate: paymentRecord.amount,
                  amount: paymentRecord.totalAmount,
                },
              ],
            },
          });

          await tx.student.update({
            where: { id: paymentRecord.studentId },
            data: { paymentStatus: "PAID" },
          });
        });
      }
    }

    if (eventType === "payment.failed") {
      const payment = payload.payment.entity;
      const orderId = payment.order_id;

      await prisma.payment.updateMany({
        where: { razorpayOrderId: orderId, status: "PENDING" },
        data: { status: "FAILED" },
      });
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
