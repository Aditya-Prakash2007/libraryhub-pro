"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Plus, RefreshCw, Layers, UserMinus, Wrench, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { PageHeader } from "@/components/shared/page-header";
import { getSeats, vacateSeat, updateSeat, deleteSeat, toggleSeatMaintenance } from "@/actions/seats";
import { getShifts } from "@/actions/shifts";
import { SEAT_STATUS_COLORS } from "@/constants";
import { cn } from "@/lib/utils";
import { SeatDialog } from "./seat-dialog";
import { BulkSeatDialog } from "./bulk-seat-dialog";
import { BulkDeleteSeatDialog } from "./bulk-delete-seat-dialog";
import { StudentDetailDialog } from "@/components/students/student-detail-dialog";

interface StudentShift {
  id: string;
  name: string;
  color: string;
  startTime: string;
  endTime: string;
}

interface Seat {
  id: string;
  seatNumber: string;
  floor: number;
  status: string;
  seatType: string;
  shiftId?: string | null;
  shift?: { name: string; color: string } | null;
  students?: {
    id: string;
    fullName: string;
    studentId: string;
    profilePhoto?: string | null;
    shift?: StudentShift | null;
  }[];
}

// Sort seats numerically and continuously (1, 2, 3... not 1, 10, 100...)
function sortSeatsNumerically(seats: Seat[]): Seat[] {
  return [...seats].sort((a, b) => {
    const numA = parseInt(a.seatNumber.replace(/\D/g, "")) || 0;
    const numB = parseInt(b.seatNumber.replace(/\D/g, "")) || 0;
    if (a.floor !== b.floor) return a.floor - b.floor;
    return numA - numB;
  });
}

const STATUS_LEGEND = [
  { status: "AVAILABLE", label: "Available" },
  { status: "OCCUPIED", label: "Full Occupied" },
  { status: "PARTIAL_OCCUPIED", label: "Partial Occupied" },
  { status: "MAINTENANCE", label: "Maintenance" },
];

const SEATS_PER_ROW = 10;

const PARTIAL_OCCUPIED_COLORS = {
  bg: "bg-indigo-500/20",
  border: "border-indigo-500",
  text: "text-indigo-400",
  dot: "bg-indigo-500",
  hex: "#6366f1",
};

const getSeatColor = (status: string) => {
  if (status === "PARTIAL_OCCUPIED") {
    return PARTIAL_OCCUPIED_COLORS;
  }
  return SEAT_STATUS_COLORS[status as keyof typeof SEAT_STATUS_COLORS] || SEAT_STATUS_COLORS.AVAILABLE;
};

export function SeatsPage() {
  const [seats, setSeats] = useState<Seat[]>([]);
  const [shifts, setShifts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [floorFilter, setFloorFilter] = useState("all");
  const [selectedSeat, setSelectedSeat] = useState<any | null>(null);
  const [seatInfoOpen, setSeatInfoOpen] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);

  // Student detail modal state
  const [detailStudentId, setDetailStudentId] = useState<string | null>(null);
  const [studentDetailOpen, setStudentDetailOpen] = useState(false);

  const loadSeats = useCallback(async () => {
    setLoading(true);
    const [seatResult, shiftResult] = await Promise.all([getSeats(), getShifts()]);
    if ("error" in seatResult) {
      toast.error(seatResult.error);
    } else {
      setSeats(sortSeatsNumerically(seatResult.seats as Seat[]));
    }
    if (shiftResult && !("error" in shiftResult)) {
      setShifts(shiftResult.shifts || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadSeats(); }, [loadSeats]);

  const floors = Array.from(new Set(seats.map((s) => s.floor))).sort((a, b) => a - b);

  const filteredSeats = floorFilter === "all"
    ? seats
    : seats.filter((s) => String(s.floor) === floorFilter);

  const stats = {
    total: seats.length,
    available: seats.filter((s) => s.status === "AVAILABLE").length,
    occupied: seats.filter((s) => s.status === "OCCUPIED").length,
    reserved: seats.filter((s) => s.status === "RESERVED").length,
    maintenance: seats.filter((s) => s.status === "MAINTENANCE").length,
  };

  const handleSeatClick = (seat: any) => {
    setSelectedSeat(seat);
    setSeatInfoOpen(true);
  };

  const handleVacate = async (seatId: string) => {
    const result = await vacateSeat(seatId);
    if ("error" in result) toast.error(result.error);
    else { toast.success("Seat vacated"); setSeatInfoOpen(false); loadSeats(); }
  };

  const handleStatusChange = async (seatId: string, status: string) => {
    const result = await updateSeat(seatId, { status: status as "AVAILABLE" | "OCCUPIED" | "RESERVED" | "MAINTENANCE" });
    if ("error" in result) toast.error(result.error);
    else { toast.success("Seat status updated"); setSeatInfoOpen(false); loadSeats(); }
  };

  const handleDelete = async (seatId: string) => {
    if (!confirm("Are you sure you want to delete this seat?")) return;
    const result = await deleteSeat(seatId);
    if ("error" in result) toast.error(result.error);
    else { toast.success("Seat deleted"); setSeatInfoOpen(false); loadSeats(); }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Seat Management" description={`${stats.total} total seats`}>
        <Button variant="outline" size="sm" onClick={loadSeats}>
          <RefreshCw className="w-4 h-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={() => setBulkDialogOpen(true)}>
          <Layers className="w-4 h-4" />
          Add Seats
        </Button>
        <Button variant="outline" size="sm" className="text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/20" onClick={() => setBulkDeleteDialogOpen(true)}>
          <Trash2 className="w-4 h-4 mr-1" />
          Bulk Delete
        </Button>
        <Button size="sm" onClick={() => setAddDialogOpen(true)}>
          <Plus className="w-4 h-4" />
          Single Seat
        </Button>
      </PageHeader>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Available", value: stats.available, color: "text-emerald-500 bg-emerald-500/10" },
          { label: "Occupied", value: stats.occupied, color: "text-rose-500 bg-rose-500/10" },
        ].map((item) => (
          <Card key={item.label} className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{item.label}</p>
              <span className={`text-xl font-bold px-2 py-0.5 rounded-lg ${item.color}`}>
                {item.value}
              </span>
            </div>
          </Card>
        ))}
      </div>

      {/* Floor filter + Legend */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            {/* Floor filter */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Floor:</span>
              <div className="flex gap-1.5">
                {["all", ...floors.map(String)].map((f) => (
                  <button
                    key={f}
                    onClick={() => setFloorFilter(f)}
                    className={cn(
                      "text-xs px-3 py-1 rounded-full border transition-colors",
                      floorFilter === f
                        ? "bg-indigo-500 text-white border-indigo-500"
                        : "border-border text-muted-foreground hover:border-indigo-400"
                    )}
                  >
                    {f === "all" ? "All" : `Floor ${f}`}
                  </button>
                ))}
              </div>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-3 flex-wrap">
              {STATUS_LEGEND.map((item) => {
                const c = getSeatColor(item.status);
                return (
                  <div key={item.status} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <div className={`w-3 h-3 rounded-sm ${c.dot}`} />
                    {item.label}
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Seat Map */}
      {loading ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">Loading seat map...</CardContent>
        </Card>
      ) : filteredSeats.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <p className="font-medium mb-1">No seats yet</p>
            <p className="text-sm text-muted-foreground mb-4">Add seats to start managing your library</p>
            <Button onClick={() => setBulkDialogOpen(true)}>
              <Layers className="w-4 h-4 mr-2" />Add Seats
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              {floorFilter === "all" ? "All Floors — Seat Map" : `Floor ${floorFilter} — Seat Map`}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {floors
              .filter((f) => floorFilter === "all" || String(f) === floorFilter)
              .map((floor) => {
                const floorSeats = filteredSeats
                  .filter((s) => s.floor === floor)
                  .sort((a, b) => a.seatNumber.localeCompare(b.seatNumber, undefined, { numeric: true, sensitivity: 'base' }));

                // Group physical seats by seatNumber
                const seatGroupsMap = new Map<string, Seat[]>();
                floorSeats.forEach((s) => {
                  const existing = seatGroupsMap.get(s.seatNumber) || [];
                  existing.push(s);
                  seatGroupsMap.set(s.seatNumber, existing);
                });

                const uniqueFloorSeats = Array.from(seatGroupsMap.entries()).map(([seatNumber, seatRecords]) => {
                  const assignedStudents = seatRecords.flatMap(s => s.students || []);
                  
                  const isFullDayShift = (name: string) => {
                    const n = name.toLowerCase();
                    return n === "full day" || n === "full" || n === "fullday";
                  };

                  const hasFullDayStudent = assignedStudents.some(st => st.shift && isFullDayShift(st.shift.name));

                  const isRecordAvailable = (r: Seat) => {
                    return r.status === "AVAILABLE" && (!r.students || r.students.length === 0);
                  };

                  const isAvailableInAnyShift = seatRecords.some(isRecordAvailable);
                  const isOccupiedInAnyShift = seatRecords.some(r => r.status === "OCCUPIED" || (r.students && r.students.length > 0));
                  const allMaintenance = seatRecords.every(r => r.status === "MAINTENANCE");

                  let effectiveStatus = "AVAILABLE";
                  if (allMaintenance) {
                    effectiveStatus = "MAINTENANCE";
                  } else if (hasFullDayStudent || !isAvailableInAnyShift) {
                    effectiveStatus = "OCCUPIED"; // Full Occupied
                  } else if (isOccupiedInAnyShift) {
                    effectiveStatus = "PARTIAL_OCCUPIED"; // Partial Occupied
                  } else if (seatRecords.some(r => r.status === "RESERVED")) {
                    effectiveStatus = "RESERVED";
                  }

                  const occupiedShifts = seatRecords
                    .filter(r => r.status === "OCCUPIED" || (r.students && r.students.length > 0))
                    .map(r => r.shift?.name || "Any Shift")
                    .filter((value, index, self) => self.indexOf(value) === index);

                  const primarySeat = seatRecords.find(r => r.status === "OCCUPIED" || (r.students && r.students.length > 0)) || seatRecords[0];

                  return {
                    ...primarySeat,
                    seatNumber,
                    effectiveStatus,
                    seatRecords,
                    assignedStudents,
                    occupiedShifts,
                  };
                });

                // Split unique floor seats into rows of SEATS_PER_ROW
                const rows: any[][] = [];
                for (let i = 0; i < uniqueFloorSeats.length; i += SEATS_PER_ROW) {
                  rows.push(uniqueFloorSeats.slice(i, i + SEATS_PER_ROW));
                }

                return (
                  <div key={floor} className="mb-8">
                    {floors.length > 1 && (
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Floor {floor}</span>
                        <div className="flex-1 h-px bg-border/50" />
                        <span className="text-xs text-muted-foreground">{uniqueFloorSeats.length} seats</span>
                      </div>
                    )}
                    <TooltipProvider delayDuration={100}>
                      <div className="space-y-2">
                        {rows.map((rowSeats, rowIdx) => (
                          <div key={rowIdx} className="flex gap-2 items-center">
                            {/* Row number label */}
                            <span className="text-[10px] text-muted-foreground w-6 text-right shrink-0">
                              {rowIdx * SEATS_PER_ROW + 1}
                            </span>
                            <div className="flex gap-2 flex-wrap">
                              {rowSeats.map((seat) => {
                                const colors = getSeatColor(seat.effectiveStatus);
                                const isPartial = seat.effectiveStatus === "PARTIAL_OCCUPIED";

                                return (
                                  <Tooltip key={seat.id}>
                                    <TooltipTrigger asChild>
                                      <motion.button
                                        whileHover={{ scale: 1.1 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={() => handleSeatClick(seat)}
                                        className={cn(
                                          "w-10 h-10 rounded-lg border text-xs font-bold transition-all duration-150 relative",
                                          colors.bg, colors.border, colors.text,
                                        )}
                                        aria-label={`Seat ${seat.seatNumber} - ${seat.effectiveStatus}`}
                                      >
                                        {seat.seatNumber}
                                        {isPartial && (
                                          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-indigo-500 rounded-full border border-background" />
                                        )}
                                      </motion.button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <div className="text-xs space-y-1 p-1 max-w-[200px]">
                                        <p className="font-semibold text-sm">Seat {seat.seatNumber}</p>
                                        <p className={cn("font-medium", colors.text)}>
                                          {seat.effectiveStatus === "OCCUPIED" ? "Full Occupied" : seat.effectiveStatus === "PARTIAL_OCCUPIED" ? "Partial Occupied" : seat.effectiveStatus === "MAINTENANCE" ? "Seat Maintenance" : seat.effectiveStatus}
                                        </p>
                                        <p className="text-muted-foreground">Floor {seat.floor}</p>
                                        {isPartial && seat.occupiedShifts.length > 0 && (
                                          <p className="text-indigo-400 font-semibold">
                                            Shifts: {seat.occupiedShifts.join(", ")}
                                          </p>
                                        )}
                                        {seat.assignedStudents.length > 0 && (
                                          <div className="mt-1.5 pt-1.5 border-t border-border/50 space-y-1">
                                            <p className="font-medium text-muted-foreground text-[10px]">Assigned Students:</p>
                                            {seat.assignedStudents.map((st: any) => (
                                              <div key={st.id} className="text-foreground flex flex-col font-medium">
                                                <span>👤 {st.fullName}</span>
                                                <span className="text-[10px] text-muted-foreground pl-3">({st.shift?.name || "Any Shift"})</span>
                                              </div>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    </TooltipContent>
                                  </Tooltip>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </TooltipProvider>
                  </div>
                );
              })}
          </CardContent>
        </Card>
      )}

      {/* Seat info dialog */}
      <Dialog open={seatInfoOpen} onOpenChange={setSeatInfoOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Seat {selectedSeat?.seatNumber}</DialogTitle>
          </DialogHeader>
          {selectedSeat && (() => {
            const effectiveStatus = selectedSeat.effectiveStatus;
            const colors = getSeatColor(effectiveStatus);
            const assignedStudents = selectedSeat.assignedStudents || [];
            
            return (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-muted-foreground text-xs mb-1">Status</p>
                    <span className={cn(
                      "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
                      colors.bg, colors.text
                    )}>
                      {effectiveStatus === "OCCUPIED" ? "Full Occupied" : effectiveStatus === "PARTIAL_OCCUPIED" ? "Partial Occupied" : effectiveStatus === "MAINTENANCE" ? "Seat Maintenance" : effectiveStatus}
                    </span>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs mb-1">Floor</p>
                    <p className="font-medium">{selectedSeat.floor}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs mb-1">Type</p>
                    <p className="font-medium">{selectedSeat.seatType}</p>
                  </div>
                </div>

                {/* Show which shifts this seat is occupied in */}
                {effectiveStatus === "PARTIAL_OCCUPIED" && selectedSeat.occupiedShifts.length > 0 && (
                  <div className="p-3 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
                    <p className="text-xs text-indigo-400 font-medium mb-1">Occupied in shifts:</p>
                    <div className="flex flex-wrap gap-1">
                      {selectedSeat.occupiedShifts.map((shName: string) => (
                        <span key={shName} className="text-xs bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full">
                          {shName}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Assigned students details */}
                {assignedStudents.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">Assigned Students</p>
                    {assignedStudents.map((student: any) => (
                      <div 
                        key={student.id} 
                        onClick={() => {
                          setDetailStudentId(student.id);
                          setStudentDetailOpen(true);
                        }}
                        className="p-3 rounded-lg bg-muted/50 border border-border/50 hover:bg-muted cursor-pointer transition-colors"
                      >
                        <p className="font-semibold text-sm text-primary hover:underline flex items-center gap-1">
                          👤 {student.fullName}
                        </p>
                        <p className="text-xs text-muted-foreground">{student.studentId}</p>
                        {student.shift && (
                          <p className="text-xs text-indigo-400 mt-1">Shift: {student.shift.name} ({student.shift.startTime} - {student.shift.endTime})</p>
                        )}
                        <p className="text-[10px] text-emerald-400 mt-1.5 hover:underline font-semibold">Click to view full details →</p>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex flex-wrap gap-2 pt-2 border-t border-border/50">
                  {selectedSeat.seatRecords?.some((r: Seat) => r.status === "OCCUPIED" || (r.students && r.students.length > 0)) ? (
                    <Button variant="outline" size="sm" className="text-amber-500" onClick={async () => {
                      const occupiedRecords = selectedSeat.seatRecords.filter((r: Seat) => r.status === "OCCUPIED" || (r.students && r.students.length > 0));
                      for (const r of occupiedRecords) {
                        await vacateSeat(r.id);
                      }
                      toast.success("Seat vacated in all occupied shifts");
                      setSeatInfoOpen(false);
                      loadSeats();
                    }}>
                      <UserMinus className="w-4 h-4 mr-1" />Vacate All Shifts
                    </Button>
                  ) : (
                    <>
                      {effectiveStatus === "MAINTENANCE" ? (
                        <Button variant="outline" size="sm" className="text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/10" onClick={async () => {
                          const res = await toggleSeatMaintenance(selectedSeat.seatNumber, selectedSeat.floor, false);
                          if ("error" in res) toast.error(res.error);
                          else {
                            toast.success("Seat restored to available status");
                            setSeatInfoOpen(false);
                            loadSeats();
                          }
                        }}>
                          <Wrench className="w-4 h-4 mr-1" />Restore Seat
                        </Button>
                      ) : (
                        <Button variant="outline" size="sm" className="text-slate-400 border-slate-500/20 hover:bg-slate-500/10" onClick={async () => {
                          const res = await toggleSeatMaintenance(selectedSeat.seatNumber, selectedSeat.floor, true);
                          if ("error" in res) toast.error(res.error);
                          else {
                            toast.success("Seat is now under maintenance");
                            setSeatInfoOpen(false);
                            loadSeats();
                          }
                        }}>
                          <Wrench className="w-4 h-4 mr-1" />Put Under Maintenance
                        </Button>
                      )}
                      <Button variant="outline" size="sm" className="text-destructive hover:bg-destructive/10" onClick={async () => {
                        if (!confirm(`Are you sure you want to delete seat ${selectedSeat.seatNumber}? This will delete all its shift configurations.`)) return;
                        for (const r of selectedSeat.seatRecords) {
                          await deleteSeat(r.id);
                        }
                        toast.success("Seat deleted");
                        setSeatInfoOpen(false);
                        loadSeats();
                      }}>
                        <Trash2 className="w-4 h-4 mr-1" />Delete Seat
                      </Button>
                    </>
                  )}
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Student detail dialog */}
      <StudentDetailDialog
        studentId={detailStudentId || ""}
        open={studentDetailOpen}
        onOpenChange={setStudentDetailOpen}
      />

      {/* Add single seat */}
      <SeatDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onSuccess={() => { setAddDialogOpen(false); loadSeats(); }}
        existingSeatCount={seats.length}
      />

      {/* Bulk add seats */}
      <BulkSeatDialog
        open={bulkDialogOpen}
        onOpenChange={setBulkDialogOpen}
        onSuccess={() => { setBulkDialogOpen(false); loadSeats(); }}
        existingSeatCount={seats.length}
      />

      {/* Bulk delete seats */}
      <BulkDeleteSeatDialog
        open={bulkDeleteDialogOpen}
        onOpenChange={setBulkDeleteDialogOpen}
        onSuccess={() => { setBulkDeleteDialogOpen(false); loadSeats(); }}
        floors={floors}
      />
    </div>
  );
}
