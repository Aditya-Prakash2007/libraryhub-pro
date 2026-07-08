"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

import type { AttendanceStatus } from "@prisma/client";

async function getAdminLibraryId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.libraryId ?? null;
}

// Mark attendance
export async function markAttendance(data: {
  studentId: string;
  date: string;
  shiftId?: string;
  checkInTime?: string;
  checkOutTime?: string;
  status: AttendanceStatus;
  notes?: string;
  markedViaQR?: boolean;
}) {
  try {
    const session = await auth();
    if (!session?.user) return { error: "Unauthorized" };

    const libraryId = session.user.libraryId;
    if (!libraryId) return { error: "Library not found" };

    const attendanceDate = new Date(data.date);
    attendanceDate.setHours(0, 0, 0, 0);

    const attendance = await prisma.attendance.upsert({
      where: {
        studentId_date_shiftId: {
          studentId: data.studentId,
          date: attendanceDate,
          shiftId: data.shiftId ?? "",
        },
      },
      update: {
        checkInTime: data.checkInTime
          ? new Date(`${data.date}T${data.checkInTime}`)
          : undefined,
        checkOutTime: data.checkOutTime
          ? new Date(`${data.date}T${data.checkOutTime}`)
          : undefined,
        status: data.status,
        notes: data.notes,
        markedBy: session.user.id,
        markedViaQR: data.markedViaQR ?? false,
      },
      create: {
        studentId: data.studentId,
        libraryId,
        shiftId: data.shiftId ?? null,
        date: attendanceDate,
        checkInTime: data.checkInTime
          ? new Date(`${data.date}T${data.checkInTime}`)
          : undefined,
        checkOutTime: data.checkOutTime
          ? new Date(`${data.date}T${data.checkOutTime}`)
          : undefined,
        status: data.status,
        notes: data.notes,
        markedBy: session.user.id,
        markedViaQR: data.markedViaQR ?? false,
      },
    });

    await updateStudentAttendanceStats(data.studentId);

    revalidatePath("/admin/attendance");
    return { success: true, attendance };
  } catch (error) {
    console.error("Mark attendance error:", error);
    return { error: "Failed to mark attendance" };
  }
}

// Mark attendance via QR scan
export async function markAttendanceByQR(studentId: string) {
  try {
    const session = await auth();
    if (!session?.user) return { error: "Unauthorized" };

    const libraryId = session.user.libraryId;
    if (!libraryId) return { error: "Library not found" };

    const student = await prisma.student.findFirst({
      where: { id: studentId, libraryId },
      include: { shift: true },
    });

    if (!student) return { error: "Student not found" };
    if (student.status !== "ACTIVE") return { error: "Student account is not active" };

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const now = new Date();

    const existing = await prisma.attendance.findFirst({
      where: {
        studentId,
        date: { gte: today },
        shiftId: student.shiftId,
      },
    });

    if (existing) {
      if (existing.checkInTime && !existing.checkOutTime) {
        await prisma.attendance.update({
          where: { id: existing.id },
          data: { checkOutTime: now },
        });
        return { success: true, action: "checkout", student };
      }
      return { success: false, error: "Attendance already marked for today" };
    }

    await prisma.attendance.create({
      data: {
        studentId,
        libraryId,
        shiftId: student.shiftId,
        date: today,
        checkInTime: now,
        status: "PRESENT",
        markedBy: session.user.id,
        markedViaQR: true,
      },
    });

    await updateStudentAttendanceStats(studentId);

    return { success: true, action: "checkin", student };
  } catch (error) {
    console.error("Mark attendance by QR error:", error);
    return { error: "Failed to mark attendance" };
  }
}

// Update student attendance statistics
async function updateStudentAttendanceStats(studentId: string) {
  try {
    const allRecords = await prisma.attendance.findMany({
      where: { studentId },
      select: { status: true, date: true },
      orderBy: { date: "desc" },
    });

    const totalDays = allRecords.length;
    const presentDays = allRecords.filter(
      (r) => r.status === "PRESENT" || r.status === "LATE"
    ).length;

    const percentage =
      totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0;

    // Calculate current streak
    let currentStreak = 0;
    const checkDate = new Date();
    checkDate.setHours(0, 0, 0, 0);

    for (const record of allRecords) {
      const recordDate = new Date(record.date);
      recordDate.setHours(0, 0, 0, 0);

      if (recordDate.getTime() !== checkDate.getTime()) break;

      if (record.status === "PRESENT" || record.status === "LATE") {
        currentStreak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }

    const student = await prisma.student.findUnique({
      where: { id: studentId },
      select: { longestStreak: true },
    });

    const longestStreak = Math.max(
      currentStreak,
      student?.longestStreak ?? 0
    );

    await prisma.student.update({
      where: { id: studentId },
      data: {
        attendancePercentage: percentage,
        totalPresent: presentDays,
        totalAbsent: totalDays - presentDays,
        currentStreak,
        longestStreak,
        lastAttendanceDate: allRecords[0]?.date ?? null,
      },
    });
  } catch (error) {
    console.error("Update attendance stats error:", error);
  }
}

// Get attendance for a specific date
export async function getAttendance(params: {
  date?: string;
  shiftId?: string;
  status?: string;
}) {
  try {
    const libraryId = await getAdminLibraryId();
    if (!libraryId) return { error: "Unauthorized" };

    const date = params.date ? new Date(params.date) : new Date();
    date.setHours(0, 0, 0, 0);
    const dateEnd = new Date(date);
    dateEnd.setHours(23, 59, 59, 999);

    const records = await prisma.attendance.findMany({
      where: {
        libraryId,
        date: { gte: date, lte: dateEnd },
        ...(params.shiftId &&
          params.shiftId !== "all" && { shiftId: params.shiftId }),
        ...(params.status &&
          params.status !== "all" && {
            status: params.status as AttendanceStatus,
          }),
      },
      include: {
        student: {
          select: {
            id: true,
            fullName: true,
            studentId: true,
            profilePhoto: true,
            seatId: true,
          },
        },
        shift: { select: { name: true } },
      },
      orderBy: { checkInTime: "desc" },
    });

    return { records };
  } catch (error) {
    console.error("Get attendance error:", error);
    return { error: "Failed to fetch attendance" };
  }
}

// Get attendance report for a student
export async function getStudentAttendanceReport(
  studentId: string,
  month?: number,
  year?: number
) {
  try {
    const session = await auth();
    if (!session?.user) return { error: "Unauthorized" };

    const now = new Date();
    const targetMonth = month ?? now.getMonth();
    const targetYear = year ?? now.getFullYear();

    const startDate = new Date(targetYear, targetMonth, 1);
    const endDate = new Date(targetYear, targetMonth + 1, 0);

    const records = await prisma.attendance.findMany({
      where: {
        studentId,
        date: { gte: startDate, lte: endDate },
      },
      orderBy: { date: "asc" },
    });

    const total = records.length;
    const present = records.filter((r) => r.status === "PRESENT").length;
    const absent = records.filter((r) => r.status === "ABSENT").length;
    const late = records.filter((r) => r.status === "LATE").length;
    const halfDay = records.filter((r) => r.status === "HALF_DAY").length;

    const summary = { total, present, absent, late, halfDay };

    return { records, summary };
  } catch (error) {
    console.error("Get student attendance report error:", error);
    return { error: "Failed to fetch attendance report" };
  }
}

// Mark attendance via QR scan — called from student's OWN session
export async function markAttendanceByQRStudent(libraryId: string) {
  try {
    const session = await auth();
    if (!session?.user) return { error: "Unauthorized" };
    if (session.user.role !== "STUDENT") return { error: "Students only" };

    const studentId = session.user.studentId;
    if (!studentId) return { error: "Student profile not found" };

    // Verify this student belongs to this library
    const student = await prisma.student.findFirst({
      where: { id: studentId, libraryId },
      include: { shift: true },
    });

    if (!student) return { error: "Student not found in this library" };
    if (student.status !== "ACTIVE") return { error: "Your account is not active" };

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const now = new Date();

    const existing = await prisma.attendance.findFirst({
      where: {
        studentId,
        date: { gte: today },
        shiftId: student.shiftId,
      },
    });

    if (existing) {
      if (existing.checkInTime && !existing.checkOutTime) {
        // Second scan = Check-Out
        await prisma.attendance.update({
          where: { id: existing.id },
          data: { checkOutTime: now },
        });
        revalidatePath("/student/attendance");
        return {
          success: true,
          action: "checkout",
          checkInTime: existing.checkInTime,
          checkOutTime: now,
          student: { fullName: student.fullName, studentId: student.studentId },
        };
      }
      return { success: false, error: "Attendance already fully recorded for today" };
    }

    // First scan = Check-In
    await prisma.attendance.create({
      data: {
        studentId,
        libraryId,
        shiftId: student.shiftId,
        date: today,
        checkInTime: now,
        status: "PRESENT",
        markedBy: session.user.id,
        markedViaQR: true,
      },
    });

    await updateStudentAttendanceStats(studentId);
    revalidatePath("/student/attendance");

    return {
      success: true,
      action: "checkin",
      checkInTime: now,
      checkOutTime: null,
      student: { fullName: student.fullName, studentId: student.studentId },
    };
  } catch (error) {
    console.error("Student QR attendance error:", error);
    return { error: "Failed to mark attendance" };
  }
}

// Get last 7 days attendance for a student (student-facing)
export async function getWeeklyAttendance(studentId?: string) {
  try {
    const session = await auth();
    if (!session?.user) return { error: "Unauthorized" };

    const targetStudentId = studentId ?? session.user.studentId;
    if (!targetStudentId) return { error: "Student not found" };

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const records = await prisma.attendance.findMany({
      where: {
        studentId: targetStudentId,
        date: { gte: sevenDaysAgo },
      },
      orderBy: { date: "desc" },
      include: { shift: { select: { name: true } } },
    });

    return { records };
  } catch (error) {
    console.error("Get weekly attendance error:", error);
    return { error: "Failed to fetch weekly attendance" };
  }
}

// Cron: Delete attendance records older than 7 days
export async function cleanOldAttendanceRecords() {
  try {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 7);
    cutoff.setHours(0, 0, 0, 0);

    const result = await prisma.attendance.deleteMany({
      where: { date: { lt: cutoff } },
    });

    console.log(`[Cron] Deleted ${result.count} attendance records older than 7 days`);
    return { success: true, deletedCount: result.count };
  } catch (error) {
    console.error("Clean old attendance error:", error);
    return { error: "Failed to clean attendance records", deletedCount: 0 };
  }
}
