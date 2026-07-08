import { Metadata } from "next";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AttendancePage } from "@/components/attendance/attendance-page";

export const metadata: Metadata = { title: "Attendance" };

export default async function AdminAttendancePage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "LIBRARY_ADMIN") redirect("/login");
  return <AttendancePage libraryId={session.user.libraryId ?? ""} />;
}
