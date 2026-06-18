"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateStudentId } from "@/lib/utils";
import { revalidatePath } from "next/cache";
import type { StudentFormData } from "@/schemas";

// Get library ID for the current admin
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

    const {
      search = "",
      status = "all",
      shiftId = "all",
      paymentStatus = "all",
      page = 1,
      limit = 20,
    } = params || {};

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

    return {
      students,
      total,
      pages: Math.ceil(total / limit),
      page,
    };
  } catch (error) {
    console.error("Get students error:", error);
    return { error: "Failed to fetch students" };
  }
}

// Get single student
export async function getStudent(id: string) {
  try {
    const libraryId = await getAdminLibraryId();
    if (!libraryId) return { error: "Unauthorized" };

    const student = await prisma.student.findFirst({
      where: { id, libraryId },
      include: {
        seat: true,
        shift: true,
        payments: {
          orderBy: { createdAt: "desc" },
          take: 10,
        },
        attendance: {
          orderBy: { date: "desc" },
          take: 30,
        },
        documents: true,
        notifications: {
          orderBy: { createdAt: "desc" },
          take: 10,
        },
      },
    });

    if (!student) return { error: "Student not found" };
    return { student };
  } catch (error) {
    console.error("Get student error:", error);
    return { error: "Failed to fetch student" };
  }
}

// Create student
export async function createStudent(data: StudentFormData) {
  try {
    const libraryId = await getAdminLibraryId();
    if (!libraryId) return { error: "Unauthorized" };

    // Get library for slug
    const library = await prisma.library.findUnique({
      where: { id: libraryId },
      select: { slug: true },
    });
    if (!library) return { error: "Library not found" };

    // Count existing students for ID generation
    const count = await prisma.student.count({ where: { libraryId } });
    const studentId = generateStudentId(library.slug, count + 1);

    // Check if seat is available
    if (data.seatId) {
      const seat = await prisma.seat.findFirst({
        where: { id: data.seatId, libraryId, status: "AVAILABLE" },
      });
      if (!seat) return { error: "Selected seat is not available" };
    }

    const student = await prisma.$transaction(async (tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0]) => {
      const newStudent = await tx.student.create({
        data: {
          studentId,
          libraryId,
          fullName: data.fullName,
          fatherName: data.fatherName,
          motherName: data.motherName,
          email: data.email,
          phone: data.phone,
          whatsappNumber: data.whatsappNumber,
          emergencyContact: data.emergencyContact,
          address: data.address,
          city: data.city,
          state: data.state,
          pincode: data.pincode,
          dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : undefined,
          gender: data.gender,
          occupation: data.occupation,
          institution: data.institution,
          seatId: data.seatId || null,
          shiftId: data.shiftId || null,
          joiningDate: data.joiningDate ? new Date(data.joiningDate) : new Date(),
          expiryDate: data.expiryDate ? new Date(data.expiryDate) : undefined,
          monthlyFee: data.monthlyFee,
          depositAmount: data.depositAmount || 0,
          discountAmount: data.discountAmount || 0,
          notes: data.notes,
        },
      });

      // Update seat status if assigned
      if (data.seatId) {
        await tx.seat.update({
          where: { id: data.seatId },
          data: { status: "OCCUPIED" },
        });
      }

      // Log activity
      const session = await auth();
      if (session?.user?.id) {
        await tx.activityLog.create({
          data: {
            userId: session.user.id,
            libraryId,
            studentId: newStudent.id,
            type: "STUDENT_CREATED",
            description: `New student ${newStudent.fullName} (${studentId}) added`,
          },
        });
      }

      return newStudent;
    });

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

    // Handle seat change
    if (data.seatId && data.seatId !== existing.seatId) {
      const newSeat = await prisma.seat.findFirst({
        where: { id: data.seatId, libraryId, status: "AVAILABLE" },
      });
      if (!newSeat) return { error: "Selected seat is not available" };
    }

    const student = await prisma.$transaction(async (tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0]) => {
      // Free old seat if changing
      if (data.seatId !== undefined && existing.seatId && data.seatId !== existing.seatId) {
        await tx.seat.update({
          where: { id: existing.seatId },
          data: { status: "AVAILABLE" },
        });
      }

      // Occupy new seat
      if (data.seatId && data.seatId !== existing.seatId) {
        await tx.seat.update({
          where: { id: data.seatId },
          data: { status: "OCCUPIED" },
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

    await prisma.$transaction(async (tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0]) => {
      // Free seat
      if (student.seatId) {
        await tx.seat.update({
          where: { id: student.seatId },
          data: { status: "AVAILABLE" },
        });
      }

      // Delete student (cascade will handle related records)
      await tx.student.delete({ where: { id } });
    });

    revalidatePath("/admin/students");
    return { success: true };
  } catch (error) {
    console.error("Delete student error:", error);
    return { error: "Failed to delete student" };
  }
}

// Toggle student status (suspend/activate)
export async function toggleStudentStatus(id: string, status: "ACTIVE" | "SUSPENDED" | "INACTIVE") {
  try {
    const libraryId = await getAdminLibraryId();
    if (!libraryId) return { error: "Unauthorized" };

    await prisma.student.update({
      where: { id },
      data: { status },
    });

    revalidatePath("/admin/students");
    return { success: true };
  } catch (error) {
    console.error("Toggle student status error:", error);
    return { error: "Failed to update student status" };
  }
}

// Bulk import students
export async function bulkImportStudents(students: StudentFormData[]) {
  try {
    const libraryId = await getAdminLibraryId();
    if (!libraryId) return { error: "Unauthorized" };

    const library = await prisma.library.findUnique({
      where: { id: libraryId },
      select: { slug: true },
    });
    if (!library) return { error: "Library not found" };

    let imported = 0;
    let failed = 0;
    let duplicates = 0;

    let count = await prisma.student.count({ where: { libraryId } });

    for (const data of students) {
      try {
        const exists = await prisma.student.findFirst({
          where: {
            libraryId,
            OR: [
              { email: data.email },
              { phone: data.phone }
            ]
          }
        });

        if (exists) {
          duplicates++;
          continue;
        }

        count++;
        const studentId = generateStudentId(library.slug, count);

        await prisma.student.create({
          data: {
            studentId,
            libraryId,
            fullName: data.fullName,
            fatherName: data.fatherName,
            motherName: data.motherName,
            email: data.email,
            phone: data.phone,
            whatsappNumber: data.whatsappNumber,
            emergencyContact: data.emergencyContact,
            address: data.address,
            city: data.city,
            state: data.state,
            pincode: data.pincode,
            dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : undefined,
            gender: data.gender,
            occupation: data.occupation,
            institution: data.institution,
            joiningDate: data.joiningDate ? new Date(data.joiningDate) : new Date(),
            monthlyFee: data.monthlyFee,
            depositAmount: data.depositAmount || 0,
            discountAmount: data.discountAmount || 0,
            notes: data.notes,
          }
        });
        imported++;
      } catch (err) {
        failed++;
      }
    }

    revalidatePath("/admin/students");
    return { imported, failed, duplicates };
  } catch (error) {
    console.error("Bulk import error:", error);
    return { error: "Failed to import students" };
  }
}

// Get dashboard stats
export async function getDashboardStats() {
  try {
    const libraryId = await getAdminLibraryId();
    if (!libraryId) return { error: "Unauthorized" };

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    const [
      totalStudents,
      activeStudents,
      inactiveStudents,
      suspendedStudents,
      totalSeats,
      occupiedSeats,
      revenueToday,
      revenueThisMonth,
      pendingPayments,
      todayAttendance,
      overdueStudents,
    ] = await prisma.$transaction([
      prisma.student.count({ where: { libraryId } }),
      prisma.student.count({ where: { libraryId, status: "ACTIVE" } }),
      prisma.student.count({ where: { libraryId, status: "INACTIVE" } }),
      prisma.student.count({ where: { libraryId, status: "SUSPENDED" } }),
      prisma.seat.count({ where: { libraryId } }),
      prisma.seat.count({ where: { libraryId, status: "OCCUPIED" } }),
      prisma.payment.aggregate({
        where: { libraryId, status: "PAID", paidAt: { gte: today } },
        _sum: { totalAmount: true },
      }),
      prisma.payment.aggregate({
        where: { libraryId, status: "PAID", paidAt: { gte: monthStart } },
        _sum: { totalAmount: true },
      }),
      prisma.payment.count({
        where: { libraryId, status: { in: ["PENDING", "OVERDUE"] } },
      }),
      prisma.attendance.count({
        where: { libraryId, date: { gte: today }, status: "PRESENT" },
      }),
      prisma.student.count({
        where: {
          libraryId,
          paymentStatus: "OVERDUE",
          status: "ACTIVE",
        },
      }),
    ]);

    const occupancyRate = totalSeats > 0 ? Math.round((occupiedSeats / totalSeats) * 100) : 0;
    const attendanceRate = activeStudents > 0 ? Math.round((todayAttendance / activeStudents) * 100) : 0;

    return {
      totalStudents,
      activeStudents,
      inactiveStudents,
      suspendedStudents,
      totalSeats,
      occupiedSeats,
      availableSeats: totalSeats - occupiedSeats,
      revenueToday: revenueToday._sum.totalAmount || 0,
      revenueThisMonth: revenueThisMonth._sum.totalAmount || 0,
      pendingPayments,
      todayAttendance,
      overdueStudents,
      occupancyRate,
      attendanceRate,
    };
  } catch (error) {
    console.error("Get dashboard stats error:", error);
    return { error: "Failed to fetch stats" };
  }
}
