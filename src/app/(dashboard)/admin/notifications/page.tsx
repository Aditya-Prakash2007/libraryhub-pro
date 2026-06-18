import { Metadata } from "next";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AdminNotificationsPage } from "@/components/notifications/admin-notifications-page";

export const metadata: Metadata = { title: "Notifications" };

export default async function AdminNotificationsPageRoute() {
  const session = await auth();
  if (!session?.user || session.user.role !== "LIBRARY_ADMIN") redirect("/login");
  return <AdminNotificationsPage />;
}
