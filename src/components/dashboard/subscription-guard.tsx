"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Lock, Clock, CreditCard, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { checkLibraryAccess } from "@/actions/auth";
import { useSession } from "next-auth/react";
import Link from "next/link";

interface SubscriptionGuardProps {
  children: React.ReactNode;
}

type AccessState =
  | { status: "loading" }
  | { status: "allowed"; reason: string; trialEndsAt?: Date }
  | { status: "blocked"; reason: string };

export function SubscriptionGuard({ children }: SubscriptionGuardProps) {
  const { data: session, status } = useSession();
  const [accessState, setAccessState] = useState<AccessState>({ status: "loading" });

  useEffect(() => {
    // Wait until NextAuth session is fully resolved
    if (status === "loading") return;

    // Not logged in — layout/middleware handles redirect
    if (!session?.user) {
      setAccessState({ status: "allowed", reason: "NO_SESSION" });
      return;
    }

    // Non-library-admin roles (SUPER_ADMIN etc.) are always allowed
    if (session.user.role !== "LIBRARY_ADMIN") {
      setAccessState({ status: "allowed", reason: "SUPER_ADMIN" });
      return;
    }

    // Library admin but libraryId missing — allow, server-side will handle it
    if (!session.user.libraryId) {
      setAccessState({ status: "allowed", reason: "NO_LIBRARY_ID" });
      return;
    }

    checkLibraryAccess(session.user.libraryId).then((result) => {
      if (result.allowed) {
        setAccessState({
          status: "allowed",
          reason: result.reason,
          trialEndsAt: result.trialEndsAt,
        });
      } else {
        setAccessState({ status: "blocked", reason: result.reason });
      }
    });
  }, [session, status]);

  if (accessState.status === "loading") return null;

  if (accessState.status === "blocked") {
    return <BlockedScreen reason={accessState.reason} />;
  }

  return (
    <>
      {/* Trial warning banner */}
      {accessState.reason === "TRIAL" && accessState.trialEndsAt && (
        <TrialBanner trialEndsAt={accessState.trialEndsAt} />
      )}
      {children}
    </>
  );
}

function TrialBanner({ trialEndsAt }: { trialEndsAt: Date }) {
  const msLeft = trialEndsAt.getTime() - Date.now();
  const hoursLeft = Math.max(0, Math.floor(msLeft / (1000 * 60 * 60)));
  const minutesLeft = Math.max(0, Math.floor((msLeft % (1000 * 60 * 60)) / (1000 * 60)));

  const isUrgent = hoursLeft < 6;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex items-center gap-3 px-4 py-2.5 text-sm ${
        isUrgent
          ? "bg-rose-500/10 border-b border-rose-500/20 text-rose-400"
          : "bg-amber-500/10 border-b border-amber-500/20 text-amber-500"
      }`}
    >
      <Clock className="w-4 h-4 shrink-0" />
      <span className="flex-1">
        <strong>Free Trial:</strong>{" "}
        {hoursLeft > 0
          ? `${hoursLeft}h ${minutesLeft}m remaining`
          : `${minutesLeft} minutes remaining`}
        {isUrgent && " — Trial ending soon!"}
      </span>
      <Button size="sm" className="h-7 text-xs" asChild>
        <Link href="/admin/subscription">Upgrade Now</Link>
      </Button>
    </motion.div>
  );
}

function BlockedScreen({ reason }: { reason: string }) {
  const messages: Record<string, { icon: React.ReactNode; title: string; desc: string; cta?: string }> = {
    TRIAL_EXPIRED: {
      icon: <Clock className="w-12 h-12 text-amber-500" />,
      title: "Trial Expired",
      desc: "Your 48-hour free trial has ended. Purchase a subscription to continue using LibraryHub Pro.",
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
      desc: "Your library registration is under review by our team. You'll receive an email once approved. This usually takes 24 hours.",
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

