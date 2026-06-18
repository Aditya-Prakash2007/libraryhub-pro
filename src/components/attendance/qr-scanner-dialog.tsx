"use client";

import { useState } from "react";
import { toast } from "sonner";
import { QrCode, CheckCircle2, AlertCircle } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { markAttendanceByQR } from "@/actions/attendance";

interface QRScannerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function QRScannerDialog({ open, onOpenChange, onSuccess }: QRScannerDialogProps) {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [lastResult, setLastResult] = useState<{ type: string; name: string } | null>(null);

  const handleScan = async () => {
    if (!input.trim()) return;
    setLoading(true);

    try {
      let studentId = input.trim();
      // Try parsing as JSON (QR code data)
      try {
        const parsed = JSON.parse(input);
        if (parsed.studentId) studentId = parsed.studentId;
      } catch {}

      const result = await markAttendanceByQR(studentId);
      if ("error" in result) {
        toast.error(result.error);
        setLastResult(null);
      } else {
        const action = result.action === "checkin" ? "✅ Checked In" : "✅ Checked Out";
        const studentName = (result.student as { fullName?: string })?.fullName || "Student";
        toast.success(`${action}: ${studentName}`);
        setLastResult({ type: result.action || "checkin", name: studentName });
        setInput("");
        onSuccess();
      }
    } catch {
      toast.error("Failed to process scan");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="w-5 h-5 text-indigo-500" />
            QR Attendance Scanner
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Camera placeholder */}
          <div className="aspect-square rounded-xl bg-muted/50 border-2 border-dashed border-border flex flex-col items-center justify-center gap-3">
            <QrCode className="w-16 h-16 text-muted-foreground" />
            <p className="text-sm text-muted-foreground text-center">
              Point camera at student&apos;s QR code<br />
              <span className="text-xs">or enter Student ID below</span>
            </p>
          </div>

          {/* Manual input */}
          <div className="space-y-1.5">
            <Label>Student ID / QR Data</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Enter student ID or scan QR..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleScan()}
                autoFocus
              />
              <Button onClick={handleScan} loading={loading} className="shrink-0">
                Mark
              </Button>
            </div>
          </div>

          {/* Last result */}
          {lastResult && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <div>
                <p className="text-sm font-medium text-emerald-500">
                  {lastResult.type === "checkin" ? "Check In" : "Check Out"} Successful
                </p>
                <p className="text-xs text-emerald-600">{lastResult.name}</p>
              </div>
            </div>
          )}

          <p className="text-xs text-muted-foreground text-center">
            First scan = Check In · Second scan = Check Out
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
