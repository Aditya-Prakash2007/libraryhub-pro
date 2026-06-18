"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Plus, Clock, Users, Edit2, Trash2, ToggleLeft } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { getShifts, createShift, updateShift, deleteShift } from "@/actions/shifts";
import { shiftSchema } from "@/schemas";
import type { ShiftFormData } from "@/schemas";
import { formatTime } from "@/lib/utils";

interface Shift {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  color: string;
  maxStudents: number;
  isActive: boolean;
  description?: string | null;
  _count: { students: number; seats: number };
}

export function ShiftsPage() {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editShift, setEditShift] = useState<Shift | null>(null);
  const [saving, setSaving] = useState(false);

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<ShiftFormData>({
    resolver: zodResolver(shiftSchema),
    defaultValues: { color: "#6366f1", maxStudents: 100 },
  });

  const watchColor = watch("color");

  async function loadShifts() {
    setLoading(true);
    const result = await getShifts();
    if (!("error" in result)) setShifts(result.shifts as Shift[]);
    setLoading(false);
  }

  useEffect(() => { loadShifts(); }, []);

  const openAdd = () => { reset({ color: "#6366f1", maxStudents: 100 }); setEditShift(null); setDialogOpen(true); };
  const openEdit = (shift: Shift) => {
    reset({
      name: shift.name, startTime: shift.startTime, endTime: shift.endTime,
      color: shift.color, maxStudents: shift.maxStudents, description: shift.description || "",
    });
    setEditShift(shift);
    setDialogOpen(true);
  };

  const onSubmit = async (data: ShiftFormData) => {
    setSaving(true);
    const result = editShift ? await updateShift(editShift.id, data) : await createShift(data);
    if ("error" in result) {
      toast.error(result.error);
    } else {
      toast.success(editShift ? "Shift updated" : "Shift created");
      setDialogOpen(false);
      loadShifts();
    }
    setSaving(false);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete shift "${name}"?`)) return;
    const result = await deleteShift(id);
    if ("error" in result) toast.error(result.error);
    else { toast.success("Shift deleted"); loadShifts(); }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Shifts" description="Manage your library time slots">
        <Button size="sm" onClick={openAdd}>
          <Plus className="w-4 h-4" />
          Add Shift
        </Button>
      </PageHeader>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse h-40" />
          ))}
        </div>
      ) : shifts.length === 0 ? (
        <EmptyState
          icon={Clock}
          title="No shifts yet"
          description="Create shifts to organize your library hours"
          actionLabel="Add First Shift"
          onAction={openAdd}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {shifts.map((shift, i) => (
            <motion.div
              key={shift.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <Card className="overflow-hidden dashboard-card">
                {/* Color bar */}
                <div className="h-1.5 w-full" style={{ background: shift.color }} />
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-semibold text-lg">{shift.name}</h3>
                      <div className="flex items-center gap-1.5 text-muted-foreground text-sm mt-1">
                        <Clock className="w-3.5 h-3.5" />
                        {formatTime(shift.startTime)} — {formatTime(shift.endTime)}
                      </div>
                    </div>
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center"
                      style={{ background: shift.color + "20" }}
                    >
                      <div className="w-3 h-3 rounded-full" style={{ background: shift.color }} />
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-sm mb-4">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Users className="w-3.5 h-3.5" />
                      <span>{shift._count.students} students</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <span>Max: {shift.maxStudents}</span>
                    </div>
                  </div>

                  {/* Occupancy bar */}
                  <div className="mb-4">
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${Math.min(100, (shift._count.students / shift.maxStudents) * 100)}%`,
                          background: shift.color,
                        }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {Math.round((shift._count.students / shift.maxStudents) * 100)}% capacity
                    </p>
                  </div>

                  <div className="flex items-center justify-between">
                    <Badge variant={shift.isActive ? "default" : "secondary"} className="text-xs">
                      {shift.isActive ? "Active" : "Inactive"}
                    </Badge>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => openEdit(shift)}>
                        <Edit2 className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="w-7 h-7 text-destructive hover:text-destructive"
                        onClick={() => handleDelete(shift.id, shift.name)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Add/Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editShift ? "Edit Shift" : "Add New Shift"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Shift Name *</Label>
              <Input placeholder="Morning Shift" {...register("name")} className={errors.name ? "border-destructive" : ""} />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Start Time *</Label>
                <Input type="time" {...register("startTime")} className={errors.startTime ? "border-destructive" : ""} />
              </div>
              <div className="space-y-1.5">
                <Label>End Time *</Label>
                <Input type="time" {...register("endTime")} className={errors.endTime ? "border-destructive" : ""} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Max Students</Label>
                <Input type="number" min={1} {...register("maxStudents", { valueAsNumber: true })} />
              </div>
              <div className="space-y-1.5">
                <Label>Color</Label>
                <div className="flex items-center gap-2">
                  <input type="color" {...register("color")} className="w-10 h-10 rounded cursor-pointer border border-input" />
                  <Input value={watchColor} onChange={(e) => setValue("color", e.target.value)} className="font-mono text-xs" />
                </div>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Input placeholder="Optional description" {...register("description")} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" loading={saving}>{editShift ? "Update" : "Create"} Shift</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
