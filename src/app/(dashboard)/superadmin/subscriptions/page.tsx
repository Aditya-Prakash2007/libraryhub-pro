import { Metadata } from "next";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { SuperAdminSubscriptionsPage } from "@/components/superadmin/subscriptions-page";

export const metadata: Metadata = { title: "Subscriptions" };

export default async function SuperAdminSubscriptionsPageRoute() {
  const session = await auth();
  if (!session?.user || session.user.role !== "SUPER_ADMIN") redirect("/login");

  const subscriptions = await prisma.subscription.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      library: {
        select: {
          name: true,
          admin: { select: { name: true, email: true } },
        },
      },
    },
  });

  return <SuperAdminSubscriptionsPage subscriptions={subscriptions} />;
}
