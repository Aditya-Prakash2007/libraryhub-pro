// Student QR Code — returns student details when scanned
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ studentId: string }> }
) {
  try {
    const { studentId } = await params;

    const student = await prisma.student.findFirst({
      where: {
        OR: [
          { id: studentId },
          { studentId: studentId },
        ],
      },
      select: {
        id: true,
        studentId: true,
        fullName: true,
        phone: true,
        profilePhoto: true,
        status: true,
        paymentStatus: true,
        attendancePercentage: true,
        joiningDate: true,
        expiryDate: true,
        libraryId: true,
        seat: { select: { seatNumber: true, floor: true } },
        shift: { select: { name: true, startTime: true, endTime: true } },
        library: { select: { name: true } },
      },
    });

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    return NextResponse.json({ student });
  } catch (error) {
    console.error("QR student fetch error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
