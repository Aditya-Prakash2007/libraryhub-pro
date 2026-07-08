"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2, Clock, LogIn, LogOut, Loader2,
  AlertCircle, QrCode, Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { markAttendanceByQRStudent } from "@/actions/attendance";

interface ScanResult {
  action: "checkin" | "checkout";
  checkInTime: Date | null;
  checkOutTime: Date | null;
  student: { fullName: string; studentId: string };
}

interface StudentScanPageProps {
  libraryId: string;
  libraryName: string;
  studentName: string;
}

function LiveClock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <span>
      {time.toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      })}
    </span>
  );
}

export function StudentScanPage({ libraryId, libraryName, studentName }: StudentScanPageProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [autoScanned, setAutoScanned] = useState(false);

  const handleScan = useCallback(async () => {
    if (loading || result) return;
    setLoading(true);
    setError(null);

    const res = await markAttendanceByQRStudent(libraryId);

    if ("error" in res && res.error) {
      setError(res.error);
    } else if (!res.success) {
      setError((res as { error?: string }).error ?? "Could not process attendance");
    } else {
      setResult(res as unknown as ScanResult);
    }
    setLoading(false);
  }, [libraryId, loading, result]);

  // Auto-trigger scan on load
  useEffect(() => {
    if (!autoScanned) {
      setAutoScanned(true);
      handleScan();
    }
  }, [autoScanned, handleScan]);

  const fmt = (d: Date | null) =>
    d
      ? new Date(d).toLocaleTimeString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        })
      : "—";

  const today = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 flex flex-col items-center justify-center p-6">
      {/* Library header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <div className="w-14 h-14 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center mx-auto mb-3">
          <QrCode className="w-7 h-7 text-indigo-400" />
        </div>
        <h1 className="text-xl font-bold text-white">{libraryName}</h1>
        <p className="text-sm text-slate-400 mt-1">QR Attendance</p>
      </motion.div>

      {/* Time & Date */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="text-center mb-8"
      >
        <p className="text-4xl font-bold font-mono text-white tracking-wider">
          <LiveClock />
        </p>
        <div className="flex items-center justify-center gap-1.5 mt-2 text-slate-400 text-sm">
          <Calendar className="w-3.5 h-3.5" />
          <span>{today}</span>
        </div>
      </motion.div>

      {/* Main card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.15 }}
        className="w-full max-w-sm"
      >
        <Card className="bg-slate-900/80 border-slate-700/50 backdrop-blur-md shadow-2xl overflow-hidden">
          <CardContent className="p-6">
            {/* Student name */}
            <div className="text-center mb-6">
              <p className="text-xs text-slate-500 uppercase tracking-widest mb-1">Signed in as</p>
              <p className="text-lg font-semibold text-white">{studentName}</p>
            </div>

            {/* State machine */}
            <AnimatePresence mode="wait">
              {/* Loading */}
              {loading && (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="flex flex-col items-center gap-4 py-6"
                >
                  <div className="w-16 h-16 rounded-full bg-indigo-500/20 flex items-center justify-center">
                    <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
                  </div>
                  <p className="text-slate-300 text-sm font-medium">Processing attendance…</p>
                </motion.div>
              )}

              {/* Success */}
              {result && !loading && (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-5"
                >
                  {/* Action badge */}
                  <div className={`flex items-center justify-center gap-2.5 py-4 rounded-xl border ${
                    result.action === "checkin"
                      ? "bg-emerald-500/15 border-emerald-500/30"
                      : "bg-violet-500/15 border-violet-500/30"
                  }`}>
                    {result.action === "checkin" ? (
                      <LogIn className="w-5 h-5 text-emerald-400" />
                    ) : (
                      <LogOut className="w-5 h-5 text-violet-400" />
                    )}
                    <span className={`font-bold text-lg ${
                      result.action === "checkin" ? "text-emerald-400" : "text-violet-400"
                    }`}>
                      {result.action === "checkin" ? "Checked In ✅" : "Checked Out ✅"}
                    </span>
                  </div>

                  {/* Time details */}
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between py-2.5 px-3 rounded-lg bg-slate-800/60">
                      <div className="flex items-center gap-2 text-slate-400 text-sm">
                        <LogIn className="w-3.5 h-3.5 text-emerald-400" />
                        In Time
                      </div>
                      <span className="font-semibold text-white text-sm">
                        {fmt(result.checkInTime)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-2.5 px-3 rounded-lg bg-slate-800/60">
                      <div className="flex items-center gap-2 text-slate-400 text-sm">
                        <LogOut className="w-3.5 h-3.5 text-violet-400" />
                        Out Time
                      </div>
                      <span className={`font-semibold text-sm ${result.checkOutTime ? "text-white" : "text-slate-500"}`}>
                        {result.checkOutTime ? fmt(result.checkOutTime) : "Not checked out yet"}
                      </span>
                    </div>
                  </div>

                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="text-center"
                  >
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 mx-auto mb-1.5" />
                    <p className="text-xs text-slate-400">
                      {result.action === "checkin"
                        ? "Scan QR again when you leave to record your out time"
                        : "Your session has been recorded. See you tomorrow! 👋"}
                    </p>
                  </motion.div>
                </motion.div>
              )}

              {/* Error */}
              {error && !loading && (
                <motion.div
                  key="error"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4"
                >
                  <div className="flex flex-col items-center gap-3 py-5">
                    <div className="w-14 h-14 rounded-full bg-rose-500/15 border border-rose-500/30 flex items-center justify-center">
                      <AlertCircle className="w-7 h-7 text-rose-400" />
                    </div>
                    <div className="text-center">
                      <p className="text-rose-400 font-semibold mb-1">Could not process</p>
                      <p className="text-slate-400 text-sm">{error}</p>
                    </div>
                  </div>
                  <Button
                    onClick={() => { setError(null); handleScan(); }}
                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white"
                  >
                    <Clock className="w-4 h-4 mr-2" />
                    Try Again
                  </Button>
                </motion.div>
              )}

              {/* Initial idle (shouldn't show long due to auto-scan) */}
              {!loading && !result && !error && (
                <motion.div key="idle" className="py-4 text-center text-slate-400 text-sm">
                  Initializing…
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>
      </motion.div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mt-6 text-xs text-slate-600 text-center"
      >
        Powered by LibraryHub Pro
      </motion.p>
    </div>
  );
}
