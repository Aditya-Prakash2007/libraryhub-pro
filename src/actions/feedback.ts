"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

async function getAdminLibraryId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.libraryId ?? null;
}

export async function submitStudentFeedback(data: {
  studentId: string;
  libraryId: string;
  message: string;
}) {
  try {
    const feedback = await prisma.studentFeedback.create({ data });

    // Send auto-reply email to the student (non-blocking)
    const student = await prisma.student.findUnique({
      where: { id: data.studentId },
      select: {
        fullName: true,
        email: true,
        user: { select: { email: true } },
        library: { select: { name: true } },
      },
    });

    if (student) {
      const toEmail = student.user?.email || student.email;
      const libraryName = student.library?.name || "Your Library";
      if (toEmail) {
        const { sendFeedbackAutoReply } = await import("@/services/brevo");
        sendFeedbackAutoReply(toEmail, student.fullName, libraryName, data.message).catch(
          (e) => console.error("[Feedback auto-reply error]", e)
        );
      }
    }

    return { success: true, feedback };
  } catch (error) {
    console.error("Error submitting student feedback:", error);
    return { success: false, error: "Failed to submit feedback" };
  }
}

export async function getStudentFeedbackForLibrary(libraryId: string) {
  try {
    const feedback = await prisma.studentFeedback.findMany({
      where: { libraryId },
      include: {
        student: {
          select: {
            fullName: true,
            studentId: true,
            email: true,
            user: { select: { email: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    return { success: true, data: feedback };
  } catch (error) {
    console.error("Error fetching student feedback:", error);
    return { success: false, error: "Failed to fetch feedback" };
  }
}

export async function markStudentFeedbackAsRead(id: string) {
  try {
    await prisma.studentFeedback.update({
      where: { id },
      data: { isRead: true },
    });
    return { success: true };
  } catch (error) {
    console.error("Error updating student feedback:", error);
    return { success: false, error: "Failed to update feedback" };
  }
}

// Admin replies to a specific student feedback
export async function replyToStudentFeedback(id: string, replyMessage: string) {
  try {
    const libraryId = await getAdminLibraryId();
    if (!libraryId) return { success: false, error: "Unauthorized" };

    const feedback = await prisma.studentFeedback.findFirst({
      where: { id, libraryId },
      include: {
        student: {
          select: {
            fullName: true,
            email: true,
            user: { select: { email: true } },
          },
        },
        library: { select: { name: true } },
      },
    });
    if (!feedback) return { success: false, error: "Feedback not found" };

    await prisma.studentFeedback.update({
      where: { id },
      data: { adminReply: replyMessage, repliedAt: new Date(), isRead: true },
    });

    // Send reply email to student
    const toEmail = feedback.student.user?.email || feedback.student.email;
    const libraryName = feedback.library?.name || "Your Library";
    if (toEmail) {
      const { sendFeedbackReplyEmail } = await import("@/services/brevo");
      sendFeedbackReplyEmail(
        toEmail,
        feedback.student.fullName,
        libraryName,
        feedback.message,
        replyMessage
      ).catch((e) => console.error("[Feedback reply email error]", e));
    }

    revalidatePath("/admin/feedback");
    return { success: true };
  } catch (error) {
    console.error("Error replying to feedback:", error);
    return { success: false, error: "Failed to send reply" };
  }
}

export async function submitLibraryFeedback(data: {
  libraryId: string;
  featuresToImprove: string[];
  message?: string;
}) {
  try {
    const feedback = await prisma.libraryFeedback.create({ data });
    return { success: true, feedback };
  } catch (error) {
    console.error("Error submitting library feedback:", error);
    return { success: false, error: "Failed to submit feedback" };
  }
}

export async function getLibraryFeedbackForSuperAdmin() {
  try {
    const feedback = await prisma.libraryFeedback.findMany({
      include: {
        library: {
          select: {
            name: true,
            slug: true,
            admin: { select: { name: true, email: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    return { success: true, data: feedback };
  } catch (error) {
    console.error("Error fetching library feedback:", error);
    return { success: false, error: "Failed to fetch feedback" };
  }
}

export async function markLibraryFeedbackAsRead(id: string) {
  try {
    await prisma.libraryFeedback.update({ where: { id }, data: { isRead: true } });
    return { success: true };
  } catch (error) {
    console.error("Error updating library feedback:", error);
    return { success: false, error: "Failed to update feedback" };
  }
}
