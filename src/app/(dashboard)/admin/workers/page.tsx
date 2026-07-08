import { Metadata } from "next";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { WorkersPage } from "@/components/workers/workers-page";

export const metadata: Metadata = { title: "Team Members" };

export default async function AdminWorkersPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "LIBRARY_ADMIN") redirect("/login");
  return <WorkersPage />;
}
