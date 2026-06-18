import { Metadata } from "next";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ReportsPage } from "@/components/analytics/reports-page";

export const metadata: Metadata = { title: "Reports & Analytics" };

export default async function AdminReportsPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "LIBRARY_ADMIN") redirect("/login");
  return <ReportsPage />;
}
