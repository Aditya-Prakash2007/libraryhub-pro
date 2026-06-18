import { Metadata } from "next";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getDashboardStats } from "@/actions/students";
import { AdminDashboard } from "@/components/dashboard/admin-dashboard";

export const metadata: Metadata = { title: "Dashboard" };

export default async function AdminDashboardPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "LIBRARY_ADMIN") redirect("/login");

  const stats = await getDashboardStats();

  return <AdminDashboard stats={"error" in stats ? null : stats} />;
}
