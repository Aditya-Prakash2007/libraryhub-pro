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
  return (
    <div className="grid grid-cols-2 gap-2">
      {shifts.map((shift) => {
        const selected = value === shift.id;
        const shiftColor = shift.color || "#6366f1";
        
        return (
          <button
            key={shift.id}
            type="button"
            disabled={disabled}
            onClick={() => onChange(selected ? "" : shift.id)}
            style={{
              borderColor: selected ? shiftColor : undefined,
              backgroundColor: selected ? `${shiftColor}1A` : undefined,
            }}
            className={cn(
              "relative flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all duration-150",
              !selected && "border-border hover:border-border/80 hover:bg-muted/40",
              disabled && "opacity-50 cursor-not-allowed"
            )}
          >
            <div 
              className={cn(
                "w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all",
                !selected && "border-muted-foreground/30"
              )}
              style={{
                borderColor: selected ? shiftColor : undefined,
                backgroundColor: selected ? `${shiftColor}1A` : undefined,
              }}
            >
              {selected && <Check className="w-3 h-3" style={{ color: shiftColor }} />}
            </div>

            <div className="flex-1 min-w-0">
              <p 
                className="text-sm font-semibold"
                style={{ color: selected ? shiftColor : "inherit" }}
              >
                {shift.name}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {shift.startTime}–{shift.endTime}
              </p>
            </div>

            {(shift.name === "Full Day" || shift.endTime === "23:59") && (
              <span 
                className="text-[9px] px-1.5 py-0.5 rounded-full font-medium shrink-0"
                style={{ backgroundColor: `${shiftColor}33`, color: shiftColor }}
              >
                24hr
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
