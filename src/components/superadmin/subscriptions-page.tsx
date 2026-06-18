"use client";

import { motion } from "framer-motion";
import { CreditCard, Crown, Zap, Building2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/shared/page-header";
import { formatDate, formatCurrency } from "@/lib/utils";
import { SUBSCRIPTION_PLANS } from "@/constants";

interface Subscription {
  id: string;
  plan: string;
  status: string;
  startDate: Date;
  endDate?: Date | null;
  trialEndDate?: Date | null;
  amount: number;
  maxStudents: number;
  maxSeats: number;
  library: {
    name: string;
    admin: { name: string; email: string };
  };
}

export function SuperAdminSubscriptionsPage({ subscriptions }: { subscriptions: Subscription[] }) {
  const stats = {
    total: subscriptions.length,
    active: subscriptions.filter((s) => s.status === "ACTIVE").length,
    trial: subscriptions.filter((s) => s.status === "TRIAL").length,
    revenue: subscriptions.filter((s) => s.status === "ACTIVE").reduce((sum, s) => sum + s.amount, 0),
  };

  const planIcon = (plan: string) => {
    if (plan === "ENTERPRISE") return <Crown className="w-4 h-4 text-amber-500" />;
    if (plan === "PROFESSIONAL") return <Zap className="w-4 h-4 text-indigo-500" />;
    return <CreditCard className="w-4 h-4 text-muted-foreground" />;
  };

  const statusColor = (status: string) => ({
    ACTIVE: "bg-emerald-500/15 text-emerald-500",
    TRIAL: "bg-blue-500/15 text-blue-400",
    EXPIRED: "bg-rose-500/15 text-rose-500",
    CANCELLED: "bg-slate-500/15 text-slate-400",
  }[status] || "bg-muted text-muted-foreground");

  return (
    <div className="space-y-6">
      <PageHeader title="Subscriptions" description="Manage library subscription plans" />

      {/* Overview stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total", value: stats.total, color: "text-indigo-500" },
          { label: "Active", value: stats.active, color: "text-emerald-500" },
          { label: "On Trial", value: stats.trial, color: "text-blue-500" },
          { label: "MRR", value: formatCurrency(stats.revenue), color: "text-amber-500" },
        ].map((s) => (
          <Card key={s.label} className="p-4 text-center">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
          </Card>
        ))}
      </div>

      {/* Plan breakdown */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {SUBSCRIPTION_PLANS.map((plan) => {
          const count = subscriptions.filter((s) => s.plan === plan.id).length;
          return (
            <Card key={plan.id} className="p-4">
              <div className="flex items-center gap-2 mb-2">
                {planIcon(plan.id)}
                <span className="text-sm font-medium">{plan.name}</span>
              </div>
              <p className="text-2xl font-bold">{count}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {plan.price > 0 ? formatCurrency(plan.price) + "/mo" : "Free"}
              </p>
            </Card>
          );
        })}
      </div>

      {/* Subscriptions list */}
      <Card>
        <CardHeader>
          <CardTitle>All Subscriptions</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border/50">
            {subscriptions.map((sub, i) => (
              <motion.div
                key={sub.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                className="flex items-center gap-4 px-5 py-4 hover:bg-muted/30 transition-colors"
              >
                <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                  {planIcon(sub.plan)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{sub.library.name}</p>
                  <p className="text-xs text-muted-foreground">{sub.library.admin.email}</p>
                </div>
                <div className="hidden sm:block text-xs text-muted-foreground shrink-0">
                  {sub.endDate ? `Expires: ${formatDate(sub.endDate)}` : sub.trialEndDate ? `Trial until: ${formatDate(sub.trialEndDate)}` : "No end date"}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant="outline" className="text-xs">{sub.plan}</Badge>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor(sub.status)}`}>
                    {sub.status}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
