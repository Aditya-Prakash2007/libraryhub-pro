import { Metadata } from "next";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { StudentDashboard } from "@/components/dashboard/student-dashboard";

export const metadata: Metadata = { title: "My Dashboard" };

export default async function StudentDashboardPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "STUDENT") redirect("/login");

  const student = session.user.studentId
    ? await prisma.student.findUnique({
        where: { id: session.user.studentId },
        include: {
          seat: true,
          shift: true,
          payments: { orderBy: { createdAt: "desc" }, take: 5 },
          attendance: { orderBy: { date: "desc" }, take: 30 },
          notifications: { where: { isRead: false }, take: 5 },
        },
      })
    : null;

  return <StudentDashboard student={student} />;
}
