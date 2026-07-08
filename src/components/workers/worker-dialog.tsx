"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createWorker, updateWorker } from "@/actions/workers";
import { getShifts } from "@/actions/shifts";

interface Shift {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  color: string;
}

interface WorkerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  worker?: {
    id?: string;
    name?: string;
    phone?: string;
    email?: string;
    shiftIds?: string[];
  } | null;
  onSuccess: () => void;
}

export function WorkerDialog({ open, onOpenChange, worker, onSuccess }: WorkerDialogProps) {
  const [loading, setLoading] = useState(false);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [shiftsLoading, setShiftsLoading] = useState(false);

  // Plain local state — no react-hook-form watch() needed
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [selectedShiftIds, setSelectedShiftIds] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const isEdit = !!worker?.id;

  // Load shifts when dialog opens
  useEffect(() => {
    if (!open) return;
    setShiftsLoading(true);
    getShifts().then((result) => {
      if (result.shifts) setShifts(result.shifts as Shift[]);
      setShiftsLoading(false);
    }).catch(() => setShiftsLoading(false));
  }, [open]);

  // Populate form when dialog opens
  useEffect(() => {
    if (!open) return;
    setName(worker?.name ?? "");
    setPhone(worker?.phone ?? "");
    setEmail(worker?.email ?? "");
    setSelectedShiftIds(worker?.shiftIds ?? []);
    setErrors({});
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleShift = (shiftId: string) => {
    setSelectedShiftIds((prev) =>
      prev.includes(shiftId) ? prev.filter((id) => id !== shiftId) : [...prev, shiftId]
    );
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!name.trim() || name.trim().length < 2) newErrors.name = "Name must be at least 2 characters";
    if (!phone.trim() || phone.trim().length < 10) newErrors.phone = "Enter a valid 10-digit phone number";
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) newErrors.email = "Invalid email address";
    if (selectedShiftIds.length === 0) newErrors.shiftIds = "Select at least one shift";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      const data = { name: name.trim(), phone: phone.trim(), email: email.trim() || undefined, shiftIds: selectedShiftIds };
      const res = isEdit && worker?.id ? await updateWorker(worker.id, data) : await createWorker(data);

      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success(isEdit ? "Team member updated!" : "Team member registered!");
        onSuccess();
        onOpenChange(false);
      }
    } catch {
      toast.error("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] border-border bg-card">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
            {isEdit ? "Edit Team Member Details" : "Register New Team Member"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 py-2">
          {/* Name */}
          <div className="space-y-1.5">
            <Label htmlFor="w-name" className="text-sm font-medium">
              Team Member Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="w-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Rahul Sharma"
              disabled={loading}
              className="bg-background border-border/60 focus:border-indigo-500/50"
            />
            {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
          </div>

          {/* Phone */}
          <div className="space-y-1.5">
            <Label htmlFor="w-phone" className="text-sm font-medium">
              Phone Number <span className="text-destructive">*</span>
            </Label>
            <Input
              id="w-phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. 9876543210"
              disabled={loading}
              className="bg-background border-border/60 focus:border-indigo-500/50"
            />
            {errors.phone && <p className="text-xs text-destructive">{errors.phone}</p>}
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <Label htmlFor="w-email" className="text-sm font-medium">
              Email Address (Optional)
            </Label>
            <Input
              id="w-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. rahul@example.com"
              disabled={loading}
              className="bg-background border-border/60 focus:border-indigo-500/50"
            />
            {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
          </div>

          {/* Shifts */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              Assign Shifts <span className="text-destructive">*</span>
            </Label>
            {shiftsLoading ? (
              <div className="py-4 text-center text-xs text-muted-foreground animate-pulse">Loading shifts...</div>
            ) : shifts.length === 0 ? (
              <div className="py-2 text-xs text-amber-400">
                No active shifts found. Please create shifts in the Shifts tab first.
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 max-h-[160px] overflow-y-auto pr-1">
                {shifts.map((shift) => {
                  const isChecked = selectedShiftIds.includes(shift.id);
                  return (
                    <button
                      key={shift.id}
                      type="button"
                      onClick={() => toggleShift(shift.id)}
                      className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-all duration-200 ${
                        isChecked
                          ? "bg-indigo-500/10 border-indigo-500 text-indigo-400"
                          : "border-border/60 hover:bg-accent/40 text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {/* Custom visual checkbox */}
                      <span
                        className={`w-4 h-4 rounded-sm border shrink-0 flex items-center justify-center transition-colors ${
                          isChecked
                            ? "bg-indigo-600 border-indigo-600"
                            : "border-border bg-background"
                        }`}
                      >
                        {isChecked && (
                          <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 12 12">
                            <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold truncate">{shift.name}</p>
                        <p className="text-[10px] opacity-80">{shift.startTime} - {shift.endTime}</p>
                      </div>
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
                        style={{ backgroundColor: shift.color }}
                      />
                    </button>
                  );
                })}
              </div>
            )}
            {errors.shiftIds && <p className="text-xs text-destructive">{errors.shiftIds}</p>}
          </div>

          <DialogFooter className="pt-4 border-t border-border/40 gap-2 sm:gap-0">
            <Button type="button" variant="ghost" disabled={loading} onClick={() => onOpenChange(false)} className="hover:bg-accent/40">
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-indigo-600 text-white hover:bg-indigo-700 font-semibold shadow-lg shadow-indigo-600/20"
            >
              {loading ? "Saving..." : isEdit ? "Update Details" : "Register Team Member"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
