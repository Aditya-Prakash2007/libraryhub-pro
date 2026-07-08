"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import type { SeatFormData } from "@/schemas";

async function getAdminLibraryId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.libraryId ?? null;
}

// Get all seats
export async function getSeats(shiftId?: string) {
  try {
    const libraryId = await getAdminLibraryId();
    if (!libraryId) return { error: "Unauthorized" };

    const seats = await prisma.seat.findMany({
      where: {
        libraryId,
        ...(shiftId && shiftId !== "all" ? { OR: [{ shiftId }, { shiftId: null }] } : {}),
      },
      include: {
        students: {
          select: {
            id: true,
            fullName: true,
            studentId: true,
            profilePhoto: true,
            shift: { select: { id: true, name: true, color: true, startTime: true, endTime: true } },
          },
          where: { status: "ACTIVE" },
          take: 3,
        },
        shift: { select: { name: true, color: true } },
      },
      orderBy: [{ floor: "asc" }, { seatNumber: "asc" }],
    });

    return { seats };
  } catch (error) {
    console.error("Get seats error:", error);
    return { error: "Failed to fetch seats" };
  }
}

// Create seat
export async function createSeat(data: SeatFormData) {
  try {
    const libraryId = await getAdminLibraryId();
    if (!libraryId) return { error: "Unauthorized" };

    const existing = await prisma.seat.findFirst({
      where: {
        seatNumber: data.seatNumber,
        libraryId,
        shiftId: data.shiftId || null,
      },
    });

    if (existing) {
      return { error: `Seat ${data.seatNumber} already exists for this shift` };
    }

    const seat = await prisma.seat.create({
      data: {
        ...data,
        libraryId,
        shiftId: data.shiftId || null,
        amenities: data.amenities || [],
      },
    });

    // Update library totalSeats count
    await prisma.library.update({
      where: { id: libraryId },
      data: { totalSeats: { increment: 1 } },
    });

    revalidatePath("/admin/seats");
    return { success: true, seat };
  } catch (error) {
    console.error("Create seat error:", error);
    return { error: "Failed to create seat" };
  }
}

// Bulk create seats
export async function bulkCreateSeats(
  prefix: string,
  startNum: number,
  endNum: number,
  floor: number,
  shiftId?: string
) {
  try {
    const libraryId = await getAdminLibraryId();
    if (!libraryId) return { error: "Unauthorized" };

    const seats = [];
    for (let i = startNum; i <= endNum; i++) {
      // Empty prefix = pure sequential numbers (1, 2, 3...)
      const seatNumber = prefix ? `${prefix}${String(i).padStart(2, "0")}` : String(i).padStart(2, "0");
      seats.push({
        seatNumber,
        floor,
        libraryId,
        shiftId: shiftId || null,
        status: "AVAILABLE" as const,
        seatType: "STANDARD" as const,
        amenities: [] as string[],
      });
    }

    await prisma.seat.createMany({ data: seats });

    await prisma.library.update({
      where: { id: libraryId },
      data: { totalSeats: { increment: seats.length } },
    });

    revalidatePath("/admin/seats");
    return { success: true, count: seats.length };
  } catch (error) {
    console.error("Bulk create seats error:", error);
    return { error: "Failed to create seats" };
  }
}

// Update seat
export async function updateSeat(id: string, data: Partial<SeatFormData>) {
  try {
    const libraryId = await getAdminLibraryId();
    if (!libraryId) return { error: "Unauthorized" };

    const seat = await prisma.seat.update({
      where: { id },
      data,
    });

    revalidatePath("/admin/seats");
    return { success: true, seat };
  } catch (error) {
    console.error("Update seat error:", error);
    return { error: "Failed to update seat" };
  }
}

// Assign seat to student
export async function assignSeat(seatId: string, studentId: string) {
  try {
    const libraryId = await getAdminLibraryId();
    if (!libraryId) return { error: "Unauthorized" };

    const seat = await prisma.seat.findFirst({
      where: { id: seatId, libraryId, status: "AVAILABLE" },
    });
    if (!seat) return { error: "Seat is not available" };

    const student = await prisma.student.findFirst({
      where: { id: studentId, libraryId },
    });
    if (!student) return { error: "Student not found" };

    // Vacate old seat
    if (student.seatId) {
      const otherActive = await prisma.student.count({
        where: {
          seatId: student.seatId,
          status: "ACTIVE",
          id: { not: student.id },
        },
      });
      if (otherActive === 0) {
        await prisma.seat.update({
          where: { id: student.seatId },
          data: { status: "AVAILABLE" },
        });
      }
    }

    await prisma.$transaction([
      prisma.seat.update({
        where: { id: seatId },
        data: { status: "OCCUPIED" },
      }),
      prisma.student.update({
        where: { id: studentId },
        data: { seatId },
      }),
    ]);

    revalidatePath("/admin/seats");
    revalidatePath("/admin/students");
    return { success: true };
  } catch (error) {
    console.error("Assign seat error:", error);
    return { error: "Failed to assign seat" };
  }
}

// Vacate seat
export async function vacateSeat(seatId: string) {
  try {
    const libraryId = await getAdminLibraryId();
    if (!libraryId) return { error: "Unauthorized" };

    const seat = await prisma.seat.findFirst({
      where: { id: seatId, libraryId },
      include: {
        students: { where: { status: "ACTIVE" } },
      },
    });
    if (!seat) return { error: "Seat not found" };

    await prisma.$transaction([
      prisma.seat.update({
        where: { id: seatId },
        data: { status: "AVAILABLE" },
      }),
      ...seat.students.map((student) =>
        prisma.student.update({
          where: { id: student.id },
          data: { seatId: null },
        })
      ),
    ]);

    revalidatePath("/admin/seats");
    return { success: true };
  } catch (error) {
    console.error("Vacate seat error:", error);
    return { error: "Failed to vacate seat" };
  }
}

// Delete seat
export async function deleteSeat(id: string) {
  try {
    const libraryId = await getAdminLibraryId();
    if (!libraryId) return { error: "Unauthorized" };

    const seat = await prisma.seat.findFirst({
      where: { id, libraryId },
      include: { students: { where: { status: "ACTIVE" } } },
    });

    if (!seat) return { error: "Seat not found" };
    if (seat.students.length > 0) {
      return { error: "Cannot delete a seat with assigned students" };
    }

    await prisma.seat.delete({ where: { id } });

    await prisma.library.update({
      where: { id: libraryId },
      data: { totalSeats: { decrement: 1 } },
    });

    revalidatePath("/admin/seats");
    return { success: true };
  } catch (error) {
    console.error("Delete seat error:", error);
    return { error: "Failed to delete seat" };
  }
}

// Bulk delete seats
export async function bulkDeleteSeats(floor?: number) {
  try {
    const libraryId = await getAdminLibraryId();
    if (!libraryId) return { error: "Unauthorized" };

    const whereClause: any = { libraryId };
    if (floor !== undefined && floor > 0) {
      whereClause.floor = floor;
    }

    const seatsToDelete = await prisma.seat.findMany({
      where: whereClause,
      include: { students: { where: { status: "ACTIVE" } } },
    });

    const deletableSeatIds = seatsToDelete
      .filter((s) => s.students.length === 0)
      .map((s) => s.id);

    if (deletableSeatIds.length === 0) {
      return { error: "No available seats found to delete. Seats with assigned students cannot be deleted." };
    }

    await prisma.seat.deleteMany({
      where: { id: { in: deletableSeatIds } },
    });

    await prisma.library.update({
      where: { id: libraryId },
      data: { totalSeats: { decrement: deletableSeatIds.length } },
    });

    revalidatePath("/admin/seats");
    return { success: true, count: deletableSeatIds.length };
  } catch (error) {
    console.error("Bulk delete seats error:", error);
    return { error: "Failed to delete seats" };
  }
}

export async function toggleSeatMaintenance(seatNumber: string, floor: number, enableMaintenance: boolean) {
  try {
    const libraryId = await getAdminLibraryId();
    if (!libraryId) return { error: "Unauthorized" };

    const status = enableMaintenance ? "MAINTENANCE" : "AVAILABLE";

    await prisma.seat.updateMany({
      where: {
        libraryId,
        seatNumber,
        floor,
      },
      data: {
        status,
      },
    });

    revalidatePath("/admin/seats");
    return { success: true };
  } catch (error) {
    console.error("Toggle seat maintenance error:", error);
    return { error: "Failed to update seat status" };
  }
}
