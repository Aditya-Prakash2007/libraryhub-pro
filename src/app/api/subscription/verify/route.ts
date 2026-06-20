import { NextRequest, NextResponse } from "next/server";
import { verifySubscriptionPayment } from "@/actions/subscription";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = await verifySubscriptionPayment({
      razorpay_payment_id: body.razorpay_payment_id,
      razorpay_order_id: body.razorpay_order_id,
      razorpay_signature: body.razorpay_signature,
      libraryId: body.libraryId,
      months: body.months,
      planId: body.planId ?? "MONTHLY",
    });

    if ("error" in result) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Subscription verify route error:", error);
    return NextResponse.json({ success: false, error: "Internal error" }, { status: 500 });
  }
}
