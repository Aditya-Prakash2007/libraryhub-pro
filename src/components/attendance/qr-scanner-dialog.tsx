"use client";

import { useState, useRef, useCallback } from "react";
import { toast } from "sonner";
import { QrCode, CheckCircle2, AlertCircle, Loader2, UserCheck, X } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { markAttendanceByQR } from "@/actions/attendance";
import { getInitials, formatCurrency } from "@/lib/utils";

interface ScanResult {
  action: string;
  student: {
    id: string;
    studentId: string;
    fullName: string;
    profilePhoto?: string | null;
    status: string;
    paymentStatus: string;
    seat?: { seatNumber: string } | null;
    shift?: { name: string } | null;
  };
}

interface QRScannerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function QRScannerDialog({ open, onOpenChange, onSuccess }: QRScannerDialogProps) {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [lastResult, setLastResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const processInput = useCallback(async (value: string) => {
    if (!value.trim()) return;
    setLoading(true);
    setError(null);
    setLastResult(null);

    try {
      let studentId = value.trim();

      // Try parsing as JSON QR data
      try {
        const parsed = JSON.parse(value);
        if (parsed.studentId) studentId = parsed.studentId;
        else if (parsed.id) studentId = parsed.id;
      } catch {
        // Not JSON — use as-is (plain student ID)
      }

      const result = await markAttendanceByQR(studentId);

      if ("error" in result) {
        setError(result.error ?? "Failed to mark attendance");
        toast.error(result.error ?? "Failed to mark attendance");
      } else if (!result.success) {
        setError(result.error ?? "Attendance already marked");
      } else {
        const r = result as ScanResult;
        setLastResult(r);
        const action = r.action === "checkin" ? "✅ Checked In" : "✅ Checked Out";
        toast.success(`${action}: ${r.student?.fullName}`);
        setInput("");
        onSuccess();
        // Auto-focus input for next scan
        setTimeout(() => inputRef.current?.focus(), 200);
      }
    } catch {
      setError("Scan failed. Try again.");
    } finally {
      setLoading(false);
    }
  }, [onSuccess]);

  const handleManualSubmit = () => processInput(input);

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { setLastResult(null); setError(null); setInput(""); } onOpenChange(v); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="w-5 h-5 text-indigo-500" />
            QR Attendance Scanner
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Camera/scanner area */}
          <div className="relative aspect-square rounded-xl bg-muted/40 border-2 border-dashed border-border flex flex-col items-center justify-center gap-3 overflow-hidden">
            <QrCode className="w-16 h-16 text-muted-foreground/40" />
            <div className="text-center">
              <p className="text-sm font-medium text-muted-foreground">Point camera at QR code</p>
              <p className="text-xs text-muted-foreground mt-0.5">or enter Student ID below</p>
            </div>

            {/* Scan animation overlay */}
            {loading && (
              <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
              </div>
            )}
          </div>

          {/* Manual input */}
          <div className="space-y-1.5">
            <Label>Enter Student ID manually</Label>
            <div className="flex gap-2">
              <Input
                ref={inputRef}
                placeholder="e.g. DPL-24-0001"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleManualSubmit()}
                autoFocus={open}
              />
              <Button onClick={handleManualSubmit} loading={loading} disabled={!input.trim()} className="shrink-0">
                <UserCheck className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
              <p className="text-sm text-rose-400">{error}</p>
            </div>
          )}

          {/* Success result */}
          {lastResult && (
            <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 space-y-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                <span className="font-semibold text-emerald-400">
                  {lastResult.action === "checkin" ? "Check-In Successful" : "Check-Out Successful"}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <Avatar className="w-11 h-11">
                  <AvatarImage src={lastResult.student?.profilePhoto ?? ""} />
                  <AvatarFallback className="text-sm">{getInitials(lastResult.student?.fullName || "")}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold">{lastResult.student?.fullName}</p>
                  <p className="text-xs text-muted-foreground">{lastResult.student?.studentId}</p>
                  <div className="flex gap-2 mt-1 flex-wrap">
                    {lastResult.student?.seat && (
                      <Badge variant="secondary" className="text-[10px]">
                        Seat {lastResult.student.seat.seatNumber}
                      </Badge>
                    )}
                    {lastResult.student?.shift && (
                      <Badge variant="secondary" className="text-[10px]">
                        {lastResult.student.shift.name}
                      </Badge>
                    )}
                    <Badge
                      className={`text-[10px] ${lastResult.student?.paymentStatus === "PAID" ? "bg-emerald-500/15 text-emerald-500" : "bg-amber-500/15 text-amber-500"}`}
                      variant="outline"
                    >
                      Fee: {lastResult.student?.paymentStatus}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          )}

          <p className="text-xs text-muted-foreground text-center">
            🔁 First scan = <strong>Check In</strong> · Second scan = <strong>Check Out</strong>
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
