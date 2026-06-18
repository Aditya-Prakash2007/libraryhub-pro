"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import type { ShiftFormData } from "@/schemas";

async function getAdminLibraryId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.libraryId ?? null;
}

export async function getShifts() {
  try {
    const libraryId = await getAdminLibraryId();
    if (!libraryId) return { error: "Unauthorized" };

    const shifts = await prisma.shift.findMany({
      where: { libraryId },
      include: {
        _count: {
          select: { students: true, seats: true },
        },
      },
      orderBy: { startTime: "asc" },
    });

    return { shifts };
  } catch (error) {
    console.error("Get shifts error:", error);
    return { error: "Failed to fetch shifts" };
  }
}

export async function createShift(data: ShiftFormData) {
  try {
    const libraryId = await getAdminLibraryId();
    if (!libraryId) return { error: "Unauthorized" };

    const existing = await prisma.shift.findFirst({
      where: { name: data.name, libraryId },
    });

    if (existing) {
      return { error: `Shift "${data.name}" already exists` };
    }

    const shift = await prisma.shift.create({
      data: { ...data, libraryId },
    });

    revalidatePath("/admin/shifts");
    return { success: true, shift };
  } catch (error) {
    console.error("Create shift error:", error);
    return { error: "Failed to create shift" };
  }
}

export async function updateShift(id: string, data: Partial<ShiftFormData>) {
  try {
    const libraryId = await getAdminLibraryId();
    if (!libraryId) return { error: "Unauthorized" };

    const shift = await prisma.shift.update({
      where: { id },
      data,
    });

    revalidatePath("/admin/shifts");
    return { success: true, shift };
  } catch (error) {
    console.error("Update shift error:", error);
    return { error: "Failed to update shift" };
  }
}

export async function deleteShift(id: string) {
  try {
    const libraryId = await getAdminLibraryId();
    if (!libraryId) return { error: "Unauthorized" };

    const shift = await prisma.shift.findFirst({
      where: { id, libraryId },
      include: {
        _count: { select: { students: true } },
      },
    });

    if (!shift) return { error: "Shift not found" };
    if (shift._count.students > 0) {
      return { error: "Cannot delete shift with assigned students. Reassign students first." };
    }

    await prisma.shift.delete({ where: { id } });

    revalidatePath("/admin/shifts");
    return { success: true };
  } catch (error) {
    console.error("Delete shift error:", error);
    return { error: "Failed to delete shift" };
  }
}
