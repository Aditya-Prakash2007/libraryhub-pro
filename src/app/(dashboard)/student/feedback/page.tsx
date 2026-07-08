import { Metadata } from "next";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { StudentFeedbackClient } from "./feedback-client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare } from "lucide-react";

export const metadata: Metadata = { title: "Feedback" };

export default async function StudentFeedbackPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "STUDENT") redirect("/login");

  const student = session.user.studentId
    ? await prisma.student.findUnique({
        where: { id: session.user.studentId },
        select: { id: true, libraryId: true }
      })
    : null;

  if (!student) {
    return <div>Student profile not found.</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Feedback</h1>
        <p className="text-muted-foreground mt-2">
          Send feedback directly to your library owner.
        </p>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            Write Feedback
          </CardTitle>
          <CardDescription>
            Let us know what you think about the facilities, or if you have any suggestions.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <StudentFeedbackClient 
            studentId={student.id} 
            libraryId={student.libraryId} 
          />
        </CardContent>
      </Card>
    </div>
  );
}
