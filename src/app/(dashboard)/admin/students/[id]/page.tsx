import { Metadata } from "next";
import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { StudentDetailPage } from "@/components/students/student-detail-page";

export const metadata: Metadata = { title: "Student Details" };

export default async function AdminStudentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user || session.user.role !== "LIBRARY_ADMIN") redirect("/login");

  const { id } = await params;

  const student = await prisma.student.findFirst({
    where: { id, libraryId: session.user.libraryId! },
    include: {
      seat: true,
      shift: true,
      payments: { orderBy: { createdAt: "desc" }, take: 20 },
      invoices: { orderBy: { createdAt: "desc" }, take: 20 },
      attendance: { orderBy: { date: "desc" }, take: 60 },
      documents: true,
    },
  });

  if (!student) notFound();

  return <StudentDetailPage student={student} />;
}
