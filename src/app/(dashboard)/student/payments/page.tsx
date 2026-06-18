import { Metadata } from "next";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { StudentPaymentsPage } from "@/components/payments/student-payments-page";

export const metadata: Metadata = { title: "My Payments" };

export default async function StudentPaymentsPageRoute() {
  const session = await auth();
  if (!session?.user || session.user.role !== "STUDENT") redirect("/login");

  const payments = session.user.studentId
    ? await prisma.payment.findMany({
        where: { studentId: session.user.studentId },
        include: { invoice: true },
        orderBy: { createdAt: "desc" },
      })
    : [];

  const student = session.user.studentId
    ? await prisma.student.findUnique({
        where: { id: session.user.studentId },
        select: {
          id: true, fullName: true, monthlyFee: true,
          paymentStatus: true, expiryDate: true, libraryId: true,
          library: { select: { name: true } },
        },
      })
    : null;

  return <StudentPaymentsPage payments={payments} student={student} />;
}
