"use client";

import { motion } from "framer-motion";
import { LucideIcon, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  change?: number;
  changeLabel?: string;
  prefix?: string;
  suffix?: string;
  isCurrency?: boolean;
  color?: "indigo" | "violet" | "emerald" | "amber" | "rose" | "blue";
  loading?: boolean;
  index?: number;
  onClick?: () => void;
}

const colorMap = {
  indigo: {
    icon: "text-indigo-500",
    bg: "bg-indigo-500/10",
    glow: "shadow-indigo-500/10",
  },
  violet: {
    icon: "text-violet-500",
    bg: "bg-violet-500/10",
    glow: "shadow-violet-500/10",
  },
  emerald: {
    icon: "text-emerald-500",
    bg: "bg-emerald-500/10",
    glow: "shadow-emerald-500/10",
  },
  amber: {
    icon: "text-amber-500",
    bg: "bg-amber-500/10",
    glow: "shadow-amber-500/10",
  },
  rose: {
    icon: "text-rose-500",
    bg: "bg-rose-500/10",
    glow: "shadow-rose-500/10",
  },
  blue: {
    icon: "text-blue-500",
    bg: "bg-blue-500/10",
    glow: "shadow-blue-500/10",
  },
};

export function StatsCard({
  title,
  value,
  icon: Icon,
  change,
  changeLabel,
  prefix = "",
  suffix = "",
  isCurrency = false,
  color = "indigo",
  loading = false,
  index = 0,
  onClick,
}: StatsCardProps) {
  const colors = colorMap[color];

  const displayValue = isCurrency
    ? formatCurrency(Number(value))
    : `${prefix}${value}${suffix}`;

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-start justify-between mb-4">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-10 rounded-lg" />
        </div>
        <Skeleton className="h-8 w-32 mb-2" />
        <Skeleton className="h-3 w-20" />
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.08 }}
      onClick={onClick}
      className={onClick ? "cursor-pointer" : ""}
    >
      <Card
        className={cn(
          "p-6 dashboard-card overflow-hidden relative",
          `hover:shadow-lg ${colors.glow}`
        )}
      >
        {/* Background decoration */}
        <div className={cn("absolute -top-4 -right-4 w-24 h-24 rounded-full blur-2xl opacity-20", colors.bg)} />

        <div className="relative">
          <div className="flex items-start justify-between mb-4">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", colors.bg)}>
              <Icon className={cn("w-5 h-5", colors.icon)} />
            </div>
          </div>

          <p className="text-2xl font-bold mb-1">{displayValue}</p>

          {change !== undefined ? (
            <div className="flex items-center gap-1.5 mt-1">
              <span
                className={cn(
                  "flex items-center gap-0.5 text-xs font-medium px-1.5 py-0.5 rounded-full",
                  change > 0
                    ? "bg-emerald-500/10 text-emerald-500"
                    : change < 0
                    ? "bg-rose-500/10 text-rose-500"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {change > 0 ? (
                  <TrendingUp className="w-3 h-3" />
                ) : change < 0 ? (
                  <TrendingDown className="w-3 h-3" />
                ) : (
                  <Minus className="w-3 h-3" />
                )}
                {Math.abs(change)}%
              </span>
              {changeLabel && (
                <span className="text-xs text-muted-foreground">{changeLabel}</span>
              )}
            </div>
          ) : (
            <div className="h-[22px] mt-1" />
          )}
        </div>
      </Card>
    </motion.div>
  );
}
