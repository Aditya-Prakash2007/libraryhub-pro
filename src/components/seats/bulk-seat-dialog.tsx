"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { bulkCreateSeats } from "@/actions/seats";

interface BulkSeatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  shifts: { id: string; name: string }[];
}

export function BulkSeatDialog({ open, onOpenChange, onSuccess, shifts }: BulkSeatDialogProps) {
  const [loading, setLoading] = useState(false);
  const [prefix, setPrefix] = useState("A");
  const [startNum, setStartNum] = useState(1);
  const [endNum, setEndNum] = useState(20);
  const [floor, setFloor] = useState(1);
  const [shiftId, setShiftId] = useState("");

  const preview = Array.from(
    { length: Math.min(5, endNum - startNum + 1) },
    (_, i) => `${prefix}${String(startNum + i).padStart(2, "0")}`
  );

  const handleSubmit = async () => {
    if (endNum < startNum) {
      toast.error("End number must be >= start number");
      return;
    }
    if (endNum - startNum > 199) {
      toast.error("Cannot create more than 200 seats at once");
      return;
    }
    setLoading(true);
    const result = await bulkCreateSeats(prefix, startNum, endNum, floor, shiftId || undefined);
    if ("error" in result) {
      toast.error(result.error);
    } else {
      toast.success(`${result.count} seats created successfully`);
      onSuccess();
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Bulk Add Seats</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>Prefix</Label>
              <Input value={prefix} onChange={(e) => setPrefix(e.target.value.toUpperCase())} placeholder="A" maxLength={3} />
            </div>
            <div className="space-y-1.5">
              <Label>Start #</Label>
              <Input type="number" min={1} value={startNum} onChange={(e) => setStartNum(parseInt(e.target.value) || 1)} />
            </div>
            <div className="space-y-1.5">
              <Label>End #</Label>
              <Input type="number" min={1} value={endNum} onChange={(e) => setEndNum(parseInt(e.target.value) || 1)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Floor</Label>
              <Input type="number" min={1} value={floor} onChange={(e) => setFloor(parseInt(e.target.value) || 1)} />
            </div>
            <div className="space-y-1.5">
              <Label>Shift</Label>
              <Select onValueChange={setShiftId}>
                <SelectTrigger><SelectValue placeholder="All shifts" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All shifts</SelectItem>
                  {shifts.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Preview */}
          <div className="p-4 rounded-lg bg-muted/50 border border-border/50">
            <p className="text-xs font-medium text-muted-foreground mb-2">
              Preview ({Math.max(0, endNum - startNum + 1)} seats)
            </p>
            <div className="flex gap-2 flex-wrap">
              {preview.map((s) => (
                <span key={s} className="text-xs bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded-md font-mono">
                  {s}
                </span>
              ))}
              {endNum - startNum + 1 > 5 && (
                <span className="text-xs text-muted-foreground">
                  + {endNum - startNum - 4} more...
                </span>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} loading={loading}>
            Create {Math.max(0, endNum - startNum + 1)} Seats
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
