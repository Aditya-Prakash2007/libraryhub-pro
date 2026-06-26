"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { bulkDeleteSeats } from "@/actions/seats";

interface BulkDeleteSeatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  floors: number[];
}

export function BulkDeleteSeatDialog({ open, onOpenChange, onSuccess, floors }: BulkDeleteSeatDialogProps) {
  const [loading, setLoading] = useState(false);
  const [floor, setFloor] = useState<number | "all">("all");

  const handleSubmit = async () => {
    if (!confirm(floor === "all" ? "Are you sure you want to delete ALL unoccupied seats across all floors?" : `Are you sure you want to delete ALL unoccupied seats on Floor ${floor}?`)) return;

    setLoading(true);
    const floorParam = floor === "all" ? undefined : floor;
    const result = await bulkDeleteSeats(floorParam);
    
    if ("error" in result) {
      toast.error(result.error);
    } else {
      toast.success(`${result.count} unoccupied seat(s) deleted successfully`);
      onSuccess();
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Bulk Delete Seats</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            This will permanently delete all <strong>unoccupied</strong> seats. Seats that are currently assigned to students cannot be deleted and will be skipped.
          </p>

          <div className="space-y-1.5">
            <Label>Select Floor</Label>
            <Select onValueChange={(v) => setFloor(v === "all" ? "all" : parseInt(v))} defaultValue="all">
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Floors</SelectItem>
                {floors.map((f) => (
                  <SelectItem key={f} value={String(f)}>Floor {f}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant="destructive" onClick={handleSubmit} loading={loading}>
            Delete Seats
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
