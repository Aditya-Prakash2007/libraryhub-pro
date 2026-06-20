import { Metadata } from "next";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { StudentQRCardPage } from "@/components/students/student-qr-card";

export const metadata: Metadata = { title: "My QR Card" };

export default async function StudentQRPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "STUDENT") redirect("/login");

  const student = session.user.studentId
    ? await prisma.student.findUnique({
        where: { id: session.user.studentId },
        include: {
          seat: { select: { seatNumber: true, floor: true } },
          shift: { select: { name: true, startTime: true, endTime: true } },
          library: { select: { name: true, logo: true, primaryColor: true } },
        },
      })
    : null;

  return <StudentQRCardPage student={student} />;
}
