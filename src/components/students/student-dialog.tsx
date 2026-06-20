"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { motion } from "framer-motion";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { studentSchema } from "@/schemas";
import { createStudent, updateStudent } from "@/actions/students";
import { getSeats } from "@/actions/seats";
import type { StudentFormData } from "@/schemas";
import { SEAT_STATUS_COLORS } from "@/constants";
import { cn } from "@/lib/utils";
import { ShiftSelector } from "@/components/shifts/shift-selector";

interface Shift { id: string; name: string; startTime: string; endTime: string; color: string; }
interface Seat { id: string; seatNumber: string; floor: number; status: string; seatType: string; students?: { fullName: string }[]; }

// ── STABLE FEE INPUT — defined OUTSIDE parent component so it NEVER re-mounts ──
// This is the definitive fix: defining FeeInput inside StudentDialog caused re-mount on every parent state change
interface StableFeeInputProps {
  label: string;
  inputRef: React.RefObject<HTMLInputElement | null>;
  defaultValue?: number;
  required?: boolean;
}

function StableFeeInput({ label, inputRef, defaultValue, required }: StableFeeInputProps) {
  return (
    <div className="space-y-1.5">
      <label className={`text-sm font-medium leading-none${required ? " after:content-['*'] after:text-destructive after:ml-0.5" : ""}`}>
        {label}
      </label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm pointer-events-none select-none z-10">
          ₹
        </span>
        <input
          ref={inputRef}
          type="text"
          inputMode="numeric"
          defaultValue={defaultValue && defaultValue > 0 ? String(defaultValue) : ""}
          placeholder="0"
          autoComplete="off"
          className="flex h-10 w-full rounded-lg border border-input bg-background pl-7 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 transition-colors"
          onKeyDown={(e) => {
            // Allow: digits, backspace, delete, tab, enter, dot, arrow keys
            const allowed = ["Backspace", "Delete", "Tab", "Enter", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End", "."];
            if (!allowed.includes(e.key) && !/^\d$/.test(e.key)) {
              e.preventDefault();
            }
            // Prevent second dot
            if (e.key === "." && (e.currentTarget.value.includes("."))) {
              e.preventDefault();
            }
          }}
        />
      </div>
    </div>
  );
}

interface StudentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  student?: Partial<StudentFormData & { id: string }> | null;
  onSuccess: () => void;
  shifts: Shift[];
}

export function StudentDialog({ open, onOpenChange, student, onSuccess, shifts }: StudentDialogProps) {
  const [loading, setLoading] = useState(false);
  const [seats, setSeats] = useState<Seat[]>([]);
  const [seatsLoading, setSeatsLoading] = useState(false);
  const [floorFilter, setFloorFilter] = useState<number | "all">("all");
  // Fee refs — NO STATE, so typing never causes re-render or focus loss
  const monthlyFeeRef = useRef<HTMLInputElement>(null);
  const depositRef = useRef<HTMLInputElement>(null);
  const discountRef = useRef<HTMLInputElement>(null);
  const isEdit = !!student?.id;

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<StudentFormData>({
    resolver: zodResolver(studentSchema) as import("react-hook-form").Resolver<StudentFormData>,
    defaultValues: { monthlyFee: 0, depositAmount: 0, discountAmount: 0 },
  });

  const selectedShiftId = watch("shiftId");
  const selectedSeatId = watch("seatId");

  useEffect(() => {
    if (!open) return;
    if (student) {
      reset({
        fullName: student.fullName ?? "",
        fatherName: student.fatherName ?? "",
        motherName: student.motherName ?? "",
        email: student.email ?? "",
        phone: student.phone ?? "",
        whatsappNumber: student.whatsappNumber ?? "",
        emergencyContact: student.emergencyContact ?? "",
        address: student.address ?? "",
        city: student.city ?? "",
        state: student.state ?? "",
        pincode: student.pincode ?? "",
        gender: student.gender ?? "",
        occupation: student.occupation ?? "",
        institution: student.institution ?? "",
        shiftId: student.shiftId ?? undefined,
        seatId: student.seatId ?? undefined,
        monthlyFee: student.monthlyFee ?? 0,
        depositAmount: student.depositAmount ?? 0,
        discountAmount: student.discountAmount ?? 0,
        notes: student.notes ?? "",
      });
      // Sync fee ref values
      if (monthlyFeeRef.current) monthlyFeeRef.current.value = student.monthlyFee ? String(student.monthlyFee) : "";
      if (depositRef.current) depositRef.current.value = student.depositAmount ? String(student.depositAmount) : "";
      if (discountRef.current) discountRef.current.value = student.discountAmount ? String(student.discountAmount) : "";
    } else {
      reset({ monthlyFee: 0, depositAmount: 0, discountAmount: 0 });
      if (monthlyFeeRef.current) monthlyFeeRef.current.value = "";
      if (depositRef.current) depositRef.current.value = "";
      if (discountRef.current) discountRef.current.value = "";
    }
  }, [open, student, reset]);

  const loadSeats = useCallback(async () => {
    setSeatsLoading(true);
    const result = await getSeats(selectedShiftId || undefined);
    if (!("error" in result)) setSeats(result.seats as Seat[]);
    setSeatsLoading(false);
  }, [selectedShiftId]);

  useEffect(() => { if (open) loadSeats(); }, [open, loadSeats]);

  const onSubmit = async (data: StudentFormData) => {
    // Read fee values directly from DOM refs — no state involved
    const fee = parseFloat(monthlyFeeRef.current?.value || "0") || 0;
    const deposit = parseFloat(depositRef.current?.value || "0") || 0;
    const discount = parseFloat(discountRef.current?.value || "0") || 0;
    data.monthlyFee = fee;
    data.depositAmount = deposit;
    data.discountAmount = discount;

    setLoading(true);
    try {
      const result = isEdit && student?.id
        ? await updateStudent(student.id, data)
        : await createStudent(data);
      if ("error" in result) toast.error(result.error);
      else { toast.success(isEdit ? "Student updated!" : "Student added!"); onSuccess(); }
    } catch { toast.error("Something went wrong"); }
    finally { setLoading(false); }
  };

  // Simple text field
  const TF = ({ label, name, type = "text", placeholder, required }: {
    label: string; name: keyof StudentFormData; type?: string; placeholder?: string; required?: boolean;
  }) => (
    <div className="space-y-1.5">
      <Label className={required ? "after:content-['*'] after:text-destructive after:ml-0.5" : ""}>{label}</Label>
      <Input type={type} placeholder={placeholder} className={errors[name] ? "border-destructive" : ""} {...register(name)} />
      {errors[name] && <p className="text-xs text-destructive">{errors[name]?.message as string}</p>}
    </div>
  );

  // ── Seat map ──
  const floors = Array.from(new Set(seats.map((s) => s.floor))).sort((a, b) => a - b);
  const visibleSeats = floorFilter === "all" ? seats : seats.filter((s) => s.floor === floorFilter);

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onOpenChange(false); }}>
      <DialogContent
        className="max-w-2xl p-0 gap-0"
        style={{ maxHeight: "90vh", display: "flex", flexDirection: "column" }}
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader className="px-6 py-4 border-b border-border/50 shrink-0">
          <DialogTitle>{isEdit ? "Edit Student" : "Add New Student"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
          {/* ── Scrollable area ── */}
          <div style={{ overflowY: "auto", flex: 1, padding: "16px 24px" }}>
            <Tabs defaultValue="personal">
              <TabsList className="mb-5 w-full sticky top-0 z-10 bg-background">
                <TabsTrigger value="personal" className="flex-1">Personal</TabsTrigger>
                <TabsTrigger value="seat" className="flex-1">Seat & Shift</TabsTrigger>
                <TabsTrigger value="fees" className="flex-1">Fees</TabsTrigger>
              </TabsList>

              {/* ── Personal Info ── */}
              <TabsContent value="personal" className="space-y-4 mt-0">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <TF label="Full Name" name="fullName" placeholder="Rahul Kumar" required />
                  <TF label="Email" name="email" type="email" placeholder="student@email.com" required />
                  <TF label="Phone" name="phone" placeholder="9876543210" required />
                  <TF label="WhatsApp" name="whatsappNumber" placeholder="9876543210" />
                  <TF label="Father's Name" name="fatherName" placeholder="Father's name" />
                  <TF label="Mother's Name" name="motherName" placeholder="Mother's name" />
                  <TF label="Emergency Contact" name="emergencyContact" placeholder="Emergency phone" />
                  <div className="space-y-1.5">
                    <Label>Gender</Label>
                    <Select onValueChange={(v) => setValue("gender", v)} defaultValue={student?.gender ?? undefined}>
                      <SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Male">Male</SelectItem>
                        <SelectItem value="Female">Female</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <TF label="Occupation" name="occupation" placeholder="Student / Working" />
                  <TF label="Institution" name="institution" placeholder="College / Company" />
                </div>
                <TF label="Address" name="address" placeholder="Full address" />
                <div className="grid grid-cols-3 gap-4">
                  <TF label="City" name="city" placeholder="City" />
                  <TF label="State" name="state" placeholder="State" />
                  <TF label="Pincode" name="pincode" placeholder="400001" />
                </div>
              </TabsContent>

              {/* ── Seat & Shift ── */}
              <TabsContent value="seat" className="space-y-4 mt-0">
                {/* Shift — only A, B, C, Full Day */}
                <div className="space-y-1.5">
                  <Label>Shift *</Label>
                  <ShiftSelector
                    shifts={shifts}
                    value={selectedShiftId ?? ""}
                    onChange={(id) => { setValue("shiftId", id); setValue("seatId", ""); }}
                  />
                </div>

                {/* Seat map */}
                <div className="space-y-1.5">
                  <Label>Seat</Label>
                  <div className="rounded-xl border border-border/50 bg-muted/20 p-3 space-y-3">
                    {/* Legend */}
                    <div className="flex flex-wrap gap-3">
                      {[
                        { s: "AVAILABLE", l: "Available" },
                        { s: "OCCUPIED", l: "Occupied" },
                        { s: "RESERVED", l: "Reserved" },
                        { s: "MAINTENANCE", l: "Maintenance" },
                      ].map(({ s, l }) => {
                        const c = SEAT_STATUS_COLORS[s as keyof typeof SEAT_STATUS_COLORS];
                        return (
                          <div key={s} className="flex items-center gap-1 text-xs text-muted-foreground">
                            <div className={`w-2.5 h-2.5 rounded-sm ${c.dot}`} />
                            {l}
                          </div>
                        );
                      })}
                      {floors.length > 1 && (
                        <div className="flex gap-1 ml-auto">
                          {["all", ...floors].map((f) => (
                            <button
                              key={String(f)}
                              type="button"
                              onClick={() => setFloorFilter(f as number | "all")}
                              className={cn(
                                "text-xs px-2 py-0.5 rounded-full border transition-colors",
                                floorFilter === f
                                  ? "bg-indigo-500 text-white border-indigo-500"
                                  : "border-border text-muted-foreground hover:border-indigo-400"
                              )}
                            >
                              {f === "all" ? "All" : `F${f}`}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Seats grid */}
                    {seatsLoading ? (
                      <p className="text-xs text-muted-foreground text-center py-4">Loading seats...</p>
                    ) : visibleSeats.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-4">
                        {selectedShiftId ? "No seats for this shift" : "Select a shift to see available seats"}
                      </p>
                    ) : (
                      <TooltipProvider delayDuration={50}>
                        {floors.filter((f) => floorFilter === "all" || f === floorFilter).map((floor) => {
                          const fs = visibleSeats.filter((s) => s.floor === floor);
                          return (
                            <div key={floor}>
                              {floors.length > 1 && (
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Floor {floor}</span>
                                  <div className="flex-1 h-px bg-border/40" />
                                </div>
                              )}
                              <div className="flex flex-wrap gap-1.5">
                                {fs.map((seat) => {
                                  const isSelected = selectedSeatId === seat.id;
                                  const isDisabled = seat.status === "OCCUPIED" || seat.status === "MAINTENANCE";
                                  const c = SEAT_STATUS_COLORS[seat.status as keyof typeof SEAT_STATUS_COLORS] ?? SEAT_STATUS_COLORS.MAINTENANCE;
                                  return (
                                    <Tooltip key={seat.id}>
                                      <TooltipTrigger asChild>
                                        <button
                                          type="button"
                                          disabled={isDisabled}
                                          onClick={() => setValue("seatId", isSelected ? "" : seat.id)}
                                          className={cn(
                                            "w-10 h-10 rounded-lg border text-[10px] font-bold transition-all duration-150 select-none",
                                            isSelected
                                              ? "bg-indigo-500 border-indigo-400 text-white ring-2 ring-indigo-500/40 scale-110"
                                              : isDisabled
                                              ? `${c.bg} ${c.border} ${c.text} opacity-60 cursor-not-allowed`
                                              : `${c.bg} ${c.border} ${c.text} hover:scale-105 cursor-pointer`
                                          )}
                                        >
                                          {seat.seatNumber}
                                        </button>
                                      </TooltipTrigger>
                                      <TooltipContent side="top" className="text-xs">
                                        <p className="font-semibold">Seat {seat.seatNumber}</p>
                                        <p className="text-muted-foreground">Floor {seat.floor}</p>
                                        <p className={c.text}>{seat.status}</p>
                                        {seat.students?.[0] && <p>👤 {seat.students[0].fullName}</p>}
                                      </TooltipContent>
                                    </Tooltip>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </TooltipProvider>
                    )}

                    {selectedSeatId && (
                      <div className="flex items-center gap-2 p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
                        <div className="w-2 h-2 rounded-full bg-indigo-500 shrink-0" />
                        <p className="text-xs text-indigo-400 font-medium">
                          Seat {seats.find((s) => s.id === selectedSeatId)?.seatNumber} selected
                        </p>
                        <button type="button" onClick={() => setValue("seatId", "")} className="ml-auto text-xs text-muted-foreground hover:text-foreground">Clear</button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Dates + Notes */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Joining Date</Label>
                    <Input type="date" {...register("joiningDate")} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Expiry Date</Label>
                    <Input type="date" {...register("expiryDate")} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Notes</Label>
                  <Textarea placeholder="Additional notes..." rows={2} {...register("notes")} />
                </div>
              </TabsContent>

              {/* ── Fees ── */}
              <TabsContent value="fees" className="space-y-4 mt-0">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <StableFeeInput
                    label="Monthly Fee (₹)"
                    inputRef={monthlyFeeRef}
                    defaultValue={student?.monthlyFee}
                    required
                  />
                  <StableFeeInput
                    label="Security Deposit (₹)"
                    inputRef={depositRef}
                    defaultValue={student?.depositAmount}
                  />
                  <StableFeeInput
                    label="Discount (₹)"
                    inputRef={discountRef}
                    defaultValue={student?.discountAmount}
                  />
                </div>

                <div className="p-4 rounded-xl bg-muted/40 border border-border/50 space-y-2">
                  <p className="text-sm font-semibold">Fee Summary</p>
                  <p className="text-xs text-muted-foreground">Summary will show after you save.</p>
                </div>

                <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-xs text-blue-400">
                  💡 Monthly fee cycle starts from joining date. Payment goes directly to library owner's Razorpay account.
                </div>
              </TabsContent>
            </Tabs>
          </div>

          <DialogFooter className="px-6 py-4 border-t border-border/50 shrink-0 gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" loading={loading}>{isEdit ? "Update Student" : "Add Student"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
