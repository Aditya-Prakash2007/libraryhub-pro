"use client";

import { ReactNode, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import { Lock, CreditCard, AlertTriangle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface SubscriptionGuardProps {
  children: ReactNode;
  libraryName?: string;
}

type AccessState =
  | { status: "loading" }
  | { status: "allowed" }
  | { status: "blocked"; reason: string };

export function SubscriptionGuard({ children }: SubscriptionGuardProps) {
  const { data: session, status } = useSession();
  const [accessState, setAccessState] = useState<AccessState>({ status: "loading" });

  useEffect(() => {
    if (status === "loading") return;

    // Not logged in — layout/middleware handles redirect
    if (!session?.user) {
      setAccessState({ status: "allowed" });
      return;
    }

    // Non-library-admin roles are always allowed
    if (session.user.role !== "LIBRARY_ADMIN") {
      setAccessState({ status: "allowed" });
      return;
    }

    // Trial and access is bypassed — allow immediately without a DB call
    setAccessState({ status: "allowed" });
  }, [session, status]);

  if (accessState.status === "loading") return null;

  if (accessState.status === "blocked") {
    return <BlockedScreen reason={accessState.reason} />;
  }

  return <>{children}</>;
}

function BlockedScreen({ reason }: { reason: string }) {
  const messages: Record<string, { icon: ReactNode; title: string; desc: string; cta?: string }> = {
    LIBRARY_NOT_FOUND: {
      icon: <AlertTriangle className="w-12 h-12 text-amber-500" />,
      title: "Session Expired",
      desc: "Your session is linked to a library that no longer exists. Please sign out and log in again to continue.",
    },
    TRIAL_EXPIRED: {
      icon: <Clock className="w-12 h-12 text-amber-500" />,
      title: "Trial Expired",
      desc: "Your free trial has ended. Purchase a subscription to continue using LibraryHub Pro.",
      cta: "/admin/subscription",
    },
    SUBSCRIPTION_EXPIRED: {
      icon: <CreditCard className="w-12 h-12 text-rose-500" />,
      title: "Subscription Expired",
      desc: "Your subscription has expired. Renew now to restore access to your library.",
      cta: "/admin/subscription",
    },
    PENDING_APPROVAL: {
      icon: <Clock className="w-12 h-12 text-indigo-500" />,
      title: "Awaiting Approval",
      desc: "Your library registration is under review. You'll receive an email once approved. This usually takes 24 hours.",
    },
    REJECTED: {
      icon: <AlertTriangle className="w-12 h-12 text-rose-500" />,
      title: "Registration Not Approved",
      desc: "Your library registration was not approved. Please contact support for assistance.",
    },
    LIBRARY_SUSPENDED: {
      icon: <Lock className="w-12 h-12 text-rose-500" />,
      title: "Library Suspended",
      desc: "Your library has been suspended. Please contact support to resolve this.",
    },
    LIBRARY_DISABLED: {
      icon: <Lock className="w-12 h-12 text-slate-400" />,
      title: "Library Disabled",
      desc: "Your library account has been disabled. Contact support for assistance.",
    },
  };

  const info = messages[reason] ?? {
    icon: <Lock className="w-12 h-12 text-muted-foreground" />,
    title: "Access Restricted",
    desc: "You don't have access to the dashboard. Please contact support.",
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full text-center"
      >
        <div className="w-24 h-24 rounded-3xl bg-muted flex items-center justify-center mx-auto mb-6">
          {info.icon}
        </div>
        <h1 className="text-2xl font-bold mb-3">{info.title}</h1>
        <p className="text-muted-foreground leading-relaxed mb-8">{info.desc}</p>
        <div className="flex flex-col gap-3">
          {info.cta && (
            <Button size="lg" asChild>
              <Link href={info.cta}>
                <CreditCard className="w-4 h-4 mr-2" />
                Purchase Subscription
              </Link>
            </Button>
          )}
          <Button variant="outline" size="lg" asChild>
            <Link href="/login">Sign Out</Link>
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
