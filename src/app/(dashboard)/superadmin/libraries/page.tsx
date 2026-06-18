import { Metadata } from "next";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { SuperAdminLibrariesPage } from "@/components/superadmin/libraries-page";

export const metadata: Metadata = { title: "All Libraries" };

export default async function SuperAdminLibrariesPageRoute() {
  const session = await auth();
  if (!session?.user || session.user.role !== "SUPER_ADMIN") redirect("/login");

  const libraries = await prisma.library.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      admin: { select: { name: true, email: true, lastLogin: true } },
      subscription: { select: { plan: true, status: true, endDate: true, trialEndDate: true } },
      _count: { select: { students: true, seats: true } },
    },
  });

  // Calculate revenue per library
  const revenues = await prisma.payment.groupBy({
    by: ["libraryId"],
    where: { status: "PAID" },
    _sum: { totalAmount: true },
  });

  const revenueMap = Object.fromEntries(
    revenues.map((r) => [r.libraryId, r._sum.totalAmount ?? 0])
  );

  const occupancyMap: Record<string, number> = {};
  const occupiedCounts = await prisma.seat.groupBy({
    by: ["libraryId"],
    where: { status: "OCCUPIED" },
    _count: true,
  });
  occupiedCounts.forEach((r) => { occupancyMap[r.libraryId] = r._count; });

  const enriched = libraries.map((lib) => ({
    ...lib,
    revenue: revenueMap[lib.id] ?? 0,
    occupiedSeats: occupancyMap[lib.id] ?? 0,
  }));

  return <SuperAdminLibrariesPage libraries={enriched} />;
}
