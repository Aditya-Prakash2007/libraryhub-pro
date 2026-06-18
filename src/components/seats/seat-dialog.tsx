"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { createSeat } from "@/actions/seats";
import { seatSchema } from "@/schemas";
import type { SeatFormData } from "@/schemas";

interface SeatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  shifts: { id: string; name: string }[];
}

export function SeatDialog({ open, onOpenChange, onSuccess, shifts }: SeatDialogProps) {
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, setValue, formState: { errors }, reset } = useForm<SeatFormData>({
    resolver: zodResolver(seatSchema) as import("react-hook-form").Resolver<SeatFormData>,
    defaultValues: { floor: 1, status: "AVAILABLE", seatType: "STANDARD" },
  });

  const onSubmit = async (data: SeatFormData) => {
    setLoading(true);
    const result = await createSeat(data);
    if ("error" in result) {
      toast.error(result.error);
    } else {
      toast.success("Seat created successfully");
      reset();
      onSuccess();
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Seat</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Seat Number *</Label>
              <Input placeholder="A01" {...register("seatNumber")} className={errors.seatNumber ? "border-destructive" : ""} />
              {errors.seatNumber && <p className="text-xs text-destructive">{errors.seatNumber.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Floor *</Label>
              <Input type="number" min={1} placeholder="1" {...register("floor", { valueAsNumber: true })} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Seat Type</Label>
            <Select onValueChange={(v) => setValue("seatType", v as SeatFormData["seatType"])} defaultValue="STANDARD">
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="STANDARD">Standard</SelectItem>
                <SelectItem value="PREMIUM">Premium</SelectItem>
                <SelectItem value="WINDOW">Window</SelectItem>
                <SelectItem value="CORNER">Corner</SelectItem>
                <SelectItem value="POWER_OUTLET">Power Outlet</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Shift (Optional)</Label>
            <Select onValueChange={(v) => setValue("shiftId", v)}>
              <SelectTrigger><SelectValue placeholder="All shifts" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">All shifts</SelectItem>
                {shifts.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" loading={loading}>Create Seat</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
