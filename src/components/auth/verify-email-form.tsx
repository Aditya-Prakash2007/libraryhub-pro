"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { verifyEmail } from "@/actions/auth";

export function VerifyEmailForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("Invalid verification link. Please request a new one.");
      return;
    }

    verifyEmail(token).then((result) => {
      if ("error" in result) {
        setStatus("error");
        setMessage(result.error ?? "Verification failed.");
      } else {
        setStatus("success");
        setMessage("Email verified successfully! Redirecting to login...");
        setTimeout(() => router.push("/login"), 2500);
      }
    });
  }, [token, router]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="text-center"
    >
      {status === "loading" && (
        <div className="space-y-4">
          <Loader2 className="w-12 h-12 text-indigo-500 mx-auto animate-spin" />
          <h2 className="text-xl font-bold">Verifying your email...</h2>
          <p className="text-muted-foreground text-sm">Please wait a moment.</p>
        </div>
      )}

      {status === "success" && (
        <div className="space-y-4">
          <div className="w-16 h-16 bg-emerald-500/15 rounded-2xl flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8 text-emerald-500" />
          </div>
          <h2 className="text-xl font-bold">Email Verified!</h2>
          <p className="text-muted-foreground text-sm">{message}</p>
        </div>
      )}

      {status === "error" && (
        <div className="space-y-4">
          <div className="w-16 h-16 bg-rose-500/15 rounded-2xl flex items-center justify-center mx-auto">
            <XCircle className="w-8 h-8 text-rose-500" />
          </div>
          <h2 className="text-xl font-bold">Verification Failed</h2>
          <p className="text-muted-foreground text-sm">{message}</p>
          <Button asChild>
            <Link href="/login">Back to Sign In</Link>
          </Button>
        </div>
      )}
    </motion.div>
  );
}
