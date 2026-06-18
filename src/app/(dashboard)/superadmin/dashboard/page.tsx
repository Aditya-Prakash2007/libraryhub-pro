import { Metadata } from "next";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { SuperAdminDashboard } from "@/components/dashboard/superadmin-dashboard";

export const metadata: Metadata = { title: "Super Admin Dashboard" };

export default async function SuperAdminDashboardPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "SUPER_ADMIN") redirect("/login");

  const [
    totalLibraries,
    activeLibraries,
    pendingLibraries,
    totalStudents,
    totalRevenue,
    recentLibraries,
  ] = await Promise.all([
    prisma.library.count(),
    prisma.library.count({ where: { isActive: true, isSuspended: false, approvalStatus: "APPROVED" } }),
    prisma.library.count({ where: { approvalStatus: "PENDING" } }),
    prisma.student.count(),
    prisma.payment.aggregate({ where: { status: "PAID" }, _sum: { totalAmount: true } }),
    prisma.library.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
      include: {
        admin: { select: { name: true, email: true, lastLogin: true } },
        _count: { select: { students: true, seats: true } },
        subscription: { select: { plan: true, status: true, endDate: true } },
      },
    }),
  ]);

  // Revenue per library
  const revenues = await prisma.payment.groupBy({
    by: ["libraryId"],
    where: { status: "PAID" },
    _sum: { totalAmount: true },
  });
  const revenueMap = Object.fromEntries(revenues.map((r) => [r.libraryId, r._sum.totalAmount ?? 0]));

  // Occupied seats per library
  const occupied = await prisma.seat.groupBy({
    by: ["libraryId"],
    where: { status: "OCCUPIED" },
    _count: true,
  });
  const occupancyMap = Object.fromEntries(occupied.map((r) => [r.libraryId, r._count]));

  const enriched = recentLibraries.map((lib) => ({
    ...lib,
    revenue: revenueMap[lib.id] ?? 0,
    occupiedSeats: occupancyMap[lib.id] ?? 0,
  }));

  return (
    <SuperAdminDashboard
      stats={{
        totalLibraries,
        activeLibraries,
        pendingLibraries,
        totalStudents,
        totalRevenue: totalRevenue._sum.totalAmount || 0,
      }}
      recentLibraries={enriched}
    />
  );
}
