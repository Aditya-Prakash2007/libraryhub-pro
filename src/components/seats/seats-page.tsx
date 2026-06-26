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
import { getSeats, vacateSeat, updateSeat, deleteSeat } from "@/actions/seats";
import { SEAT_STATUS_COLORS } from "@/constants";
import { cn } from "@/lib/utils";
import { SeatDialog } from "./seat-dialog";
import { BulkSeatDialog } from "./bulk-seat-dialog";
import { BulkDeleteSeatDialog } from "./bulk-delete-seat-dialog";

interface StudentShift {
  id: string;
  name: string;
  color: string;
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
  { status: "OCCUPIED", label: "Occupied" },
];

const SEATS_PER_ROW = 10;

export function SeatsPage() {
  const [seats, setSeats] = useState<Seat[]>([]);
  const [loading, setLoading] = useState(true);
  const [floorFilter, setFloorFilter] = useState("all");
  const [selectedSeat, setSelectedSeat] = useState<Seat | null>(null);
  const [seatInfoOpen, setSeatInfoOpen] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);

  const loadSeats = useCallback(async () => {
    setLoading(true);
    const result = await getSeats();
    if ("error" in result) {
      toast.error(result.error);
    } else {
      setSeats(sortSeatsNumerically(result.seats as Seat[]));
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

  const handleSeatClick = (seat: Seat) => {
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

  // Get which shifts are booked on a seat (via assigned students' shifts)
  const getSeatBookedShifts = (seat: Seat): StudentShift[] => {
    if (!seat.students || seat.students.length === 0) return [];
    return seat.students
      .filter((st) => st.shift)
      .map((st) => st.shift!)
      .filter((sh, idx, arr) => arr.findIndex((x) => x.id === sh.id) === idx);
  };

  // For "full-day" view: if seat is occupied/reserved in ANY shift, show RESERVED with label
  const getEffectiveStatus = (seat: Seat): string => {
    const bookedShifts = getSeatBookedShifts(seat);
    if (bookedShifts.length > 0 && seat.status !== "OCCUPIED") return "RESERVED";
    return seat.status;
  };

  const getShiftTooltipLabel = (seat: Seat): string => {
    const bookedShifts = getSeatBookedShifts(seat);
    if (bookedShifts.length === 0) return "";
    return `Reserved for: ${bookedShifts.map((s) => s.name).join(", ")}`;
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
                const c = SEAT_STATUS_COLORS[item.status as keyof typeof SEAT_STATUS_COLORS];
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
                const floorSeats = filteredSeats.filter((s) => s.floor === floor);
                // Split floor seats into rows of SEATS_PER_ROW
                const rows: Seat[][] = [];
                for (let i = 0; i < floorSeats.length; i += SEATS_PER_ROW) {
                  rows.push(floorSeats.slice(i, i + SEATS_PER_ROW));
                }

                return (
                  <div key={floor} className="mb-8">
                    {floors.length > 1 && (
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Floor {floor}</span>
                        <div className="flex-1 h-px bg-border/50" />
                        <span className="text-xs text-muted-foreground">{floorSeats.length} seats</span>
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
                                const effectiveStatus = getEffectiveStatus(seat);
                                const colors = SEAT_STATUS_COLORS[effectiveStatus as keyof typeof SEAT_STATUS_COLORS] || SEAT_STATUS_COLORS.AVAILABLE;
                                const student = seat.students?.[0];
                                const bookedShifts = getSeatBookedShifts(seat);
                                const shiftLabel = getShiftTooltipLabel(seat);
                                const isShiftReserved = bookedShifts.length > 0 && seat.status !== "OCCUPIED";

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
                                        aria-label={`Seat ${seat.seatNumber} - ${effectiveStatus}`}
                                      >
                                        {seat.seatNumber}
                                        {isShiftReserved && (
                                          <span className="absolute -top-1 -right-1 w-2 h-2 bg-amber-400 rounded-full border border-background" />
                                        )}
                                      </motion.button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <div className="text-xs space-y-0.5">
                                        <p className="font-semibold">Seat {seat.seatNumber}</p>
                                        <p className={colors.text}>{effectiveStatus}</p>
                                        <p className="text-muted-foreground">Floor {seat.floor}</p>
                                        {isShiftReserved && shiftLabel && (
                                          <p className="text-amber-400">{shiftLabel}</p>
                                        )}
                                        {seat.shift?.name && !isShiftReserved && (
                                          <p className="text-indigo-400">{seat.shift.name} shift</p>
                                        )}
                                        {student && <p className="text-foreground">👤 {student.fullName}</p>}
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
            const effectiveStatus = getEffectiveStatus(selectedSeat);
            const bookedShifts = getSeatBookedShifts(selectedSeat);
            const colors = SEAT_STATUS_COLORS[effectiveStatus as keyof typeof SEAT_STATUS_COLORS] || SEAT_STATUS_COLORS.AVAILABLE;
            return (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-muted-foreground text-xs mb-1">Status</p>
                    <span className={cn(
                      "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
                      colors.bg, colors.text
                    )}>
                      {effectiveStatus}
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
                  <div>
                    <p className="text-muted-foreground text-xs mb-1">Shift</p>
                    <p className="font-medium">{selectedSeat.shift?.name ?? "Any Shift"}</p>
                  </div>
                </div>

                {/* Show which shifts this seat is booked in */}
                {bookedShifts.length > 0 && (
                  <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                    <p className="text-xs text-amber-400 font-medium mb-1">⚠️ Reserved in shifts:</p>
                    <div className="flex flex-wrap gap-1">
                      {bookedShifts.map((sh) => (
                        <span key={sh.id} className="text-xs bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full">
                          {sh.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {selectedSeat.students?.[0] && (
                  <div className="p-3 rounded-lg bg-muted/50 border border-border/50">
                    <p className="text-xs text-muted-foreground mb-1">Assigned to</p>
                    <p className="font-medium text-sm">{selectedSeat.students[0].fullName}</p>
                    <p className="text-xs text-muted-foreground">{selectedSeat.students[0].studentId}</p>
                    {selectedSeat.students[0].shift && (
                      <p className="text-xs text-indigo-400 mt-0.5">Shift: {selectedSeat.students[0].shift.name}</p>
                    )}
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  {selectedSeat.status === "OCCUPIED" && (
                    <Button variant="outline" size="sm" className="text-amber-500" onClick={() => handleVacate(selectedSeat.id)}>
                      <UserMinus className="w-4 h-4 mr-1" />Vacate
                    </Button>
                  )}
                  {selectedSeat.status !== "OCCUPIED" && (
                    <Button variant="outline" size="sm" className="text-destructive hover:bg-destructive/10" onClick={() => handleDelete(selectedSeat.id)}>
                      <Trash2 className="w-4 h-4 mr-1" />Delete
                    </Button>
                  )}
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

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
