"use server";

import { prisma } from "@/lib/prisma";

export async function submitStudentFeedback(data: {
  studentId: string;
  libraryId: string;
  message: string;
}) {
  try {
    const feedback = await prisma.studentFeedback.create({
      data,
    });
    
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
          }
        }
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

export async function submitLibraryFeedback(data: {
  libraryId: string;
  featuresToImprove: string[];
  message?: string;
}) {
  try {
    const feedback = await prisma.libraryFeedback.create({
      data,
    });
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
            admin: {
              select: {
                name: true,
                email: true,
              }
            }
          }
        }
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
    await prisma.libraryFeedback.update({
      where: { id },
      data: { isRead: true },
    });
    return { success: true };
  } catch (error) {
    console.error("Error updating library feedback:", error);
    return { success: false, error: "Failed to update feedback" };
  }
}

