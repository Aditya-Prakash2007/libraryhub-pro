"use client";

import { useEffect, useState, useCallback, useRef, forwardRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { RefreshCw } from "lucide-react";
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
import { getShifts } from "@/actions/shifts";
import { recordManualPayment } from "@/actions/payments";
import { getWorkers } from "@/actions/workers";
import { useLoading } from "@/providers/loading-provider";
import type { StudentFormData } from "@/schemas";
import { SEAT_STATUS_COLORS } from "@/constants";
import { cn } from "@/lib/utils";
import { ShiftSelector } from "@/components/shifts/shift-selector";

interface Shift { id: string; name: string; startTime: string; endTime: string; color: string; }
interface Seat {
  id: string;
  seatNumber: string;
  floor: number;
  status: string;
  seatType: string;
  students?: {
    id: string;
    fullName: string;
    shift?: {
      name: string;
      startTime?: string;
      endTime?: string;
    } | null;
  }[];
}

interface StableFeeInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  required?: boolean;
  error?: string;
}

const StableFeeInput = forwardRef<HTMLInputElement, StableFeeInputProps>(
  ({ label, required, error, ...props }, ref) => {
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
            ref={ref}
            type="number"
            step="any"
            placeholder="0"
            autoComplete="off"
            className="flex h-10 w-full rounded-lg border border-input bg-background pl-7 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 transition-colors"
            {...props}
          />
        </div>
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
    );
  }
);
StableFeeInput.displayName = "StableFeeInput";

function isSeatOccupiedForShift(
  seat: Seat,
  selectedShift: Shift | undefined,
  currentStudentId?: string | null
): boolean {
  if (seat.status === "MAINTENANCE") return true;
  if (!selectedShift) return false;

  const activeStudents = seat.students?.filter(st => {
    if (currentStudentId && st.id === currentStudentId) return false;
    return true;
  }) || [];

  if (activeStudents.length === 0) return false;

  const toMin = (timeStr: string) => {
    const [h, m] = timeStr.split(":").map(Number);
    return h * 60 + m;
  };
  const isFull = (name: string) => {
    const n = name.toLowerCase();
    return n === "full day" || n === "full" || n === "fullday";
  };

  const selStart = toMin(selectedShift.startTime);
  let selEnd = toMin(selectedShift.endTime);
  if (selEnd <= selStart) selEnd += 24 * 60;
  const selIsFull = isFull(selectedShift.name);

  for (const student of activeStudents) {
    const studentShift = student.shift;
    if (!studentShift) continue;

    if (selIsFull || isFull(studentShift.name)) {
      return true;
    }

    const stStart = toMin(studentShift.startTime || "00:00");
    let stEnd = toMin(studentShift.endTime || "00:00");
    if (stEnd <= stStart) stEnd += 24 * 60;

    if (selStart < stEnd && stStart < selEnd) {
      return true;
    }
  }

  return false;
}

interface StudentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  student?: Partial<StudentFormData & { id: string }> | null;
  onSuccess: () => void;
  shifts?: Shift[]; // Optional — dialog loads fresh shifts itself
}

export function StudentDialog({ open, onOpenChange, student, onSuccess, shifts: propShifts = [] }: StudentDialogProps) {
  const [loading, setLoading] = useState(false);
  const [shifts, setShifts] = useState<Shift[]>(propShifts);
  const [shiftsLoading, setShiftsLoading] = useState(false);
  const [seats, setSeats] = useState<Seat[]>([]);
  const [seatsLoading, setSeatsLoading] = useState(false);
  const [floorFilter, setFloorFilter] = useState<number | "all">("all");
  const isEdit = !!student?.id;
  const { setIsLoading } = useLoading();

  // Payment integration states
  const [createdStudentInfo, setCreatedStudentInfo] = useState<{
    id: string;
    fullName: string;
    payableAmount: number;
  } | null>(null);
  const [paymentType, setPaymentType] = useState<"MONTHLY" | "REGISTRATION" | "OTHER">("MONTHLY");
  const [paymentMode, setPaymentMode] = useState<"CASH" | "UPI" | "BANK_TRANSFER" | "CHEQUE">("CASH");
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentDescription, setPaymentDescription] = useState<string>("");
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentWorkerId, setPaymentWorkerId] = useState<string>("");
  const [workers, setWorkers] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    if (createdStudentInfo) {
      setPaymentAmount(createdStudentInfo.payableAmount);
      setPaymentDescription(`First month fee - ${createdStudentInfo.fullName}`);
    }
  }, [createdStudentInfo]);

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
  const monthlyFeeValue = watch("monthlyFee") ?? 0;
  const discountAmountValue = watch("discountAmount") ?? 0;
  const totalPayableValue = Math.max(0, monthlyFeeValue - discountAmountValue);

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
    } else {
      reset({ monthlyFee: 0, depositAmount: 0, discountAmount: 0 });
    }
  }, [open, student, reset]);

  const loadSeats = useCallback(async () => {
    setSeatsLoading(true);
    const result = await getSeats(selectedShiftId || undefined);
    if (!("error" in result)) setSeats(result.seats as Seat[]);
    setSeatsLoading(false);
  }, [selectedShiftId]);

  // Load fresh shifts every time dialog opens — captures any new/updated shifts
  const loadShifts = useCallback(async () => {
    setShiftsLoading(true);
    const result = await getShifts();
    if (!("error" in result)) setShifts(result.shifts as Shift[]);
    setShiftsLoading(false);
  }, []);

  useEffect(() => {
    if (open) {
      loadShifts();
      loadSeats();
      // Load team members for payment attribution
      getWorkers().then((res) => {
        if (!("error" in res)) {
          setWorkers(res.workers.map((w: Record<string, unknown>) => ({ id: w.id as string, name: w.name as string })));
        }
      });
    }
  }, [open, loadShifts, loadSeats]);

  const onSubmit = async (data: StudentFormData) => {
    data.depositAmount = 0; // Removed security deposit

    // Validate mandatory fields
    if (!data.shiftId) {
      toast.error("Please select a shift (Seat & Shift tab)");
      return;
    }
    if (!data.seatId) {
      toast.error("Please select a seat (Seat & Shift tab)");
      return;
    }
    if (!data.monthlyFee || data.monthlyFee <= 0) {
      toast.error("Monthly fee must be greater than 0 (Fees tab)");
      return;
    }

    setLoading(true);
    setIsLoading(true);
    try {
      const result = isEdit && student?.id
        ? await updateStudent(student.id, data)
        : await createStudent(data);
      if ("error" in result) toast.error(result.error);
      else {
        toast.success(isEdit ? "Student updated!" : "Student added!");
        if (!isEdit && result && "student" in result && result.student) {
          const stObj = result.student as any;
          setCreatedStudentInfo({
            id: stObj.id as string,
            fullName: stObj.fullName as string,
            payableAmount: Math.max(0, (stObj.monthlyFee as number) - ((stObj.discountAmount as number) || 0)),
          });
        } else {
          onSuccess();
        }
      }
    } catch { toast.error("Something went wrong"); }
    finally {
      setLoading(false);
      setIsLoading(false);
    }
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

  if (createdStudentInfo) {
    return (
      <Dialog open={open} onOpenChange={(v) => { if (!v) { onOpenChange(false); onSuccess(); } }}>
        <DialogContent
          className="max-w-md bg-card border-border p-6"
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
              Record Payment
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400 font-medium">
              🎉 Student added successfully! Set up their payment below.
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Payment Type *</Label>
                <Select
                  value={paymentType}
                  onValueChange={(v) => setPaymentType(v as any)}
                >
                  <SelectTrigger className="bg-background border-border/60 text-sm h-10"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-slate-900 border-border">
                    <SelectItem value="MONTHLY">Monthly</SelectItem>
                    <SelectItem value="REGISTRATION">Registration</SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Payment Mode *</Label>
                <Select
                  value={paymentMode}
                  onValueChange={(v) => setPaymentMode(v as any)}
                >
                  <SelectTrigger className="bg-background border-border/60 text-sm h-10"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-slate-900 border-border">
                    <SelectItem value="CASH">Cash</SelectItem>
                    <SelectItem value="UPI">UPI</SelectItem>
                    <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                    <SelectItem value="CHEQUE">Cheque</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Amount (₹) *</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm pointer-events-none select-none z-10 font-bold">
                  ₹
                </span>
                <Input
                  type="number"
                  step="any"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
                  className="bg-background border-border/60 pl-7 text-sm h-10"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Description</Label>
              <Input
                placeholder="e.g. Admission & first month fee"
                value={paymentDescription}
                onChange={(e) => setPaymentDescription(e.target.value)}
                className="bg-background border-border/60 text-sm h-10"
              />
            </div>

            {/* Team Member Selector */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Collected By (Team Member)</Label>
              <Select
                value={paymentWorkerId}
                onValueChange={(v) => setPaymentWorkerId(v === "__none__" ? "" : v)}
              >
                <SelectTrigger className="bg-background border-border/60 text-sm h-10">
                  <SelectValue placeholder="Select team member (optional)" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-border">
                  <SelectItem value="__none__">— No one selected —</SelectItem>
                  {workers.map((w) => (
                    <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2 border-t border-border/40 pt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setCreatedStudentInfo(null);
                onOpenChange(false);
                onSuccess();
              }}
              className="hover:bg-accent/40"
            >
              Skip / Close
            </Button>
            <Button
              type="button"
              loading={paymentLoading}
              onClick={async () => {
                setPaymentLoading(true);
                setIsLoading(true);
                try {
                  const res = await recordManualPayment({
                    studentId: createdStudentInfo.id,
                    amount: paymentAmount,
                    paymentType: paymentType,
                    paymentMode: paymentMode,
                    description: paymentDescription || undefined,
                    collectedBy: paymentWorkerId || undefined,
                  });
                  if ("error" in res) {
                     toast.error(res.error);
                  } else {
                     toast.success("Payment recorded successfully!");
                     setCreatedStudentInfo(null);
                     onOpenChange(false);
                     onSuccess();
                  }
                } catch {
                   toast.error("Failed to record payment");
                } finally {
                   setPaymentLoading(false);
                   setIsLoading(false);
                }
              }}
              className="bg-indigo-600 text-white hover:bg-indigo-700 font-semibold shadow-lg shadow-indigo-600/20"
            >
              Record Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

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
                {/* Shift — mandatory, loads fresh from DB */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="after:content-['*'] after:text-destructive after:ml-0.5">
                      Shift
                    </Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs text-muted-foreground px-2"
                      onClick={loadShifts}
                      disabled={shiftsLoading}
                    >
                      <RefreshCw className={cn("w-3 h-3 mr-1", shiftsLoading && "animate-spin")} />
                      {shiftsLoading ? "Loading..." : "Refresh"}
                    </Button>
                  </div>
                  {shifts.length === 0 && !shiftsLoading ? (
                    <div className="p-3 rounded-lg border border-amber-500/30 bg-amber-500/10 text-xs text-amber-400">
                      ⚠️ No shifts found. Create shifts first in the{" "}
                      <a href="/admin/shifts" target="_blank" rel="noopener noreferrer" className="underline font-medium">
                        Shifts page
                      </a>
                      , then click Refresh.
                    </div>
                  ) : (
                    <ShiftSelector
                      shifts={shifts}
                      value={selectedShiftId ?? ""}
                      onChange={(id) => { setValue("shiftId", id, { shouldValidate: true }); setValue("seatId", ""); }}
                    />
                  )}
                  {errors.shiftId && (
                    <p className="text-xs text-destructive">⚠️ {errors.shiftId.message}</p>
                  )}
                </div>

                {/* Seat map — mandatory */}
                <div className="space-y-1.5">
                  <Label className="after:content-['*'] after:text-destructive after:ml-0.5">Seat</Label>
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
                      {floors.length > 0 && (
                        <div className="flex gap-1 ml-auto">
                          <span className="text-xs text-muted-foreground self-center mr-1">Floor:</span>
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
                          const fs = visibleSeats
                            .filter((s) => s.floor === floor)
                            .sort((a, b) => a.seatNumber.localeCompare(b.seatNumber, undefined, { numeric: true, sensitivity: 'base' }));
                          return (
                            <div key={floor}>
                              {floors.length > 0 && (
                                <div className="flex items-center gap-2 mb-2 mt-4 first:mt-0">
                                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Floor {floor}</span>
                                  <div className="flex-1 h-px bg-border/40" />
                                </div>
                              )}
                              <div className="flex flex-wrap gap-1.5">
                                {fs.map((seat) => {
                                  const isSelected = selectedSeatId === seat.id;
                                  const selectedShift = shifts.find(s => s.id === selectedShiftId);
                                  
                                  // Check if occupied for this shift using our shift overlap helper (excluding the current student if editing)
                                  const isOccupied = isSeatOccupiedForShift(seat, selectedShift, student?.id);
                                  
                                  const effectiveStatus = seat.status === "MAINTENANCE" ? "MAINTENANCE" : (isOccupied ? "OCCUPIED" : "AVAILABLE");
                                  const isDisabled = effectiveStatus === "OCCUPIED" || effectiveStatus === "MAINTENANCE";
                                  const c = SEAT_STATUS_COLORS[effectiveStatus as keyof typeof SEAT_STATUS_COLORS] ?? SEAT_STATUS_COLORS.AVAILABLE;

                                  const otherBookedShifts = Array.from(new Set(
                                    seat.students?.filter(st => !student?.id || st.id !== student.id).map(st => st.shift?.name).filter(Boolean)
                                  ));
                                  
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
                                        <p className={c.text}>{effectiveStatus}</p>
                                        {otherBookedShifts.length > 0 && (
                                          <p className="text-amber-400">Reserved in: {otherBookedShifts.join(", ")}</p>
                                        )}
                                        {seat.students?.filter(st => !student?.id || st.id !== student.id).map((st, i) => (
                                          <p key={i}>👤 {st.fullName} {st.shift?.name ? `(${st.shift.name})` : ""}</p>
                                        ))}
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
                        <button
                          type="button"
                          onClick={() => setValue("seatId", "", { shouldValidate: true })}
                          className="ml-auto text-xs text-muted-foreground hover:text-foreground"
                        >
                          Clear
                        </button>
                      </div>
                    )}
                  </div>
                  {errors.seatId && (
                    <p className="text-xs text-destructive mt-1">⚠️ {errors.seatId.message}</p>
                  )}
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
                    required
                    {...register("monthlyFee", { valueAsNumber: true })}
                    error={errors.monthlyFee?.message}
                  />
                  <StableFeeInput
                    label="Discount (₹)"
                    {...register("discountAmount", { valueAsNumber: true })}
                    error={errors.discountAmount?.message}
                  />
                </div>

                <div className="p-4 rounded-xl bg-muted/40 border border-border/50 space-y-2">
                  <p className="text-sm font-semibold">Fee Summary</p>
                  <div className="space-y-1 text-sm" id="fee-summary-box">
                    <div className="flex justify-between text-muted-foreground">
                      <span>Monthly Fee</span>
                      <span>₹{monthlyFeeValue ? monthlyFeeValue.toLocaleString("en-IN") : "0"}</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Discount</span>
                      <span className="text-emerald-500">
                        − ₹{discountAmountValue ? discountAmountValue.toLocaleString("en-IN") : "0"}
                      </span>
                    </div>
                    <div className="flex justify-between font-semibold border-t border-border/50 pt-1 mt-1">
                      <span>Total Payable / Month</span>
                      <span className="text-indigo-400">
                        ₹{totalPayableValue ? totalPayableValue.toLocaleString("en-IN") : "0"}
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">Live total updates as you type</p>
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
