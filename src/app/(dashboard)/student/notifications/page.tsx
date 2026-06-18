import { Metadata } from "next";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { StudentNotificationsPage } from "@/components/notifications/student-notifications-page";

export const metadata: Metadata = { title: "Notifications" };

export default async function StudentNotificationsPageRoute() {
  const session = await auth();
  if (!session?.user || session.user.role !== "STUDENT") redirect("/login");
  return <StudentNotificationsPage />;
}
