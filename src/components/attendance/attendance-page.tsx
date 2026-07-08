"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";
import QRCode from "qrcode";
import {
  CalendarCheck, QrCode, UserCheck, UserX, Clock,
  ChevronLeft, ChevronRight, RefreshCw, Download,
  Printer,
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
import { formatDate, getInitials } from "@/lib/utils";
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

interface AttendancePageProps {
  libraryId: string;
}

export function AttendancePage({ libraryId }: AttendancePageProps) {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [shiftFilter, setShiftFilter] = useState("all");
  const [qrScannerOpen, setQrScannerOpen] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [appUrl, setAppUrl] = useState("");

  useEffect(() => {
    setAppUrl(window.location.origin);
  }, []);

  const scanUrl = appUrl ? `${appUrl}/scan?libraryId=${libraryId}` : "";

  // Generate library QR code
  useEffect(() => {
    if (!libraryId || !scanUrl) return;
    QRCode.toDataURL(scanUrl, {
      width: 300,
      margin: 2,
      color: { dark: "#1e1b4b", light: "#ffffff" },
      errorCorrectionLevel: "H",
    }).then(setQrDataUrl).catch(console.error);
  }, [libraryId, scanUrl]);

  const stats = {
    present: records.filter((r) => r.status === "PRESENT").length,
    absent: records.filter((r) => r.status === "ABSENT").length,
    late: records.filter((r) => r.status === "LATE").length,
    total: records.length,
  };

  const loadAttendance = useCallback(async () => {
    setLoading(true);
    const result = await getAttendance({ date: selectedDate, shiftId: shiftFilter });
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

  const handleDownloadQR = () => {
    if (!qrDataUrl) return;
    const a = document.createElement("a");
    a.href = qrDataUrl;
    a.download = `library-attendance-qr.png`;
    a.click();
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

      {/* Library QR Code Section */}
      {qrDataUrl && (
        <Card className="border-indigo-500/20 bg-gradient-to-br from-indigo-500/5 to-violet-500/5 overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <QrCode className="w-4 h-4 text-indigo-500" />
              Library Attendance QR Code
              <Badge variant="outline" className="text-[10px] text-emerald-500 border-emerald-500/30 ml-auto">
                Active
              </Badge>
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Display or print this QR code in your library. Students scan it from their logged-in device to mark attendance.
            </p>
          </CardHeader>
          <CardContent className="pb-5">
            <div className="flex flex-col sm:flex-row items-center gap-6">
              {/* QR Code */}
              <div className="shrink-0 p-4 bg-white rounded-2xl shadow-md ring-1 ring-indigo-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qrDataUrl} alt="Library Attendance QR" width={180} height={180} className="block" />
              </div>

              {/* Info */}
              <div className="flex-1 space-y-4 text-center sm:text-left">
                <div>
                  <p className="text-sm font-semibold text-foreground mb-1">How it works</p>
                  <ol className="text-xs text-muted-foreground space-y-1.5 list-none">
                    <li className="flex items-start gap-2">
                      <span className="w-5 h-5 rounded-full bg-indigo-500/15 text-indigo-500 flex items-center justify-center shrink-0 text-[10px] font-bold mt-0.5">1</span>
                      Student logs into their account on their phone
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-5 h-5 rounded-full bg-indigo-500/15 text-indigo-500 flex items-center justify-center shrink-0 text-[10px] font-bold mt-0.5">2</span>
                      Scans this QR code with phone camera → <strong>Check-In</strong> recorded with device time
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-5 h-5 rounded-full bg-violet-500/15 text-violet-500 flex items-center justify-center shrink-0 text-[10px] font-bold mt-0.5">3</span>
                      Scans again when leaving → <strong>Check-Out</strong> recorded automatically
                    </li>
                  </ol>
                </div>

                <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                  <Button size="sm" onClick={handleDownloadQR} className="gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white">
                    <Download className="w-3.5 h-3.5" />
                    Download QR
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => window.print()} className="gap-1.5">
                    <Printer className="w-3.5 h-3.5" />
                    Print
                  </Button>
                </div>

                <p className="text-[10px] text-muted-foreground break-all font-mono bg-muted/40 p-2 rounded">
                  {scanUrl}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

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
                    <div className="flex flex-col text-xs text-muted-foreground mt-0.5 items-end gap-0.5">
                      {record.checkInTime && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5 text-emerald-500" />
                          In: {new Date(record.checkInTime).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      )}
                      {record.checkOutTime && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5 text-rose-400" />
                          Out: {new Date(record.checkOutTime).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <canvas ref={canvasRef} className="hidden" />

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
