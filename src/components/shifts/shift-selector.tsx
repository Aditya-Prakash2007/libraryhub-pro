"use client";

import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

interface Shift {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  color: string;
}

interface ShiftSelectorProps {
  shifts: Shift[];
  value: string; // single shiftId
  onChange: (shiftId: string) => void;
  disabled?: boolean;
}

export function ShiftSelector({ shifts, value, onChange, disabled }: ShiftSelectorProps) {
  // Show only A, B, C, Full Day — filter by known names
  const allowed = ["Shift A", "Shift B", "Shift C", "Full Day"];
  const filtered = shifts.filter((s) => allowed.includes(s.name));

  const colorMap: Record<string, { bg: string; border: string; text: string }> = {
    "Shift A": { bg: "bg-indigo-500/10", border: "border-indigo-500", text: "text-indigo-400" },
    "Shift B": { bg: "bg-violet-500/10", border: "border-violet-500", text: "text-violet-400" },
    "Shift C": { bg: "bg-purple-500/10", border: "border-purple-500", text: "text-purple-400" },
    "Full Day": { bg: "bg-emerald-500/10", border: "border-emerald-500", text: "text-emerald-400" },
  };

  return (
    <div className="grid grid-cols-2 gap-2">
      {filtered.map((shift) => {
        const selected = value === shift.id;
        const colors = colorMap[shift.name] ?? { bg: "bg-muted", border: "border-border", text: "text-muted-foreground" };

        return (
          <button
            key={shift.id}
            type="button"
            disabled={disabled}
            onClick={() => onChange(selected ? "" : shift.id)}
            className={cn(
              "relative flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all duration-150",
              selected
                ? `${colors.border} ${colors.bg}`
                : "border-border hover:border-border/80 hover:bg-muted/40",
              disabled && "opacity-50 cursor-not-allowed"
            )}
          >
            <div className={cn(
              "w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all",
              selected ? `${colors.border} ${colors.bg}` : "border-muted-foreground/30"
            )}>
              {selected && <Check className={cn("w-3 h-3", colors.text)} />}
            </div>

            <div className="flex-1 min-w-0">
              <p className={cn("text-sm font-semibold", selected ? colors.text : "text-foreground")}>
                {shift.name}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {shift.startTime}–{shift.endTime}
              </p>
            </div>

            {shift.name === "Full Day" && (
              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-medium shrink-0">
                24hr
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
