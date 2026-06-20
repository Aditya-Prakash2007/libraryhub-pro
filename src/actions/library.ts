"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import type { LibrarySettingsFormData } from "@/schemas";

export async function saveLibrarySettings(data: LibrarySettingsFormData) {
  const session = await auth();
  if (!session?.user?.libraryId) return { error: "Unauthorized" };

  await prisma.library.update({
    where: { id: session.user.libraryId },
    data: {
      name: data.name,
      description: data.description || null,
      address: data.address || null,
      city: data.city || null,
      state: data.state || null,
      pincode: data.pincode || null,
      phone: data.phone || null,
      email: data.email || null,
      website: data.website || null,
      openingTime: data.openingTime,
      closingTime: data.closingTime,
      primaryColor: data.primaryColor,
      secondaryColor: data.secondaryColor,
      currency: data.currency,
      timezone: data.timezone,
    },
  });

  revalidatePath("/admin/settings");
  return { success: true };
}

export async function saveLibrarySystemSettings(data: {
  emailNotifications: boolean;
  smsNotifications: boolean;
  whatsappNotifications: boolean;
  lateFeeEnabled: boolean;
  lateFeeAmount: number;
  qrCheckInEnabled: boolean;
  lateFeeGraceDays: number;
}) {
  const session = await auth();
  if (!session?.user?.libraryId) return { error: "Unauthorized" };

  const existing = await prisma.settings.findUnique({
    where: { libraryId: session.user.libraryId },
  });

  if (existing) {
    await prisma.settings.update({
      where: { libraryId: session.user.libraryId },
      data,
    });
  } else {
    await prisma.settings.create({
      data: { libraryId: session.user.libraryId, ...data },
    });
  }

  revalidatePath("/admin/settings");
  return { success: true };
}

export async function saveRazorpayKeys(keyId: string, keySecret: string) {
  const session = await auth();
  if (!session?.user?.libraryId) return { error: "Unauthorized" };

  await prisma.library.update({
    where: { id: session.user.libraryId },
    data: {
      razorpayKeyId: keyId,
      razorpaySecret: keySecret,
    },
  });

  revalidatePath("/admin/settings");
  return { success: true };
}

export async function getLibraryWithSettings() {
  const session = await auth();
  if (!session?.user?.libraryId) return null;

  return prisma.library.findUnique({
    where: { id: session.user.libraryId },
    include: { settings: true },
  });
}
