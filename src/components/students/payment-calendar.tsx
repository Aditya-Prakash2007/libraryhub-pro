"use client";

import { format, addMonths, isBefore, isSameMonth, differenceInMonths, startOfMonth } from "date-fns";
import { Check, Clock, AlertCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface PaymentCalendarProps {
  joiningDate: Date | string;
  nextDueDate?: Date | string | null;
  totalDueAmount?: number;
  monthlyFee: number;
}

export function PaymentCalendar({ joiningDate, nextDueDate, totalDueAmount = 0, monthlyFee }: PaymentCalendarProps) {
  const start = startOfMonth(new Date(joiningDate));
  const next = nextDueDate ? startOfMonth(new Date(nextDueDate)) : start;
  const now = startOfMonth(new Date());

  // Determine how many months to show: at least 12, or up to current/next + a few months.
  const diffToNow = differenceInMonths(now, start);
  const diffToNext = differenceInMonths(next, start);
  const totalMonths = Math.max(12, diffToNow + 3, diffToNext + 3);

  const monthsGrid = Array.from({ length: totalMonths }).map((_, i) => {
    return addMonths(start, i);
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold tracking-tight">Payment Timeline</h3>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500"></span> Paid</div>
          <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-500"></span> Partial</div>
          <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-muted-foreground"></span> Unpaid</div>
        </div>
      </div>
      
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {monthsGrid.map((month, idx) => {
          let status = "UNPAID";
          const isMonthBeforeNext = isSameMonth(addMonths(month, 1), next);
          
          if (isBefore(month, next)) {
            if (isMonthBeforeNext && totalDueAmount > 0) {
              status = "PARTIAL";
            } else {
              status = "PAID";
            }
          } else if (isSameMonth(month, next)) {
            if (!nextDueDate && totalDueAmount > 0) {
              status = "PARTIAL";
            } else if (totalDueAmount < 0) {
              status = "OVERPAID";
            } else {
              status = "UNPAID";
            }
          }

          let bgClass = "bg-muted/30";
          let borderClass = "border-transparent";
          let icon = <Clock className="w-4 h-4 text-muted-foreground/50" />;
          let textClass = "text-muted-foreground";

          if (status === "PAID") {
            bgClass = "bg-green-100 dark:bg-green-950/40";
            borderClass = "border-green-200 dark:border-green-900";
            icon = <Check className="w-4 h-4 text-green-600 dark:text-green-500" />;
            textClass = "text-green-700 dark:text-green-400";
          } else if (status === "PARTIAL") {
            bgClass = "bg-orange-100 dark:bg-orange-950/40";
            borderClass = "border-orange-200 dark:border-orange-900";
            icon = <AlertCircle className="w-4 h-4 text-orange-600 dark:text-orange-500" />;
            textClass = "text-orange-700 dark:text-orange-400";
          } else if (status === "OVERPAID") {
            bgClass = "bg-green-100 dark:bg-green-950/40";
            borderClass = "border-green-200 dark:border-green-900";
            icon = <Check className="w-4 h-4 text-green-600 dark:text-green-500" />;
            textClass = "text-green-700 dark:text-green-400";
          }

          const isCurrentMonth = isSameMonth(month, now);

          return (
            <TooltipProvider key={idx} delayDuration={100}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className={`p-4 rounded-xl border transition-all hover:scale-105 duration-200 ease-out ${bgClass} ${borderClass} flex flex-col items-center justify-center gap-2 cursor-help relative`}>
                    {isCurrentMonth && (
                      <span className="absolute -top-1 -right-1 flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500 border-2 border-background"></span>
                      </span>
                    )}
                    <span className={`text-sm font-medium ${textClass}`}>{format(month, "MMM yyyy")}</span>
                    {icon}
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="p-3">
                  <p className="font-semibold text-sm mb-1">{format(month, "MMMM yyyy")}</p>
                  {status === "PAID" && <p className="text-xs text-muted-foreground">Fully Paid</p>}
                  {status === "UNPAID" && (
                    <div className="text-xs text-muted-foreground space-y-1 mt-1">
                      <p>Unpaid / Pending</p>
                      <p className="text-rose-500 font-medium">Dues: ₹{monthlyFee}</p>
                    </div>
                  )}
                  {status === "PARTIAL" && (
                    <div className="text-xs text-muted-foreground space-y-1 mt-1">
                      <p>Partially Paid</p>
                      <p>Paid: ₹{Math.max(0, monthlyFee - totalDueAmount)}</p>
                      <p className="text-orange-500 font-medium">Dues: ₹{totalDueAmount}</p>
                    </div>
                  )}
                  {status === "OVERPAID" && (
                    <div className="text-xs text-muted-foreground space-y-1 mt-1">
                      <p className="text-green-600 dark:text-green-500 font-medium">Extra Payment/Credit</p>
                      <p>Paid extra: ₹{Math.abs(totalDueAmount)}</p>
                    </div>
                  )}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        })}
      </div>
    </div>
  );
}
