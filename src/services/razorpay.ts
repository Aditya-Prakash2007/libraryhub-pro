// Server-side Razorpay service
import Razorpay from "razorpay";
import crypto from "crypto";

export function getRazorpayInstance() {
  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID!,
    key_secret: process.env.RAZORPAY_KEY_SECRET!,
  });
}

export async function createOrder(amount: number, receipt: string, notes: Record<string, string> = {}) {
  const razorpay = getRazorpayInstance();
  return razorpay.orders.create({
    amount: Math.round(amount * 100), // Rupees to paise
    currency: "INR",
    receipt,
    notes,
  });
}

export function verifyPaymentSignature(
  orderId: string,
  paymentId: string,
  signature: string
): boolean {
  const body = `${orderId}|${paymentId}`;
  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
    .update(body)
    .digest("hex");
  return expectedSignature === signature;
}

export function verifyWebhookSignature(body: string, signature: string): boolean {
  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
    .update(body)
    .digest("hex");
  return expectedSignature === signature;
}

export async function fetchPayment(paymentId: string) {
  const razorpay = getRazorpayInstance();
  return razorpay.payments.fetch(paymentId);
}

export async function refundPayment(paymentId: string, amount?: number) {
  const razorpay = getRazorpayInstance();
  if (amount) {
    return razorpay.payments.refund(paymentId, { amount: Math.round(amount * 100) });
  }
  return razorpay.payments.refund(paymentId, { amount: 0 });
}
