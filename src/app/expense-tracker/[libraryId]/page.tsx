import { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { PublicExpenseTracker } from "@/components/workers/public-expense-tracker";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ libraryId: string }>;
}): Promise<Metadata> {
  const { libraryId } = await params;
  const library = await prisma.library.findUnique({
    where: { id: libraryId },
    select: { name: true },
  });
  return { title: `Expense Report — ${library?.name ?? "Library"}` };
}

export default async function ExpenseTrackerPage({
  params,
}: {
  params: Promise<{ libraryId: string }>;
}) {
  const { libraryId } = await params;

  const library = await prisma.library.findUnique({
    where: { id: libraryId },
    select: {
      id: true,
      name: true,
      logo: true,
      primaryColor: true,
      isActive: true,
      isSuspended: true,
    },
  });

  if (!library || !library.isActive || library.isSuspended) notFound();

  const workers = await prisma.worker.findMany({
    where: { libraryId, status: "ACTIVE" },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return <PublicExpenseTracker library={library} workers={workers} />;
}
