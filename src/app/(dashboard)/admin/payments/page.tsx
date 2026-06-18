import { Metadata } from "next";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { PaymentsPage } from "@/components/payments/payments-page";

export const metadata: Metadata = { title: "Payments" };

export default async function AdminPaymentsPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "LIBRARY_ADMIN") redirect("/login");
  return <PaymentsPage />;
}
