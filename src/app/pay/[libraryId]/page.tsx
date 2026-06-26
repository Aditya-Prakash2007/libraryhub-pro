// Public payment page — students scan library QR and land here to pay fees
import { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { PublicPaymentPage } from "@/components/payments/public-payment-page";

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
  return { title: `Pay Fees — ${library?.name ?? "Library"}` };
}

export default async function PayPage({
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
      razorpayKeyId: true,
      upiId: true,
      customQrCode: true,
      isActive: true,
      isSuspended: true,
    },
  });

  if (!library || !library.isActive || library.isSuspended) notFound();

  return <PublicPaymentPage library={library} />;
}
