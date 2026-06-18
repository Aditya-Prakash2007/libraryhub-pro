"use client";

import { useEffect, useState, useCallback } from "react";
import { useForm, Controller } from "react-hook-form";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { studentSchema } from "@/schemas";
import { createStudent, updateStudent } from "@/actions/students";
import { getSeats } from "@/actions/seats";
import type { StudentFormData } from "@/schemas";
import { SEAT_STATUS_COLORS } from "@/constants";
import { cn } from "@/lib/utils";
import { ShiftSelector } from "@/components/shifts/shift-selector";

interface Shift {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
}

interface Seat {
  id: string;
  seatNumber: string;
  floor: number;
  status: string;
  seatType: string;
  students?: { fullName: string }[];
}

interface StudentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  student?: Partial<StudentFormData & { id: string }> | null;
  onSuccess: () => void;
  shifts: Shift[];
}

export function StudentDialog({
  open, onOpenChange, student, onSuccess, shifts,
}: StudentDialogProps) {
  const [loading, setLoading] = useState(false);
  const [seats, setSeats] = useState<Seat[]>([]);
  const [seatsLoading, setSeatsLoading] = useState(false);
  const [floorFilter, setFloorFilter] = useState<number | "all">("all");
  const isEdit = !!student?.id;

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    control,
    formState: { errors },
  } = useForm<StudentFormData>({
    resolver: zodResolver(studentSchema) as import("react-hook-form").Resolver<StudentFormData>,
    defaultValues: {
      fullName: "",
      email: "",
      phone: "",
      monthlyFee: 0,
      depositAmount: 0,
      discountAmount: 0,
    },
  });

  const selectedShiftId = watch("shiftId");
  const selectedSeatId = watch("seatId");
  const monthlyFee = watch("monthlyFee") ?? 0;
  const depositAmount = watch("depositAmount") ?? 0;
  const discountAmount = watch("discountAmount") ?? 0;

  // Reset form on open
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

  // Load seats when dialog opens or shift changes
  const loadSeats = useCallback(async () => {
    setSeatsLoading(true);
    const result = await getSeats(selectedShiftId || undefined);
    if (!("error" in result)) {
      setSeats(result.seats as Seat[]);
    }
    setSeatsLoading(false);
  }, [selectedShiftId]);

  useEffect(() => {
    if (open) loadSeats();
  }, [open, loadSeats]);

  const onSubmit = async (data: StudentFormData) => {
    setLoading(true);
    try {
      const result = isEdit && student?.id
        ? await updateStudent(student.id, data)
        : await createStudent(data);

      if ("error" in result) {
        toast.error(result.error);
      } else {
        toast.success(isEdit ? "Student updated!" : "Student added!");
        onSuccess();
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  // Text field helper — uses Controller for proper controlled behaviour
  const TextField = ({
    label, name, type = "text", placeholder, required, colSpan,
  }: {
    label: string;
    name: keyof StudentFormData;
    type?: string;
    placeholder?: string;
    required?: boolean;
    colSpan?: boolean;
  }) => (
    <div className={cn("space-y-1.5", colSpan && "col-span-2 sm:col-span-1")}>
      <Label className={required ? "after:content-['*'] after:text-destructive after:ml-0.5" : ""}>
        {label}
      </Label>
      <Input
        type={type}
        placeholder={placeholder}
        className={errors[name] ? "border-destructive" : ""}
        {...register(name)}
      />
      {errors[name] && (
        <p className="text-xs text-destructive">{errors[name]?.message as string}</p>
      )}
    </div>
  );

  // Proper controlled number field — fixes FIX #3 (no focus loss / single-digit bug)
  const NumberField = ({
    label, name, placeholder, required,
  }: {
    label: string;
    name: "monthlyFee" | "depositAmount" | "discountAmount";
    placeholder?: string;
    required?: boolean;
  }) => (
    <div className="space-y-1.5">
      <Label className={required ? "after:content-['*'] after:text-destructive after:ml-0.5" : ""}>
        {label}
      </Label>
      <Controller
        control={control}
        name={name}
        render={({ field }) => (
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium text-sm">₹</span>
            <Input
              type="text"
              inputMode="decimal"
              placeholder={placeholder ?? "0"}
              className={cn("pl-7", errors[name] ? "border-destructive" : "")}
              value={field.value === 0 ? "" : String(field.value)}
              onChange={(e) => {
                const raw = e.target.value;
                // Allow empty (will be 0), digits and one decimal point
                if (raw === "" || raw === ".") {
                  field.onChange(0);
                  return;
                }
                if (/^\d*\.?\d*$/.test(raw)) {
                  const num = parseFloat(raw);
                  field.onChange(isNaN(num) ? 0 : num);
                }
              }}
              onBlur={field.onBlur}
            />
          </div>
        )}
      />
      {errors[name] && (
        <p className="text-xs text-destructive">{errors[name]?.message as string}</p>
      )}
    </div>
  );

  // Cinema-style seat map — FIX #4
  const floors = Array.from(new Set(seats.map((s) => s.floor))).sort((a, b) => a - b);
  const filteredSeats = floorFilter === "all" ? seats : seats.filter((s) => s.floor === floorFilter);

  const SeatMap = () => (
    <div className="space-y-4">
      {/* Legend + filters */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-3">
          {[
            { status: "AVAILABLE", label: "Available" },
            { status: "OCCUPIED", label: "Occupied" },
            { status: "RESERVED", label: "Reserved" },
            { status: "MAINTENANCE", label: "Maintenance" },
          ].map((item) => {
            const c = SEAT_STATUS_COLORS[item.status as keyof typeof SEAT_STATUS_COLORS];
            return (
              <div key={item.status} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <div className={`w-3 h-3 rounded-sm ${c.dot}`} />
                {item.label}
              </div>
            );
          })}
        </div>
        {floors.length > 1 && (
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={() => setFloorFilter("all")}
              className={cn(
                "text-xs px-2.5 py-1 rounded-full border transition-colors",
                floorFilter === "all" ? "bg-indigo-500 text-white border-indigo-500" : "border-border text-muted-foreground hover:border-indigo-500/50"
              )}
            >
              All
            </button>
            {floors.map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFloorFilter(f)}
                className={cn(
                  "text-xs px-2.5 py-1 rounded-full border transition-colors",
                  floorFilter === f ? "bg-indigo-500 text-white border-indigo-500" : "border-border text-muted-foreground hover:border-indigo-500/50"
                )}
              >
                F{f}
              </button>
            ))}
          </div>
        )}
      </div>

      {seatsLoading ? (
        <div className="py-8 text-center text-muted-foreground text-sm">Loading seats...</div>
      ) : filteredSeats.length === 0 ? (
        <div className="py-8 text-center text-muted-foreground text-sm">No seats found</div>
      ) : (
        <TooltipProvider delayDuration={50}>
          {floors
            .filter((f) => floorFilter === "all" || f === floorFilter)
            .map((floor) => {
              const floorSeats = filteredSeats.filter((s) => s.floor === floor);
              return (
                <div key={floor}>
                  {floors.length > 1 && (
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Floor {floor}</span>
                      <div className="flex-1 h-px bg-border/50" />
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2">
                    {floorSeats.map((seat) => {
                      const isSelected = selectedSeatId === seat.id;
                      const isAvailable = seat.status === "AVAILABLE";
                      const isDisabled = seat.status === "OCCUPIED" || seat.status === "MAINTENANCE";
                      const colors = SEAT_STATUS_COLORS[seat.status as keyof typeof SEAT_STATUS_COLORS] ?? SEAT_STATUS_COLORS.MAINTENANCE;
                      const assignedStudent = seat.students?.[0]?.fullName;

                      return (
                        <Tooltip key={seat.id}>
                          <TooltipTrigger asChild>
                            <motion.button
                              type="button"
                              whileHover={!isDisabled ? { scale: 1.12 } : {}}
                              whileTap={!isDisabled ? { scale: 0.95 } : {}}
                              disabled={isDisabled}
                              onClick={() => {
                                if (isDisabled) return;
                                setValue("seatId", isSelected ? "" : seat.id);
                              }}
                              className={cn(
                                "relative w-10 h-10 rounded-lg border text-[10px] font-bold transition-all duration-150 select-none",
                                isSelected
                                  ? "bg-indigo-500 border-indigo-400 text-white scale-110 ring-2 ring-indigo-500/50"
                                  : isDisabled
                                  ? `${colors.bg} ${colors.border} ${colors.text} opacity-70 cursor-not-allowed`
                                  : `${colors.bg} ${colors.border} ${colors.text} cursor-pointer hover:opacity-100`
                              )}
                            >
                              {seat.seatNumber}
                              {isSelected && (
                                <span className="absolute -top-1 -right-1 w-3 h-3 bg-indigo-500 rounded-full border-2 border-background" />
                              )}
                            </motion.button>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="text-xs">
                            <p className="font-semibold">Seat {seat.seatNumber}</p>
                            <p className="text-muted-foreground">Floor {seat.floor} · {seat.seatType}</p>
                            <p className={colors.text}>{seat.status}</p>
                            {assignedStudent && <p className="text-foreground mt-0.5">👤 {assignedStudent}</p>}
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
        <div className="flex items-center gap-2 p-2.5 rounded-lg bg-indigo-500/10 border border-indigo-500/30">
          <div className="w-2 h-2 rounded-full bg-indigo-500" />
          <p className="text-xs text-indigo-400 font-medium">
            Seat {seats.find((s) => s.id === selectedSeatId)?.seatNumber} selected
          </p>
          <button
            type="button"
            onClick={() => setValue("seatId", "")}
            className="ml-auto text-xs text-muted-foreground hover:text-foreground"
          >
            Clear
          </button>
        </div>
      )}
    </div>
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(newOpen) => {
        if (!newOpen) onOpenChange(false);
      }}
    >
      <DialogContent
        className="max-w-2xl p-0 gap-0 overflow-hidden"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader className="px-6 py-4 border-b border-border/50">
          <DialogTitle>{isEdit ? "Edit Student" : "Add New Student"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)}>
          <ScrollArea className="max-h-[72vh]">
            <div className="px-6 py-4">
              <Tabs defaultValue="personal">
                <TabsList className="mb-5 w-full">
                  <TabsTrigger value="personal" className="flex-1">Personal Info</TabsTrigger>
                  <TabsTrigger value="seat" className="flex-1">Seat & Shift</TabsTrigger>
                  <TabsTrigger value="fees" className="flex-1">Fees</TabsTrigger>
                </TabsList>

                {/* ── Personal Info ── */}
                <TabsContent value="personal" className="space-y-4 mt-0">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <TextField label="Full Name" name="fullName" placeholder="Rahul Kumar" required />
                    <TextField label="Email" name="email" type="email" placeholder="student@email.com" required />
                    <TextField label="Phone" name="phone" placeholder="9876543210" required />
                    <TextField label="WhatsApp Number" name="whatsappNumber" placeholder="9876543210" />
                    <TextField label="Father's Name" name="fatherName" placeholder="Father's full name" />
                    <TextField label="Mother's Name" name="motherName" placeholder="Mother's full name" />
                    <TextField label="Emergency Contact" name="emergencyContact" placeholder="Emergency phone" />
                    <div className="space-y-1.5">
                      <Label>Gender</Label>
                      <Select
                        onValueChange={(v) => setValue("gender", v)}
                        defaultValue={student?.gender ?? undefined}
                      >
                        <SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Male">Male</SelectItem>
                          <SelectItem value="Female">Female</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <TextField label="Occupation" name="occupation" placeholder="Student / Working" />
                    <TextField label="Institution" name="institution" placeholder="College / Company" />
                  </div>
                  <TextField label="Address" name="address" placeholder="Full address" />
                  <div className="grid grid-cols-3 gap-4">
                    <TextField label="City" name="city" placeholder="City" />
                    <TextField label="State" name="state" placeholder="State" />
                    <TextField label="Pincode" name="pincode" placeholder="400001" />
                  </div>
                </TabsContent>

                {/* ── Seat & Shift ── */}
                <TabsContent value="seat" className="space-y-4 mt-0">
                  {/* Shift selector — multi-shift support */}
                  <div className="space-y-1.5">
                    <Label>Shift</Label>
                    <ShiftSelector
                      shifts={shifts}
                      selectedIds={selectedShiftId ? [selectedShiftId] : []}
                      onChange={(ids, _type) => {
                        // store primary shift as shiftId
                        setValue("shiftId", ids[0] ?? "");
                        // clear seat when shift changes
                        setValue("seatId", "");
                      }}
                    />
                  </div>

                  {/* Cinema-style seat map */}
                  <div className="space-y-1.5">
                    <Label>Select Seat</Label>
                    <div className="p-3 rounded-xl border border-border/50 bg-muted/20">
                      <SeatMap />
                    </div>
                  </div>

                  {/* Dates */}
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
                    <Textarea
                      placeholder="Any additional notes about the student..."
                      rows={3}
                      {...register("notes")}
                    />
                  </div>
                </TabsContent>

                {/* ── Fees ── */}
                <TabsContent value="fees" className="space-y-4 mt-0">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <NumberField label="Monthly Fee (₹)" name="monthlyFee" placeholder="1500" required />
                    <NumberField label="Security Deposit (₹)" name="depositAmount" placeholder="0" />
                    <NumberField label="Discount (₹)" name="discountAmount" placeholder="0" />
                  </div>

                  {/* Summary */}
                  <div className="p-4 rounded-xl bg-muted/40 border border-border/50 space-y-2.5">
                    <p className="text-sm font-semibold">Fee Summary</p>
                    {[
                      { label: "Monthly Fee", value: `₹${monthlyFee.toLocaleString("en-IN")}` },
                      { label: "Security Deposit", value: `₹${depositAmount.toLocaleString("en-IN")}` },
                      { label: "Discount", value: `-₹${discountAmount.toLocaleString("en-IN")}`, className: "text-emerald-500" },
                    ].map((row) => (
                      <div key={row.label} className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{row.label}</span>
                        <span className={row.className}>{row.value}</span>
                      </div>
                    ))}
                    <div className="flex justify-between text-sm font-bold border-t border-border/50 pt-2 mt-1">
                      <span>Net Monthly</span>
                      <span className="text-indigo-500">
                        ₹{Math.max(0, monthlyFee - discountAmount).toLocaleString("en-IN")}
                      </span>
                    </div>
                  </div>

                  {/* First payment note */}
                  <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-xs text-blue-400">
                    💡 First due date will be calculated automatically from joining date. Monthly fee cycle starts from the joining date.
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </ScrollArea>

          <DialogFooter className="px-6 py-4 border-t border-border/50 gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={loading}>
              {isEdit ? "Update Student" : "Add Student"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
