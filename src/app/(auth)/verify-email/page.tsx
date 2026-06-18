import { Metadata } from "next";
import { Suspense } from "react";
import { VerifyEmailForm } from "@/components/auth/verify-email-form";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = { title: "Verify Email" };

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="space-y-4"><Skeleton className="h-8 w-48" /></div>}>
      <VerifyEmailForm />
    </Suspense>
  );
}
