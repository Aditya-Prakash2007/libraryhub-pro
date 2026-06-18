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
import type { PaymentFormData } from "@/schemas";

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
  const [students, setStudents] = useState<{ id: string; fullName: string; studentId: string; monthlyFee: number }[]>([]);

  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      paymentMode: "CASH",
      paymentType: "MONTHLY",
      studentId: preSelectedStudentId || "",
    },
  });

  const selectedStudentId = watch("studentId");
  const selectedStudent = students.find((s) => s.id === selectedStudentId);

  useEffect(() => {
    if (open) {
      getStudents({ status: "ACTIVE", limit: 200 }).then((result) => {
        if (!("error" in result)) {
          setStudents(result.students.map((s: Record<string, unknown>) => ({
            id: s.id as string,
            fullName: s.fullName as string,
            studentId: s.studentId as string,
            monthlyFee: s.monthlyFee as number,
          })));
        }
      });
    }
  }, [open]);

  useEffect(() => {
    if (selectedStudent && !watch("amount")) {
      setValue("amount", selectedStudent.monthlyFee);
    }
  }, [selectedStudent, setValue, watch]);

  const onSubmit = async (data: PaymentFormData) => {
    setLoading(true);
    const result = await recordManualPayment({
      studentId: data.studentId,
      amount: data.amount,
      paymentType: data.paymentType,
      paymentMode: data.paymentMode as "CASH" | "BANK_TRANSFER" | "UPI" | "CHEQUE",
      description: data.description,
      notes: data.notes,
    });

    if ("error" in result) {
      toast.error(result.error);
    } else {
      toast.success("Payment recorded successfully");
      reset();
      onSuccess();
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Record Payment</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Student *</Label>
            <Select
              onValueChange={(v) => setValue("studentId", v)}
              defaultValue={preSelectedStudentId}
            >
              <SelectTrigger className={errors.studentId ? "border-destructive" : ""}>
                <SelectValue placeholder="Select student" />
              </SelectTrigger>
              <SelectContent>
                {students.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.fullName} — {s.studentId}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
              placeholder={selectedStudent ? String(selectedStudent.monthlyFee) : "0"}
              {...register("amount", { valueAsNumber: true })}
              className={errors.amount ? "border-destructive" : ""}
            />
            {errors.amount && <p className="text-xs text-destructive">{errors.amount.message}</p>}
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
