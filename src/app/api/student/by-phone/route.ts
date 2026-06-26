// Find student by phone number for public payment page
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const phone = req.nextUrl.searchParams.get("phone");
    const libraryId = req.nextUrl.searchParams.get("libraryId");

    if (!phone || !libraryId) {
      return NextResponse.json({ error: "phone and libraryId required" }, { status: 400 });
    }

    const student = await prisma.student.findFirst({
      where: {
        libraryId,
        OR: [
          { phone: phone },
          { whatsappNumber: phone },
          { phone: `+91${phone}` },
          { phone: `91${phone}` },
        ],
        status: "ACTIVE",
      },
      select: {
        id: true,
        studentId: true,
        fullName: true,
        phone: true,
        monthlyFee: true,
        discountAmount: true,
        paymentStatus: true,
        totalDueAmount: true,
        seat: { select: { seatNumber: true } },
        shift: { select: { name: true } },
      },
    });

    if (!student) {
      return NextResponse.json({ student: null });
    }

    // Calculate actual monthly fee after discount
    const actualFee = Math.max(0, student.monthlyFee - (student.discountAmount || 0));

    return NextResponse.json({
      student: { ...student, monthlyFee: actualFee },
    });
  } catch (error) {
    console.error("Student by phone error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
