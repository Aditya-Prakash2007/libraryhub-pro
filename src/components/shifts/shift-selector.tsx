"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
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
  selectedIds: string[];
  onChange: (ids: string[], type: string) => void;
  disabled?: boolean;
}

type ShiftCombo = {
  label: string;
  description: string;
  type: string;
  getIds: (shifts: Shift[]) => string[];
  badge?: string;
};

function buildCombos(shifts: Shift[]): ShiftCombo[] {
  const combos: ShiftCombo[] = [];

  // Full Day
  combos.push({
    label: "Full Day",
    description: "All shifts combined",
    type: "FULL_DAY",
    badge: "Best Value",
    getIds: (s) => s.map((sh) => sh.id),
  });

  // Individual shifts
  shifts.forEach((shift, i) => {
    const shiftLetter = String.fromCharCode(65 + i); // A, B, C
    combos.push({
      label: `Shift ${shiftLetter}`,
      description: `${shift.startTime} – ${shift.endTime}`,
      type: "CUSTOM",
      getIds: () => [shift.id],
    });
  });

  // Two-shift combos (A+B, B+C, A+C)
  for (let i = 0; i < shifts.length; i++) {
    for (let j = i + 1; j < shifts.length; j++) {
      const la = String.fromCharCode(65 + i);
      const lb = String.fromCharCode(65 + j);
      combos.push({
        label: `Shift ${la} + ${lb}`,
        description: `${shifts[i].startTime}–${shifts[i].endTime} & ${shifts[j].startTime}–${shifts[j].endTime}`,
        type: "CUSTOM",
        getIds: () => [shifts[i].id, shifts[j].id],
      });
    }
  }

  return combos;
}

export function ShiftSelector({ shifts, selectedIds, onChange, disabled }: ShiftSelectorProps) {
  const combos = buildCombos(shifts);

  const isSelected = (combo: ShiftCombo): boolean => {
    const ids = combo.getIds(shifts);
    return (
      ids.length === selectedIds.length &&
      ids.every((id) => selectedIds.includes(id))
    );
  };

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {combos.map((combo) => {
          const selected = isSelected(combo);
          const ids = combo.getIds(shifts);
          return (
            <button
              key={combo.label}
              type="button"
              disabled={disabled}
              onClick={() => onChange(ids, combo.type)}
              className={cn(
                "relative flex items-start gap-3 p-3 rounded-xl border-2 text-left transition-all duration-150",
                selected
                  ? "border-indigo-500 bg-indigo-500/10"
                  : "border-border hover:border-indigo-500/40 hover:bg-muted/40",
                disabled && "opacity-50 cursor-not-allowed"
              )}
            >
              {/* Check indicator */}
              <div className={cn(
                "w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all",
                selected ? "border-indigo-500 bg-indigo-500" : "border-border"
              )}>
                {selected && <Check className="w-3 h-3 text-white" />}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold">{combo.label}</span>
                  {combo.badge && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-500 font-medium">
                      {combo.badge}
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{combo.description}</p>
              </div>
            </button>
          );
        })}
      </div>

      {selectedIds.length > 0 && (
        <p className="text-xs text-indigo-400 mt-1">
          ✓ {combos.find((c) => isSelected(c))?.label ?? "Custom selection"} selected
        </p>
      )}
    </div>
  );
}
