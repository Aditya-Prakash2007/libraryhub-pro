"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import {
  CalendarCheck, QrCode, UserCheck, UserX, Clock,
  ChevronLeft, ChevronRight, RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/shared/page-header";
import { getAttendance, markAttendance } from "@/actions/attendance";
import { getShifts } from "@/actions/shifts";
import { getStudents } from "@/actions/students";
import { formatDate, formatDateTime, getInitials } from "@/lib/utils";
import { QRScannerDialog } from "./qr-scanner-dialog";
import { ManualAttendanceDialog } from "./manual-attendance-dialog";

interface AttendanceRecord {
  id: string;
  date: Date;
  checkInTime?: Date | null;
  checkOutTime?: Date | null;
  status: string;
  markedViaQR: boolean;
  student: { id: string; fullName: string; studentId: string; profilePhoto?: string | null };
  shift?: { name: string } | null;
}

interface Shift {
  id: string;
  name: string;
}

export function AttendancePage() {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [shiftFilter, setShiftFilter] = useState("all");
  const [qrScannerOpen, setQrScannerOpen] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);

  const stats = {
    present: records.filter((r) => r.status === "PRESENT").length,
    absent: records.filter((r) => r.status === "ABSENT").length,
    late: records.filter((r) => r.status === "LATE").length,
    total: records.length,
  };

  const loadAttendance = useCallback(async () => {
    setLoading(true);
    const result = await getAttendance({
      date: selectedDate,
      shiftId: shiftFilter,
    });
    if ("error" in result) {
      toast.error(result.error);
    } else {
      setRecords(result.records as AttendanceRecord[]);
    }
    setLoading(false);
  }, [selectedDate, shiftFilter]);

  useEffect(() => { loadAttendance(); }, [loadAttendance]);

  useEffect(() => {
    getShifts().then((r) => { if (!("error" in r)) setShifts(r.shifts as Shift[]); });
  }, []);

  const goDate = (days: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + days);
    setSelectedDate(d.toISOString().split("T")[0]);
  };

  const statusColor = (status: string) => {
    const map: Record<string, string> = {
      PRESENT: "bg-emerald-500/15 text-emerald-500",
      ABSENT: "bg-rose-500/15 text-rose-500",
      LATE: "bg-amber-500/15 text-amber-500",
      HALF_DAY: "bg-blue-500/15 text-blue-500",
    };
    return map[status] || "bg-muted text-muted-foreground";
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Attendance" description="Track daily student presence">
        <Button variant="outline" size="sm" onClick={() => setQrScannerOpen(true)}>
          <QrCode className="w-4 h-4" />
          QR Scan
        </Button>
        <Button size="sm" onClick={() => setManualOpen(true)}>
          <UserCheck className="w-4 h-4" />
          Mark Manual
        </Button>
      </PageHeader>

      {/* Date navigation + stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Button variant="outline" size="icon" className="w-8 h-8" onClick={() => goDate(-1)}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <div className="flex-1">
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full text-center font-medium bg-transparent outline-none cursor-pointer"
                />
                <p className="text-center text-xs text-muted-foreground">
                  {formatDate(selectedDate)}
                </p>
              </div>
              <Button
                variant="outline"
                size="icon"
                className="w-8 h-8"
                onClick={() => goDate(1)}
                disabled={selectedDate >= new Date().toISOString().split("T")[0]}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4 justify-around">
              {[
                { label: "Present", value: stats.present, color: "text-emerald-500" },
                { label: "Absent", value: stats.absent, color: "text-rose-500" },
                { label: "Late", value: stats.late, color: "text-amber-500" },
                { label: "Total", value: stats.total, color: "text-indigo-500" },
              ].map((s) => (
                <div key={s.label} className="text-center">
                  <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-3 items-center">
        <Select value={shiftFilter} onValueChange={setShiftFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All Shifts" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Shifts</SelectItem>
            {shifts.map((s) => (
              <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" size="icon" onClick={loadAttendance}>
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      {/* Attendance list */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-12 text-center text-muted-foreground">Loading...</div>
          ) : records.length === 0 ? (
            <div className="py-16 text-center">
              <CalendarCheck className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="font-medium">No attendance records for this date</p>
              <p className="text-sm text-muted-foreground mt-1">Use QR scan or manual entry to mark attendance</p>
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {records.map((record) => (
                <div key={record.id} className="flex items-center gap-4 p-4 hover:bg-muted/30 transition-colors">
                  <Avatar className="w-9 h-9">
                    <AvatarImage src={record.student.profilePhoto || ""} />
                    <AvatarFallback className="text-xs">{getInitials(record.student.fullName)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{record.student.fullName}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{record.student.studentId}</span>
                      {record.shift && <span>· {record.shift.name}</span>}
                      {record.markedViaQR && <Badge variant="outline" className="text-[10px] px-1 py-0">QR</Badge>}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusColor(record.status)}`}>
                      {record.status}
                    </span>
                    {record.checkInTime && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        In: {new Date(record.checkInTime).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <QRScannerDialog
        open={qrScannerOpen}
        onOpenChange={setQrScannerOpen}
        onSuccess={loadAttendance}
      />

      <ManualAttendanceDialog
        open={manualOpen}
        onOpenChange={setManualOpen}
        onSuccess={() => { setManualOpen(false); loadAttendance(); }}
        shifts={shifts}
        date={selectedDate}
      />
    </div>
  );
}
