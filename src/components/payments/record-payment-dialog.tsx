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
  const [students, setStudents] = useState<{ id: string; fullName: string; studentId: string; monthlyFee: number; discountAmount: number; totalDueAmount: number }[]>([]);
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

  // Net fee after discount × duration multiplier
  const netMonthlyFee = selectedStudent 
    ? Math.max(0, selectedStudent.monthlyFee - (selectedStudent.discountAmount || 0))
    : 0;

  const expectedBaseAmount = selectedStudent 
    ? netMonthlyFee * getMonthsMultiplier(selectedPaymentType || "MONTHLY")
    : 0;

  const expectedAmount = selectedStudent 
    ? Math.max(0, expectedBaseAmount + (selectedStudent.totalDueAmount || 0))
    : 0;

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
          `Partial payment recorded. ₹${result.balanceDue} balance due.`,
          { duration: 5000 }
        );
      } else {
        toast.success("Payment recorded successfully");
      }
      reset();
      setSelectedWorkerId("");
      onSuccess();
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Record Payment</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
              <div className="text-xs text-muted-foreground space-y-0.5 mt-1">
                <p>
                  Monthly Fee: ₹{selectedStudent.monthlyFee.toLocaleString("en-IN")}
                  {selectedStudent.discountAmount > 0 && (
                    <span className="text-emerald-500 ml-1">— Discount: ₹{selectedStudent.discountAmount.toLocaleString("en-IN")}</span>
                  )}
                </p>
                {selectedStudent.totalDueAmount !== 0 && (
                  <p className="font-medium text-foreground">
                    {selectedStudent.totalDueAmount > 0 
                      ? <span className="text-orange-500">Dues (Previous): +₹{selectedStudent.totalDueAmount.toLocaleString("en-IN")}</span>
                      : <span className="text-emerald-500">Credit (Overpaid): -₹{Math.abs(selectedStudent.totalDueAmount).toLocaleString("en-IN")}</span>
                    }
                  </p>
                )}
                <p className="font-semibold text-foreground text-sm mt-2">
                  Total Payable: ₹{expectedAmount.toLocaleString("en-IN")}
                  {getMonthsMultiplier(selectedPaymentType || "MONTHLY") > 1 && (
                    <span className="text-muted-foreground font-normal text-xs"> (₹{netMonthlyFee.toLocaleString("en-IN")} × {getMonthsMultiplier(selectedPaymentType || "MONTHLY")} months)</span>
                  )}
                </p>
                <p>Partial amount will be recorded as dues.</p>
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Description</Label>
            <Input placeholder="e.g. June 2024 fee" {...register("description")} />
          </div>

          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea placeholder="Internal notes..." rows={2} {...register("notes")} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" loading={loading}>Record Payment</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
