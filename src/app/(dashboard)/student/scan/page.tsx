import { Metadata } from "next";
import { StudentSelfScanner } from "@/components/attendance/student-self-scanner";
import { PageHeader } from "@/components/shared/page-header";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Scan Attendance",
};

export default async function StudentScanPage() {
  const session = await auth();
  if (!session?.user || !session.user.studentId) redirect("/login");
  
  const student = await prisma.student.findUnique({
    where: { id: session.user.studentId as string },
    select: { libraryId: true }
  });

  if (!student) redirect("/login");

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Mark Attendance" 
        description="Scan the library's QR code to mark your attendance in and out." 
      />
      <div className="bg-background rounded-xl p-4 md:p-8">
        <StudentSelfScanner libraryId={student.libraryId} />
      </div>
    </div>
  );
}
