import { Metadata } from "next";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { SeatsPage } from "@/components/seats/seats-page";

export const metadata: Metadata = { title: "Seat Management" };

export default async function AdminSeatsPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "LIBRARY_ADMIN") redirect("/login");
  return <SeatsPage />;
}
