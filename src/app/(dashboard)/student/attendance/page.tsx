import { Metadata } from "next";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { StudentAttendancePage } from "@/components/attendance/student-attendance-page";

export const metadata: Metadata = { title: "My Attendance" };

export default async function StudentAttendancePageRoute() {
  const session = await auth();
  if (!session?.user || session.user.role !== "STUDENT") redirect("/login");

  const student = session.user.studentId
    ? await prisma.student.findUnique({
        where: { id: session.user.studentId },
        select: {
          id: true, fullName: true, studentId: true,
          attendancePercentage: true, totalPresent: true, totalAbsent: true,
          currentStreak: true, longestStreak: true,
        },
      })
    : null;

  const attendance = session.user.studentId
    ? await prisma.attendance.findMany({
        where: { studentId: session.user.studentId },
        orderBy: { date: "desc" },
        take: 90,
        include: { shift: { select: { name: true } } },
      })
    : [];

  return <StudentAttendancePage student={student} attendance={attendance} />;
}
