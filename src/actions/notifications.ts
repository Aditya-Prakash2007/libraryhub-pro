"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import type { NotificationFormData } from "@/schemas";

async function getAdminLibraryId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.libraryId ?? null;
}

// Send notification
export async function sendNotification(data: NotificationFormData) {
  try {
    const session = await auth();
    if (!session?.user) return { error: "Unauthorized" };

    const libraryId = session.user.libraryId;
    if (!libraryId) return { error: "Library not found" };

    let targetStudents: { userId: string; id: string }[] = [];

    if (data.targetAll) {
      const students = await prisma.student.findMany({
        where: { libraryId, status: "ACTIVE", userId: { not: null } },
        select: { userId: true, id: true },
      });
      targetStudents = students
        .filter((s): s is typeof s & { userId: string } => s.userId !== null);
    } else if (data.studentIds && data.studentIds.length > 0) {
      const students = await prisma.student.findMany({
        where: { id: { in: data.studentIds }, libraryId, userId: { not: null } },
        select: { userId: true, id: true },
      });
      targetStudents = students
        .filter((s): s is typeof s & { userId: string } => s.userId !== null);
    }

    if (targetStudents.length === 0) {
      return { error: "No target recipients found" };
    }

    await prisma.notification.createMany({
      data: targetStudents.map((student) => ({
        userId: student.userId,
        studentId: student.id,
        libraryId,
        title: data.title,
        message: data.message,
        type: data.type as "ANNOUNCEMENT" | "REMINDER" | "SYSTEM" | "FEE_DUE" | "FEE_OVERDUE",
        channel: "IN_APP" as const,
        scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : null,
        sentAt: !data.scheduledAt ? new Date() : null,
      })),
    });

    revalidatePath("/admin/notifications");
    return { success: true, count: targetStudents.length };
  } catch (error) {
    console.error("Send notification error:", error);
    return { error: "Failed to send notification" };
  }
}

// Get notifications for user
export async function getUserNotifications(userId?: string) {
  try {
    const session = await auth();
    const targetUserId = userId || session?.user?.id;
    if (!targetUserId) return { error: "Unauthorized" };

    const notifications = await prisma.notification.findMany({
      where: { userId: targetUserId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    const unreadCount = notifications.filter((n) => !n.isRead).length;

    return { notifications, unreadCount };
  } catch (error) {
    console.error("Get notifications error:", error);
    return { error: "Failed to fetch notifications" };
  }
}

// Mark notification as read
export async function markNotificationRead(id: string) {
  try {
    const session = await auth();
    if (!session?.user) return { error: "Unauthorized" };

    await prisma.notification.update({
      where: { id, userId: session.user.id },
      data: { isRead: true, readAt: new Date() },
    });

    revalidatePath("/admin/notifications");
    revalidatePath("/student/notifications");
    return { success: true };
  } catch (error) {
    console.error("Mark notification read error:", error);
    return { error: "Failed to mark as read" };
  }
}

// Mark all notifications as read
export async function markAllNotificationsRead() {
  try {
    const session = await auth();
    if (!session?.user) return { error: "Unauthorized" };

    await prisma.notification.updateMany({
      where: { userId: session.user.id, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });

    revalidatePath("/student/notifications");
    revalidatePath("/admin/notifications");
    return { success: true };
  } catch (error) {
    console.error("Mark all notifications read error:", error);
    return { error: "Failed to mark notifications as read" };
  }
}

// Auto send fee reminders
export async function sendFeeReminders() {
  try {
    const now = new Date();
    const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const soonToExpire = await prisma.student.findMany({
      where: {
        status: "ACTIVE",
        paymentStatus: { in: ["PENDING", "OVERDUE"] },
        expiryDate: { gte: now, lte: in7Days },
        userId: { not: null },
      },
      select: {
        id: true,
        userId: true,
        fullName: true,
        expiryDate: true,
        libraryId: true,
      },
    });

    const notificationData = soonToExpire
      .filter((s): s is typeof s & { userId: string; expiryDate: Date } =>
        s.userId !== null && s.expiryDate !== null)
      .map((student) => {
        const daysLeft = Math.ceil(
          (student.expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        );

        let title = "Fee Reminder";
        let message = `Your library membership expires in ${daysLeft} days. Please renew to continue.`;
        const type: "FEE_DUE" | "FEE_OVERDUE" = "FEE_DUE";

        if (daysLeft <= 1) {
          title = "Last Day - Fee Due Today!";
          message = "Your library membership expires today. Renew immediately to avoid suspension.";
        } else if (daysLeft <= 3) {
          title = "Fee Due in 3 Days";
          message = `Your membership expires in ${daysLeft} days. Renew soon.`;
        }

        return {
          userId: student.userId,
          studentId: student.id,
          libraryId: student.libraryId,
          title,
          message,
          type,
          channel: "IN_APP" as const,
          sentAt: new Date(),
        };
      });

    if (notificationData.length > 0) {
      await prisma.notification.createMany({
        data: notificationData,
      });
    }

    return { success: true, sent: notificationData.length };
  } catch (error) {
    console.error("Send fee reminders error:", error);
    return { error: "Failed to send reminders" };
  }
}
