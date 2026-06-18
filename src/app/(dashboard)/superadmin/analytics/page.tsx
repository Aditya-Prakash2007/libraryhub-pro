import { Metadata } from "next";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { SuperAdminAnalyticsPage } from "@/components/superadmin/analytics-page";

export const metadata: Metadata = { title: "Platform Analytics" };

export default async function SuperAdminAnalyticsPageRoute() {
  const session = await auth();
  if (!session?.user || session.user.role !== "SUPER_ADMIN") redirect("/login");

  const [
    totalLibraries, totalStudents, totalSeats,
    totalRevenue, librariesByMonth,
  ] = await Promise.all([
    prisma.library.count(),
    prisma.student.count(),
    prisma.seat.count(),
    prisma.payment.aggregate({ where: { status: "PAID" }, _sum: { totalAmount: true } }),
    prisma.library.groupBy({
      by: ["createdAt"],
      _count: true,
      orderBy: { createdAt: "asc" },
    }),
  ]);

  return (
    <SuperAdminAnalyticsPage
      stats={{
        totalLibraries,
        totalStudents,
        totalSeats,
        totalRevenue: totalRevenue._sum.totalAmount || 0,
      }}
    />
  );
}
