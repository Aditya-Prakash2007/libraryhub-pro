"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { attendanceSchema } from "@/schemas";
import { markAttendance } from "@/actions/attendance";
import { getStudents } from "@/actions/students";
import type { AttendanceFormData } from "@/schemas";

interface ManualAttendanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  shifts: { id: string; name: string }[];
  date: string;
}

export function ManualAttendanceDialog({
  open, onOpenChange, onSuccess, shifts, date,
}: ManualAttendanceDialogProps) {
  const [loading, setLoading] = useState(false);
  const [students, setStudents] = useState<{ id: string; fullName: string; studentId: string }[]>([]);

  const { register, handleSubmit, setValue, reset, formState: { errors } } = useForm<AttendanceFormData>({
    resolver: zodResolver(attendanceSchema) as import("react-hook-form").Resolver<AttendanceFormData>,
    defaultValues: { date, status: "PRESENT" },
  });

  useEffect(() => {
    if (open) {
      getStudents({ status: "ACTIVE", limit: 200 }).then((result) => {
        if (!("error" in result)) {
          setStudents(result.students.map((s: Record<string, unknown>) => ({
            id: s.id as string,
            fullName: s.fullName as string,
            studentId: s.studentId as string,
          })));
        }
      });
    }
  }, [open]);

  const onSubmit = async (data: AttendanceFormData) => {
    setLoading(true);
    const result = await markAttendance(data);
    if ("error" in result) {
      toast.error(result.error);
    } else {
      toast.success("Attendance marked successfully");
      reset({ date, status: "PRESENT" });
      onSuccess();
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Mark Attendance</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Student *</Label>
            <Select onValueChange={(v) => setValue("studentId", v)}>
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
              <Label>Date</Label>
              <Input type="date" {...register("date")} />
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select onValueChange={(v) => setValue("status", v as AttendanceFormData["status"])} defaultValue="PRESENT">
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="PRESENT">Present</SelectItem>
                  <SelectItem value="ABSENT">Absent</SelectItem>
                  <SelectItem value="LATE">Late</SelectItem>
                  <SelectItem value="HALF_DAY">Half Day</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Check-In Time</Label>
              <Input type="time" {...register("checkInTime")} />
            </div>
            <div className="space-y-1.5">
              <Label>Shift</Label>
              <Select onValueChange={(v) => setValue("shiftId", v)}>
                <SelectTrigger><SelectValue placeholder="Select shift" /></SelectTrigger>
                <SelectContent>
                  {shifts.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" loading={loading}>Mark Attendance</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
