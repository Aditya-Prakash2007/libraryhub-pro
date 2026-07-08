import { Metadata } from "next";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { StudentScanPage } from "@/components/attendance/student-scan-page";

export const metadata: Metadata = { title: "QR Check-In / Check-Out" };

export default async function StudentScanRoute({
  searchParams,
}: {
  searchParams: Promise<{ libraryId?: string }>;
}) {
  const session = await auth();
  const { libraryId } = await searchParams;

  if (!session?.user || session.user.role !== "STUDENT") {
    redirect(`/login?callbackUrl=/scan${libraryId ? `?libraryId=${libraryId}` : ""}`);
  }

  if (!libraryId) {
    redirect("/student/dashboard");
  }

  // Fetch library name for display
  const library = await prisma.library.findUnique({
    where: { id: libraryId },
    select: { name: true, id: true },
  });

  if (!library) {
    redirect("/student/dashboard");
  }

  // Get student name from session studentId
  const studentName = session.user.name ?? "Student";

  return (
    <StudentScanPage
      libraryId={library.id}
      libraryName={library.name}
      studentName={studentName}
    />
  );
}
