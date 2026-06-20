import { Metadata } from "next";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { LibrarySettingsPage } from "@/components/settings/library-settings-page";

export const metadata: Metadata = { title: "Settings" };

export default async function AdminSettingsPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "LIBRARY_ADMIN") redirect("/login");

  const library = session.user.libraryId
    ? await prisma.library.findUnique({
        where: { id: session.user.libraryId },
        include: { settings: true },
        // Only select razorpayKeyId (never expose secret to client)
      })
    : null;

  // Check if razorpay secret is set (don't send actual value to client)
  const hasRazorpaySecret = !!library?.razorpaySecret;
  const safeLibrary = library
    ? {
        ...library,
        razorpaySecret: null, // Never expose secret
        hasRazorpaySecret,
      }
    : null;

  return <LibrarySettingsPage library={safeLibrary} />;
}
