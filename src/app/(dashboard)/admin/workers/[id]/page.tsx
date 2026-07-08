import { Metadata } from "next";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { WorkerDetailPage } from "@/components/workers/worker-detail-page";

export const metadata: Metadata = { title: "Worker Details" };

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminWorkerDetailPage({ params }: PageProps) {
  const session = await auth();
  if (!session?.user || session.user.role !== "LIBRARY_ADMIN") redirect("/login");
  
  const { id } = await params;
  return <WorkerDetailPage workerId={id} />;
}
