import { Metadata } from "next";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { AdminFeedbackClient } from "./feedback-client";

export const metadata: Metadata = { title: "Feedback Management" };

export default async function AdminFeedbackPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "LIBRARY_ADMIN") redirect("/login");

  const libraryId = session.user.libraryId;
  
  if (!libraryId) {
    return <div>Library not found.</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Feedback</h1>
        <p className="text-muted-foreground mt-2">
          View feedback from your students and send your own feedback to the Super Admin.
        </p>
      </div>
      
      <AdminFeedbackClient libraryId={libraryId} />
    </div>
  );
}
