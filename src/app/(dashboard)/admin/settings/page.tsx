import { Metadata } from "next";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getLibraryWithSettings } from "@/actions/library";
import { LibrarySettingsPage } from "@/components/settings/library-settings-page";

export const metadata: Metadata = { title: "Settings" };

export default async function AdminSettingsPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "LIBRARY_ADMIN") redirect("/login");

  const library = await getLibraryWithSettings();

  return <LibrarySettingsPage library={library} />;
}
