"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
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
import { paymentSchema } from "@/schemas";
import { recordManualPayment } from "@/actions/payments";
import { getStudents } from "@/actions/students";
import { getWorkers } from "@/actions/workers";
import type { PaymentFormData } from "@/schemas";
import { SearchableStudentSelect } from "@/components/ui/searchable-student-select";
import { AlertCircle, Info } from "lucide-react";

interface StudentOption {
  id: string;
  fullName: string;
  studentId: string;
  monthlyFee: number;
  discountAmount: number;
  totalDueAmount: number;   // partial balance from last payment
  pendingMonths: number;
  paymentStatus: string;
  nextDueDate: string | null;
  joiningDate: string;
}

interface RecordPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  preSelectedStudentId?: string;
}

export function RecordPaymentDialog({
  open, onOpenChange, onSuccess, preSelectedStudentId,
}: RecordPaymentDialogProps) {
  const [loading, setLoading] = useState(false);
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [workers, setWorkers] = useState<{ id: string; name: string }[]>([]);
  const [selectedWorkerId, setSelectedWorkerId] = useState<string>("");

  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      paymentMode: "CASH",
      paymentType: "MONTHLY",
      studentId: preSelectedStudentId || "",
    },
  });

  const selectedStudentId = watch("studentId");
  const selectedPaymentType = watch("paymentType");
  const selectedStudent = students.find((s) => s.id === selectedStudentId);

  const getMonthsMultiplier = (type: string) => {
    switch (type) {
      case "QUARTERLY": return 3;
      case "HALF_YEARLY": return 6;
      case "YEARLY": return 12;
      default: return 1;
    }
  };

  const monthsToAdd = getMonthsMultiplier(selectedPaymentType || "MONTHLY");

  // Net monthly fee after discount
  const netMonthlyFee = selectedStudent
    ? Math.max(0, selectedStudent.monthlyFee - (selectedStudent.discountAmount || 0))
    : 0;

  // Base amount for the selected duration
  const baseAmount = netMonthlyFee * monthsToAdd;

  // Partial balance from previous payment (stored as totalDueAmount, never overwritten by sync)
  // Negative totalDueAmount = advance credit from overpayment last time
  const storedDue = selectedStudent?.totalDueAmount ?? 0;
  const partialBalance = storedDue > 0 ? storedDue : 0;      // still owed
  const advanceCredit = storedDue < 0 ? Math.abs(storedDue) : 0; // credit to adjust

  // Total payable = current period fee + pending balance - advance credit
  const expectedAmount = Math.max(0, baseAmount + partialBalance - advanceCredit);

  // What period is being paid for?
  const getPeriodLabel = () => {
    if (!selectedStudent) return "";
    const baseDate = selectedStudent.nextDueDate
      ? new Date(selectedStudent.nextDueDate)
      : new Date(selectedStudent.joiningDate);
    const endDate = new Date(baseDate);
    endDate.setMonth(endDate.getMonth() + monthsToAdd);
    const fmt = (d: Date) => d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
    return `${fmt(baseDate)} – ${fmt(endDate)}`;
  };

  useEffect(() => {
    if (open) {
      getStudents({ status: "ACTIVE", limit: 200 }).then((result) => {
        if (!("error" in result)) {
          setStudents(result.students.map((s: Record<string, unknown>) => ({
            id: s.id as string,
            fullName: s.fullName as string,
            studentId: s.studentId as string,
            monthlyFee: s.monthlyFee as number,
            discountAmount: (s.discountAmount as number) || 0,
            totalDueAmount: (s.totalDueAmount as number) || 0,
            pendingMonths: (s.pendingMonths as number) || 0,
            paymentStatus: (s.paymentStatus as string) || "PAID",
            nextDueDate: (s.nextDueDate as string) || null,
            joiningDate: (s.joiningDate as string) || new Date().toISOString(),
          })));
        }
      });
      getWorkers().then((result) => {
        if (!("error" in result)) {
          setWorkers(result.workers.map((w: Record<string, unknown>) => ({
            id: w.id as string,
            name: w.name as string,
          })));
        }
      });
    }
  }, [open]);

  useEffect(() => {
    if (selectedStudent) {
      setValue("amount", expectedAmount);
    }
  }, [selectedStudent, selectedPaymentType, expectedAmount, setValue]);

  const onSubmit = async (data: PaymentFormData) => {
    setLoading(true);
    const result = await recordManualPayment({
      studentId: data.studentId,
      amount: data.amount,
      paymentType: data.paymentType,
      paymentMode: data.paymentMode as "CASH" | "BANK_TRANSFER" | "UPI" | "CHEQUE",
      description: data.description,
      notes: data.notes,
      collectedBy: selectedWorkerId || undefined,
    });

    if ("error" in result) {
      toast.error(result.error);
    } else {
      if (result.isPartial) {
        toast.warning(
          `Partial payment recorded. ₹${result.balanceDue} still pending — will be added to next month.`,
          { duration: 6000 }
        );
      } else if (result.isOverpaid && result.creditAmount > 0) {
        toast.success(
          `Payment recorded! ₹${result.creditAmount} extra — credited to next month's fee.`,
          { duration: 6000 }
        );
      } else {
        toast.success(`Payment recorded! Period: ${result.periodLabel || "this period"}`);
      }
      reset();
      setSelectedWorkerId("");
      onSuccess();
    }
    setLoading(false);
  };

  const periodLabel = getPeriodLabel();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] flex flex-col overflow-hidden" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader className="shrink-0">
          <DialogTitle>Record Payment</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          <div className="space-y-1.5">
            <Label>Student *</Label>
            <SearchableStudentSelect
              students={students}
              value={selectedStudentId}
              onValueChange={(v) => setValue("studentId", v)}
              error={!!errors.studentId}
            />
            {errors.studentId && <p className="text-xs text-destructive">{errors.studentId.message}</p>}
          </div>

          {/* Team Member who collected */}
          <div className="space-y-1.5">
            <Label>Collected By (Team Member)</Label>
            <Select
              value={selectedWorkerId}
              onValueChange={(v) => setSelectedWorkerId(v === "__none__" ? "" : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select team member (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">— No one selected —</SelectItem>
                {workers.map((w) => (
                  <SelectItem key={w.id} value={w.id}>
                    {w.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {workers.length === 0 && (
              <p className="text-xs text-muted-foreground">No team members added yet.</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Payment Type *</Label>
              <Select onValueChange={(v) => setValue("paymentType", v as PaymentFormData["paymentType"])} defaultValue="MONTHLY">
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="MONTHLY">Monthly</SelectItem>
                  <SelectItem value="QUARTERLY">Quarterly</SelectItem>
                  <SelectItem value="HALF_YEARLY">Half-Yearly</SelectItem>
                  <SelectItem value="YEARLY">Yearly</SelectItem>
                  <SelectItem value="REGISTRATION">Registration</SelectItem>
                  <SelectItem value="LATE_FEE">Late Fee</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Payment Mode *</Label>
              <Select onValueChange={(v) => setValue("paymentMode", v as PaymentFormData["paymentMode"])} defaultValue="CASH">
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="CASH">Cash</SelectItem>
                  <SelectItem value="UPI">UPI</SelectItem>
                  <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                  <SelectItem value="CHEQUE">Cheque</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Period being paid for */}
          {selectedStudent && periodLabel && (
            <div className="rounded-md border border-blue-500/20 bg-blue-500/5 px-3 py-2 text-xs text-blue-400 flex items-start gap-2">
              <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium">Period being paid:</p>
                <p>{periodLabel}</p>
                {selectedStudent.pendingMonths > 0 && (
                  <p className="mt-0.5 text-amber-400">⚠ {selectedStudent.pendingMonths} overdue month{selectedStudent.pendingMonths > 1 ? "s" : ""}</p>
                )}
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Amount (₹) *</Label>
            <Input
              type="number"
              step="0.01"
              placeholder={String(expectedAmount)}
              {...register("amount", { valueAsNumber: true })}
              className={errors.amount ? "border-destructive" : ""}
            />
            {errors.amount && <p className="text-xs text-destructive">{errors.amount.message}</p>}
            {selectedStudent && (
              <div className="text-xs text-muted-foreground space-y-1 mt-1 rounded-md border border-border bg-muted/30 p-2">
                <div className="flex justify-between">
                  <span>Monthly Fee:</span>
                  <span>₹{selectedStudent.monthlyFee.toLocaleString("en-IN")}</span>
                </div>
                {selectedStudent.discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-500">
                    <span>Discount:</span>
                    <span>−₹{selectedStudent.discountAmount.toLocaleString("en-IN")}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Net Fee × {monthsToAdd} month{monthsToAdd > 1 ? "s" : ""}:</span>
                  <span>₹{baseAmount.toLocaleString("en-IN")}</span>
                </div>
                {partialBalance > 0 && (
                  <div className="flex justify-between text-orange-400 items-center gap-1">
                    <span className="flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      Previous balance due:
                    </span>
                    <span>+₹{partialBalance.toLocaleString("en-IN")}</span>
                  </div>
                )}
                {advanceCredit > 0 && (
                  <div className="flex justify-between text-emerald-400 items-center gap-1">
                    <span className="flex items-center gap-1">
                      <Info className="w-3 h-3" />
                      Advance credit (from overpayment):
                    </span>
                    <span>−₹{advanceCredit.toLocaleString("en-IN")}</span>
                  </div>
                )}
                <div className="flex justify-between font-semibold text-foreground border-t border-border pt-1 mt-1">
                  <span>Total Payable:</span>
                  <span>₹{expectedAmount.toLocaleString("en-IN")}</span>
                </div>
                <p className="text-muted-foreground/70 text-[11px]">
                  Paying less = partial (balance carries to next month). Paying more = credit applied next month.
                </p>
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Description</Label>
            <Input placeholder="e.g. July 2025 fee" {...register("description")} />
          </div>

          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea placeholder="Internal notes..." rows={2} {...register("notes")} />
          </div>
          </div>{/* end scrollable area */}

          <DialogFooter className="shrink-0 pt-4 border-t border-border mt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" loading={loading}>Record Payment</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
