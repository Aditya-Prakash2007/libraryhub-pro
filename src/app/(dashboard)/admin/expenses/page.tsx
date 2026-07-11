import { Metadata } from "next";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AdminExpensesPage } from "@/components/workers/admin-expenses-page";

export const metadata: Metadata = { title: "Log Expense" };

export default async function AdminExpensesRoute() {
  const session = await auth();
  if (!session?.user || session.user.role !== "LIBRARY_ADMIN") redirect("/login");
  return <AdminExpensesPage />;
}
