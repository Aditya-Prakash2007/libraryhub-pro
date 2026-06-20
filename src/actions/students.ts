"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateStudentId } from "@/lib/utils";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { sendWelcomeEmail } from "@/services/brevo";
import type { StudentFormData } from "@/schemas";

async function getAdminLibraryId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.libraryId ?? null;
}

// Get all students for the library
export async function getStudents(params?: {
  search?: string;
  status?: string;
  shiftId?: string;
  paymentStatus?: string;
  page?: number;
  limit?: number;
}) {
  try {
    const libraryId = await getAdminLibraryId();
    if (!libraryId) return { error: "Unauthorized" };

    const { search = "", status = "all", shiftId = "all", paymentStatus = "all", page = 1, limit = 20 } = params || {};

    const where = {
      libraryId,
      ...(search && {
        OR: [
          { fullName: { contains: search, mode: "insensitive" as const } },
          { email: { contains: search, mode: "insensitive" as const } },
          { phone: { contains: search } },
          { studentId: { contains: search, mode: "insensitive" as const } },
        ],
      }),
      ...(status !== "all" && { status: status as "ACTIVE" | "INACTIVE" | "SUSPENDED" | "PENDING_VERIFICATION" }),
      ...(shiftId !== "all" && { shiftId }),
      ...(paymentStatus !== "all" && { paymentStatus: paymentStatus as "PENDING" | "PAID" | "OVERDUE" | "FAILED" | "REFUNDED" | "PARTIAL" }),
    };

    const [students, total] = await prisma.$transaction([
      prisma.student.findMany({
        where,
        include: {
          seat: { select: { seatNumber: true } },
          shift: { select: { name: true, startTime: true, endTime: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.student.count({ where }),
    ]);

    return { students, total, pages: Math.ceil(total / limit), page };
  } catch (error) {
    console.error("Get students error:", error);
    return { error: "Failed to fetch students" };
  }
}

// Get single student
export async function getStudent(id: string) {
  try {
    const session = await auth();
    if (!session?.user) return { error: "Unauthorized" };

    // Admin can view any student in their library, student can view only themselves
    const libraryId = session.user.libraryId;
    if (!libraryId) return { error: "Library not found" };

    const student = await prisma.student.findFirst({
      where: { id, libraryId },
      include: {
        seat: true,
        shift: true,
        payments: { orderBy: { createdAt: "desc" }, take: 10 },
        attendance: { orderBy: { date: "desc" }, take: 30 },
        documents: true,
        notifications: { orderBy: { createdAt: "desc" }, take: 10 },
      },
    });

    if (!student) return { error: "Student not found" };
    return { student };
  } catch (error) {
    console.error("Get student error:", error);
    return { error: "Failed to fetch student" };
  }
}

// Create student — also creates a User account so student can login
export async function createStudent(data: StudentFormData) {
  try {
    const session = await auth();
    if (!session?.user?.libraryId) return { error: "Unauthorized" };

    const libraryId = session.user.libraryId;

    const library = await prisma.library.findUnique({
      where: { id: libraryId },
      select: { slug: true, name: true },
    });
    if (!library) return { error: "Library not found" };

    // Check duplicate email in this library
    const existingStudent = await prisma.student.findFirst({
      where: { email: data.email, libraryId },
    });
    if (existingStudent) return { error: "A student with this email already exists" };

    // Check if user account with this email exists
    const existingUser = await prisma.user.findUnique({ where: { email: data.email } });
    if (existingUser && existingUser.role !== "STUDENT") {
      return { error: "This email is already registered as an admin account" };
    }

    // Generate student ID
    const count = await prisma.student.count({ where: { libraryId } });
    const studentId = generateStudentId(library.slug, count + 1);

    // Check if seat is available
    if (data.seatId) {
      const seat = await prisma.seat.findFirst({
        where: { id: data.seatId, libraryId, status: "AVAILABLE" },
      });
      if (!seat) return { error: "Selected seat is not available" };
    }

    // Default password = phone number (student can change via forgot password)
    const defaultPassword = data.phone.replace(/\D/g, "").slice(-10);
    const hashedPassword = await bcrypt.hash(defaultPassword, 12);

    const student = await prisma.$transaction(async (tx) => {
      // Create or reuse user account
      let userId: string;

      if (existingUser) {
        userId = existingUser.id;
      } else {
        const newUser = await tx.user.create({
          data: {
            name: data.fullName,
            email: data.email,
            password: hashedPassword,
            role: "STUDENT",
            status: "ACTIVE",
            phone: data.phone,
            emailVerified: new Date(),
          },
        });
        userId = newUser.id;
      }

      const newStudent = await tx.student.create({
        data: {
          studentId,
          userId,
          libraryId,
          fullName: data.fullName,
          fatherName: data.fatherName || null,
          motherName: data.motherName || null,
          email: data.email,
          phone: data.phone,
          whatsappNumber: data.whatsappNumber || null,
          emergencyContact: data.emergencyContact || null,
          address: data.address || null,
          city: data.city || null,
          state: data.state || null,
          pincode: data.pincode || null,
          gender: data.gender || null,
          occupation: data.occupation || null,
          institution: data.institution || null,
          seatId: data.seatId || null,
          shiftId: data.shiftId || null,
          joiningDate: data.joiningDate ? new Date(data.joiningDate) : new Date(),
          expiryDate: data.expiryDate ? new Date(data.expiryDate) : null,
          monthlyFee: data.monthlyFee,
          depositAmount: data.depositAmount || 0,
          discountAmount: data.discountAmount || 0,
          notes: data.notes || null,
          // Auto-calculate next due date
          nextDueDate: data.joiningDate
            ? (() => { const d = new Date(data.joiningDate); d.setMonth(d.getMonth() + 1); return d; })()
            : (() => { const d = new Date(); d.setMonth(d.getMonth() + 1); return d; })(),
        },
      });

      // Update seat status
      if (data.seatId) {
        await tx.seat.update({ where: { id: data.seatId }, data: { status: "OCCUPIED" } });
      }

      // Log activity
      await tx.activityLog.create({
        data: {
          userId: session.user.id,
          libraryId,
          studentId: newStudent.id,
          type: "STUDENT_CREATED",
          description: `New student ${newStudent.fullName} (${studentId}) added`,
        },
      });

      return newStudent;
    });

    // Send welcome email with login info
    await sendWelcomeEmail(
      data.email,
      data.fullName,
      library.name
    ).catch(() => {});

    revalidatePath("/admin/students");
    return { success: true, student };
  } catch (error) {
    console.error("Create student error:", error);
    return { error: "Failed to create student" };
  }
}

// Update student
export async function updateStudent(id: string, data: Partial<StudentFormData>) {
  try {
    const libraryId = await getAdminLibraryId();
    if (!libraryId) return { error: "Unauthorized" };

    const existing = await prisma.student.findFirst({ where: { id, libraryId } });
    if (!existing) return { error: "Student not found" };

    if (data.seatId && data.seatId !== existing.seatId) {
      const newSeat = await prisma.seat.findFirst({
        where: { id: data.seatId, libraryId, status: "AVAILABLE" },
      });
      if (!newSeat) return { error: "Selected seat is not available" };
    }

    const student = await prisma.$transaction(async (tx) => {
      if (data.seatId !== undefined && existing.seatId && data.seatId !== existing.seatId) {
        await tx.seat.update({ where: { id: existing.seatId }, data: { status: "AVAILABLE" } });
      }
      if (data.seatId && data.seatId !== existing.seatId) {
        await tx.seat.update({ where: { id: data.seatId }, data: { status: "OCCUPIED" } });
      }

      // Also update user name/phone if changed
      if ((data.fullName || data.phone) && existing.userId) {
        await tx.user.update({
          where: { id: existing.userId },
          data: {
            ...(data.fullName && { name: data.fullName }),
            ...(data.phone && { phone: data.phone }),
          },
        });
      }

      return tx.student.update({
        where: { id },
        data: {
          ...data,
          dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : undefined,
          joiningDate: data.joiningDate ? new Date(data.joiningDate) : undefined,
          expiryDate: data.expiryDate ? new Date(data.expiryDate) : undefined,
        },
      });
    });

    revalidatePath("/admin/students");
    revalidatePath(`/admin/students/${id}`);
    return { success: true, student };
  } catch (error) {
    console.error("Update student error:", error);
    return { error: "Failed to update student" };
  }
}

// Delete student
export async function deleteStudent(id: string) {
  try {
    const libraryId = await getAdminLibraryId();
    if (!libraryId) return { error: "Unauthorized" };

    const student = await prisma.student.findFirst({ where: { id, libraryId } });
    if (!student) return { error: "Student not found" };

    await prisma.$transaction(async (tx) => {
      if (student.seatId) {
        await tx.seat.update({ where: { id: student.seatId }, data: { status: "AVAILABLE" } });
      }
      await tx.student.delete({ where: { id } });
    });

    revalidatePath("/admin/students");
    return { success: true };
  } catch (error) {
    console.error("Delete student error:", error);
    return { error: "Failed to delete student" };
  }
}

// Toggle student status
export async function toggleStudentStatus(id: string, status: "ACTIVE" | "SUSPENDED" | "INACTIVE") {
  try {
    const libraryId = await getAdminLibraryId();
    if (!libraryId) return { error: "Unauthorized" };

    await prisma.student.update({ where: { id }, data: { status } });
    revalidatePath("/admin/students");
    return { success: true };
  } catch (error) {
    console.error("Toggle student status error:", error);
    return { error: "Failed to update student status" };
  }
}

// Dashboard stats
export async function getDashboardStats() {
  try {
    const libraryId = await getAdminLibraryId();
    if (!libraryId) return { error: "Unauthorized" };

    const today = new Date(); today.setHours(0, 0, 0, 0);
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    const [
      totalStudents, activeStudents, inactiveStudents, suspendedStudents,
      totalSeats, occupiedSeats,
      revenueToday, revenueThisMonth,
      pendingPayments, todayAttendance, overdueStudents,
    ] = await prisma.$transaction([
      prisma.student.count({ where: { libraryId } }),
      prisma.student.count({ where: { libraryId, status: "ACTIVE" } }),
      prisma.student.count({ where: { libraryId, status: "INACTIVE" } }),
      prisma.student.count({ where: { libraryId, status: "SUSPENDED" } }),
      prisma.seat.count({ where: { libraryId } }),
      prisma.seat.count({ where: { libraryId, status: "OCCUPIED" } }),
      prisma.payment.aggregate({ where: { libraryId, status: "PAID", paidAt: { gte: today } }, _sum: { totalAmount: true } }),
      prisma.payment.aggregate({ where: { libraryId, status: "PAID", paidAt: { gte: monthStart } }, _sum: { totalAmount: true } }),
      prisma.payment.count({ where: { libraryId, status: { in: ["PENDING", "OVERDUE"] } } }),
      prisma.attendance.count({ where: { libraryId, date: { gte: today }, status: "PRESENT" } }),
      prisma.student.count({ where: { libraryId, paymentStatus: "OVERDUE", status: "ACTIVE" } }),
    ]);

    const occupancyRate = totalSeats > 0 ? Math.round((occupiedSeats / totalSeats) * 100) : 0;
    const attendanceRate = activeStudents > 0 ? Math.round((todayAttendance / activeStudents) * 100) : 0;

    return {
      totalStudents, activeStudents, inactiveStudents, suspendedStudents,
      totalSeats, occupiedSeats, availableSeats: totalSeats - occupiedSeats,
      revenueToday: revenueToday._sum.totalAmount || 0,
      revenueThisMonth: revenueThisMonth._sum.totalAmount || 0,
      pendingPayments, todayAttendance, overdueStudents,
      occupancyRate, attendanceRate,
    };
  } catch (error) {
    console.error("Get dashboard stats error:", error);
    return { error: "Failed to fetch stats" };
  }
}
