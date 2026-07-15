"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { bulkCreateSeats } from "@/actions/seats";

interface BulkSeatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  existingSeatCount?: number; // to continue numbering from where we left off
}

export function BulkSeatDialog({ open, onOpenChange, onSuccess, existingSeatCount = 0 }: BulkSeatDialogProps) {
  const [loading, setLoading] = useState(false);
  const [countStr, setCountStr] = useState("10");
  const [floorStr, setFloorStr] = useState("1");

  const count = parseInt(countStr) || 0;
  const floor = parseInt(floorStr) || 0;

  // Start numbering from after existing seats
  const startFrom = existingSeatCount + 1;
  const endAt = existingSeatCount + Math.max(count, 0);

  const preview = Array.from(
    { length: Math.min(5, Math.max(count, 0)) },
    (_, i) => String(startFrom + i).padStart(2, "0")
  );

  const handleSubmit = async () => {
    if (count < 1) { toast.error("Add at least 1 seat"); return; }
    if (count > 200) { toast.error("Cannot create more than 200 seats at once"); return; }
    if (floor < 1) { toast.error("Floor must be at least 1"); return; }

    setLoading(true);
    // Pass empty prefix — seats will be numbered sequentially (1, 2, 3...)
    const result = await bulkCreateSeats("", startFrom, endAt, floor, undefined);
    if ("error" in result) {
      toast.error(result.error);
    } else {
      if (result.count === 0) {
        toast.info(result.message ?? "All seats already exist. Nothing was added.");
      } else if (result.skipped && result.skipped > 0) {
        toast.success(result.message ?? `${result.count} seat(s) created, ${result.skipped} skipped.`);
      } else {
        toast.success(`${result.count} seat(s) created successfully.`);
      }
      onSuccess();
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Add Seats</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Number of Seats</Label>
              <Input
                type="number"
                min={1}
                max={200}
                value={countStr}
                onChange={(e) => setCountStr(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Floor</Label>
              <Input
                type="number"
                min={1}
                value={floorStr}
                onChange={(e) => setFloorStr(e.target.value)}
              />
            </div>
          </div>

          {/* Preview */}
          <div className="p-4 rounded-lg bg-muted/50 border border-border/50">
            <p className="text-xs font-medium text-muted-foreground mb-2">
              Preview — {count > 0 ? count : 0} seat{count !== 1 ? "s" : ""} on Floor {floor > 0 ? floor : 1}
            </p>
            <div className="flex gap-2 flex-wrap">
              {preview.map((n) => (
                <span key={n} className="text-xs bg-emerald-500/10 text-emerald-400 px-2.5 py-0.5 rounded-md font-mono border border-emerald-500/20">
                  {n}
                </span>
              ))}
              {count > 5 && (
                <span className="text-xs text-muted-foreground self-center">
                  ...up to {endAt}
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Seat numbers: <strong>{startFrom}</strong> to <strong>{Math.max(startFrom, endAt)}</strong>
              {existingSeatCount > 0 && ` (continuing from ${existingSeatCount} existing)`}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} loading={loading}>
            Add {count > 0 ? count : 0} Seat{count !== 1 ? "s" : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
