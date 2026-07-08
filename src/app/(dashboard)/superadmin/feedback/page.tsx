import { Metadata } from "next";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { SuperAdminFeedbackClient } from "./feedback-client";

export const metadata: Metadata = { title: "Library Feedback" };

export default async function SuperAdminFeedbackPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "SUPER_ADMIN") redirect("/login");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Library Feedback</h1>
        <p className="text-muted-foreground mt-2">
          View feedback and feature requests from library owners.
        </p>
      </div>
      
      <SuperAdminFeedbackClient />
    </div>
  );
}
