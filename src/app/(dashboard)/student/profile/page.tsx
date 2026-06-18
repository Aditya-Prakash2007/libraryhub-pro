import { Metadata } from "next";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { StudentProfilePage } from "@/components/students/student-profile-page";

export const metadata: Metadata = { title: "My Profile" };

export default async function StudentProfilePageRoute() {
  const session = await auth();
  if (!session?.user || session.user.role !== "STUDENT") redirect("/login");

  const student = session.user.studentId
    ? await prisma.student.findUnique({
        where: { id: session.user.studentId },
        include: {
          seat: true,
          shift: true,
          documents: true,
          library: { select: { name: true, logo: true, primaryColor: true } },
        },
      })
    : null;

  return <StudentProfilePage student={student} />;
}
