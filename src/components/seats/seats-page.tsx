"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  Plus, RefreshCw, Grid3X3, List, Layers,
  MoreHorizontal, UserPlus, UserMinus, Wrench, Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { PageHeader } from "@/components/shared/page-header";
import { getSeats, vacateSeat, updateSeat, bulkCreateSeats } from "@/actions/seats";
import { getShifts } from "@/actions/shifts";
import { SEAT_STATUS_COLORS } from "@/constants";
import { cn } from "@/lib/utils";
import { SeatDialog } from "./seat-dialog";
import { BulkSeatDialog } from "./bulk-seat-dialog";

interface Seat {
  id: string;
  seatNumber: string;
  floor: number;
  status: string;
  seatType: string;
  shiftId?: string | null;
  shift?: { name: string; color: string } | null;
  students?: { id: string; fullName: string; studentId: string; profilePhoto?: string | null }[];
}

interface Shift {
  id: string;
  name: string;
  color: string;
}

const STATUS_LEGEND = [
  { status: "AVAILABLE", label: "Available" },
  { status: "OCCUPIED", label: "Occupied" },
  { status: "RESERVED", label: "Reserved" },
  { status: "MAINTENANCE", label: "Maintenance" },
];

export function SeatsPage() {
  const [seats, setSeats] = useState<Seat[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [shiftFilter, setShiftFilter] = useState("all");
  const [floorFilter, setFloorFilter] = useState("all");
  const [selectedSeat, setSelectedSeat] = useState<Seat | null>(null);
  const [seatInfoOpen, setSeatInfoOpen] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);

  const loadSeats = useCallback(async () => {
    setLoading(true);
    const result = await getSeats(shiftFilter === "all" ? undefined : shiftFilter);
    if ("error" in result) {
      toast.error(result.error);
    } else {
      setSeats(result.seats as Seat[]);
    }
    setLoading(false);
  }, [shiftFilter]);

  useEffect(() => {
    loadSeats();
  }, [loadSeats]);

  useEffect(() => {
    async function loadShifts() {
      const result = await getShifts();
      if (!("error" in result)) setShifts(result.shifts as Shift[]);
    }
    loadShifts();
  }, []);

  const floors = Array.from(new Set(seats.map((s) => s.floor))).sort((a, b) => a - b);
  const filteredSeats = floorFilter === "all" ? seats : seats.filter((s) => s.floor === parseInt(floorFilter));

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
    if ("error" in result) {
      toast.error(result.error);
    } else {
      toast.success("Seat vacated successfully");
      setSeatInfoOpen(false);
      loadSeats();
    }
  };

  const handleStatusChange = async (seatId: string, status: string) => {
    const result = await updateSeat(seatId, { status: status as "AVAILABLE" | "OCCUPIED" | "RESERVED" | "MAINTENANCE" });
    if ("error" in result) {
      toast.error(result.error);
    } else {
      toast.success("Seat status updated");
      setSeatInfoOpen(false);
      loadSeats();
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Seat Management" description={`${stats.total} total seats`}>
        <Button variant="outline" size="sm" onClick={loadSeats}>
          <RefreshCw className="w-4 h-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={() => setBulkDialogOpen(true)}>
          <Layers className="w-4 h-4" />
          Bulk Add
        </Button>
        <Button size="sm" onClick={() => setAddDialogOpen(true)}>
          <Plus className="w-4 h-4" />
          Add Seat
        </Button>
      </PageHeader>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Available", value: stats.available, color: "text-emerald-500 bg-emerald-500/10" },
          { label: "Occupied", value: stats.occupied, color: "text-rose-500 bg-rose-500/10" },
          { label: "Reserved", value: stats.reserved, color: "text-amber-500 bg-amber-500/10" },
          { label: "Maintenance", value: stats.maintenance, color: "text-slate-500 bg-slate-500/10" },
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

      {/* Filters + Legend */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex gap-3">
              <Select value={shiftFilter} onValueChange={setShiftFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="All Shifts" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Shifts</SelectItem>
                  {shifts.map((shift) => (
                    <SelectItem key={shift.id} value={shift.id}>{shift.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {floors.length > 1 && (
                <Select value={floorFilter} onValueChange={setFloorFilter}>
                  <SelectTrigger className="w-36">
                    <SelectValue placeholder="All Floors" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Floors</SelectItem>
                    {floors.map((floor) => (
                      <SelectItem key={floor} value={String(floor)}>Floor {floor}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Legend */}
            <div className="flex items-center gap-3 flex-wrap">
              {STATUS_LEGEND.map((item) => {
                const colors = SEAT_STATUS_COLORS[item.status as keyof typeof SEAT_STATUS_COLORS];
                return (
                  <div key={item.status} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <div className={`w-3 h-3 rounded-sm ${colors.dot}`} />
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
          <CardContent className="py-12 text-center text-muted-foreground">
            Loading seat map...
          </CardContent>
        </Card>
      ) : filteredSeats.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Grid3X3 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="font-medium mb-1">No seats yet</p>
            <p className="text-sm text-muted-foreground mb-4">Add seats to start managing your library</p>
            <Button onClick={() => setBulkDialogOpen(true)}>
              <Layers className="w-4 h-4 mr-2" />
              Bulk Add Seats
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              {shiftFilter !== "all"
                ? `${shifts.find((s) => s.id === shiftFilter)?.name} — Seat Map`
                : "All Seats — Seat Map"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Group by floor */}
            {floors
              .filter((f) => floorFilter === "all" || f === parseInt(floorFilter))
              .map((floor) => {
                const floorSeats = filteredSeats.filter((s) => s.floor === floor);
                return (
                  <div key={floor} className="mb-6">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Floor {floor}
                      </div>
                      <div className="flex-1 h-px bg-border/50" />
                      <span className="text-xs text-muted-foreground">{floorSeats.length} seats</span>
                    </div>

                    {/* Cinema-style seat grid */}
                    <div className="flex flex-wrap gap-2">
                      <TooltipProvider delayDuration={100}>
                        {floorSeats.map((seat) => {
                          const colors = SEAT_STATUS_COLORS[seat.status as keyof typeof SEAT_STATUS_COLORS];
                          const student = seat.students?.[0];

                          return (
                            <Tooltip key={seat.id}>
                              <TooltipTrigger asChild>
                                <motion.button
                                  whileHover={{ scale: 1.1 }}
                                  whileTap={{ scale: 0.95 }}
                                  onClick={() => handleSeatClick(seat)}
                                  className={cn(
                                    "w-10 h-10 rounded-lg border text-xs font-bold transition-all duration-150",
                                    colors.bg, colors.border, colors.text,
                                    seat.status === "AVAILABLE" && "hover:border-opacity-100 cursor-pointer",
                                    (seat.status === "OCCUPIED" || seat.status === "MAINTENANCE") && "cursor-pointer opacity-80",
                                  )}
                                  aria-label={`Seat ${seat.seatNumber} - ${seat.status}`}
                                >
                                  {seat.seatNumber}
                                </motion.button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <div className="text-xs">
                                  <p className="font-semibold">Seat {seat.seatNumber}</p>
                                  <p className="text-muted-foreground">{seat.status}</p>
                                  {student && <p>{student.fullName}</p>}
                                  {seat.seatType !== "STANDARD" && <p className="text-indigo-400">{seat.seatType}</p>}
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          );
                        })}
                      </TooltipProvider>
                    </div>
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
          {selectedSeat && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs">Status</p>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                    SEAT_STATUS_COLORS[selectedSeat.status as keyof typeof SEAT_STATUS_COLORS]?.bg
                  } ${SEAT_STATUS_COLORS[selectedSeat.status as keyof typeof SEAT_STATUS_COLORS]?.text}`}>
                    {selectedSeat.status}
                  </span>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Floor</p>
                  <p className="font-medium">{selectedSeat.floor}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Type</p>
                  <p className="font-medium">{selectedSeat.seatType}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Shift</p>
                  <p className="font-medium">{selectedSeat.shift?.name || "Any"}</p>
                </div>
              </div>

              {selectedSeat.students?.[0] && (
                <div className="p-3 rounded-lg bg-muted/50 border border-border/50">
                  <p className="text-xs text-muted-foreground mb-1">Assigned to</p>
                  <p className="font-medium text-sm">{selectedSeat.students[0].fullName}</p>
                  <p className="text-xs text-muted-foreground">{selectedSeat.students[0].studentId}</p>
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                {selectedSeat.status === "OCCUPIED" && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-amber-500"
                    onClick={() => handleVacate(selectedSeat.id)}
                  >
                    <UserMinus className="w-4 h-4 mr-1" />
                    Vacate
                  </Button>
                )}
                {selectedSeat.status !== "MAINTENANCE" && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleStatusChange(selectedSeat.id, "MAINTENANCE")}
                  >
                    <Wrench className="w-4 h-4 mr-1" />
                    Set Maintenance
                  </Button>
                )}
                {selectedSeat.status === "MAINTENANCE" && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleStatusChange(selectedSeat.id, "AVAILABLE")}
                  >
                    Mark Available
                  </Button>
                )}
                {selectedSeat.status !== "RESERVED" && selectedSeat.status === "AVAILABLE" && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleStatusChange(selectedSeat.id, "RESERVED")}
                  >
                    Reserve
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add seat dialog */}
      <SeatDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onSuccess={() => { setAddDialogOpen(false); loadSeats(); }}
        shifts={shifts}
      />

      {/* Bulk add dialog */}
      <BulkSeatDialog
        open={bulkDialogOpen}
        onOpenChange={setBulkDialogOpen}
        onSuccess={() => { setBulkDialogOpen(false); loadSeats(); }}
        shifts={shifts}
      />
    </div>
  );
}
