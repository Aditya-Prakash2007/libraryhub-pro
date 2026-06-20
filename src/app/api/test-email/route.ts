// Test route — only for development. Remove in production.
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available in production" }, { status: 404 });
  }

  const { sendPasswordResetOTP } = await import("@/services/brevo");
  const to = req.nextUrl.searchParams.get("to") || process.env.BREVO_SENDER_EMAIL || "";

  if (!to) {
    return NextResponse.json({ error: "Provide ?to=email@example.com" }, { status: 400 });
  }

  console.log(`[test-email] Testing email send to: ${to}`);
  console.log(`[test-email] BREVO_API_KEY present: ${!!process.env.BREVO_API_KEY}`);
  console.log(`[test-email] BREVO_SENDER_EMAIL: ${process.env.BREVO_SENDER_EMAIL}`);

  const result = await sendPasswordResetOTP(to, "Test User", "123456");

  return NextResponse.json({
    success: result.success,
    error: result.error,
    config: {
      apiKeyPresent: !!process.env.BREVO_API_KEY,
      senderEmail: process.env.BREVO_SENDER_EMAIL,
      senderName: process.env.BREVO_SENDER_NAME,
    },
  });
}
