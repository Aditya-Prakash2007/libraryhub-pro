import { Metadata } from "next";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { StudentsPage } from "@/components/students/students-page";

export const metadata: Metadata = { title: "Students" };

export default async function AdminStudentsPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "LIBRARY_ADMIN") redirect("/login");
  return <StudentsPage />;
}
