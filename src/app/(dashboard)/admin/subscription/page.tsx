import { Metadata } from "next";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { SubscriptionPage } from "@/components/subscription/subscription-page";

export const metadata: Metadata = { title: "Upgrade Plan" };

export default async function AdminSubscriptionPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "LIBRARY_ADMIN") redirect("/login");

  const library = session.user.libraryId
    ? await prisma.library.findUnique({
        where: { id: session.user.libraryId },
        include: { subscription: true },
      })
    : null;

  return <SubscriptionPage library={library} />;
}
