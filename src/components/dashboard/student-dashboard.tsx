"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import {
  Grid3X3, Clock, CreditCard, CalendarCheck,
  QrCode, Bell, TrendingUp, Zap, AlertCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { formatDate, formatCurrency, getInitials, daysUntilExpiry } from "@/lib/utils";
import { generateQRCode, getStudentQRData } from "@/lib/qrcode";
import Link from "next/link";

interface StudentProps {
  student: {
    id: string;
    studentId: string;
    fullName: string;
    email: string;
    phone: string;
    profilePhoto?: string | null;
    status: string;
    paymentStatus: string;
    monthlyFee: number;
    joiningDate: Date;
    expiryDate?: Date | null;
    attendancePercentage: number;
    totalPresent: number;
    totalAbsent: number;
    currentStreak: number;
    longestStreak: number;
    libraryId: string;
    seat?: { seatNumber: string; floor: number } | null;
    shift?: { name: string; startTime: string; endTime: string; color: string } | null;
    payments: { id: string; paymentId: string; amount: number; status: string; paymentType: string; paidAt?: Date | null; createdAt: Date }[];
    attendance: { id: string; date: Date; status: string }[];
    notifications: { id: string; title: string; message: string; createdAt: Date }[];
  } | null;
}

export function StudentDashboard({ student }: StudentProps) {
  const [qrData, setQrData] = useState<string | null>(null);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [generating, setGenerating] = useState(false);

  const s = student;

  const daysLeft = s?.expiryDate ? daysUntilExpiry(s.expiryDate) : null;
  const isExpiringSoon = daysLeft !== null && daysLeft <= 7 && daysLeft > 0;
  const isExpired = daysLeft !== null && daysLeft <= 0;

  const handleShowQR = async () => {
    if (!s) return;
    setGenerating(true);
    try {
      const data = getStudentQRData(s.id, s.libraryId);
      const qr = await generateQRCode(data);
      setQrData(qr);
      setQrDialogOpen(true);
    } catch {
      console.error("QR generation failed");
    } finally {
      setGenerating(false);
    }
  };

  if (!s) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="font-medium">Student profile not found</p>
          <p className="text-sm text-muted-foreground">Please contact your library admin</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Expiry alert */}
      {(isExpiringSoon || isExpired) && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-4 rounded-xl border flex items-center gap-3 ${
            isExpired
              ? "bg-rose-500/10 border-rose-500/30"
              : "bg-amber-500/10 border-amber-500/30"
          }`}
        >
          <AlertCircle className={`w-5 h-5 shrink-0 ${isExpired ? "text-rose-500" : "text-amber-500"}`} />
          <div className="flex-1">
            <p className={`font-medium text-sm ${isExpired ? "text-rose-400" : "text-amber-400"}`}>
              {isExpired
                ? "Your membership has expired!"
                : `Membership expiring in ${daysLeft} day${daysLeft === 1 ? "" : "s"}!`}
            </p>
            <p className="text-xs text-muted-foreground">Please renew your subscription to continue</p>
          </div>
          <Button size="sm" asChild>
            <Link href="/student/payments">Renew Now</Link>
          </Button>
        </motion.div>
      )}

      {/* Profile hero */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700 p-6 text-white"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-black/10 to-transparent" />
        <div className="relative flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          <Avatar className="w-16 h-16 border-2 border-white/30">
            <AvatarImage src={s.profilePhoto || ""} />
            <AvatarFallback className="text-xl bg-white/20 text-white">
              {getInitials(s.fullName)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">{s.fullName}</h1>
            <p className="text-indigo-200 text-sm">{s.studentId}</p>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                s.status === "ACTIVE" ? "bg-white/20 text-white" : "bg-rose-500/30 text-rose-100"
              }`}>
                {s.status}
              </span>
              {s.shift && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-indigo-100">
                  {s.shift.name}
                </span>
              )}
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="bg-white/10 border-white/20 text-white hover:bg-white/20"
            onClick={handleShowQR}
            disabled={generating}
          >
            <QrCode className="w-4 h-4 mr-1" />
            {generating ? "Generating..." : "My QR"}
          </Button>
        </div>
        <div className="absolute -right-8 -top-8 w-40 h-40 bg-white/5 rounded-full" />
      </motion.div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          {
            label: "Seat No.",
            value: s.seat?.seatNumber || "—",
            icon: Grid3X3,
            sub: s.seat ? `Floor ${s.seat.floor}` : "Not assigned",
            color: "text-indigo-500 bg-indigo-500/10",
          },
          {
            label: "Shift",
            value: s.shift?.name || "—",
            icon: Clock,
            sub: s.shift ? `${s.shift.startTime} - ${s.shift.endTime}` : "No shift",
            color: "text-violet-500 bg-violet-500/10",
          },
          {
            label: "Monthly Fee",
            value: formatCurrency(s.monthlyFee),
            icon: CreditCard,
            sub: s.paymentStatus === "PAID" ? "✅ Paid" : "⚠️ Pending",
            color: "text-emerald-500 bg-emerald-500/10",
          },
          {
            label: "Streak",
            value: `${s.currentStreak} days`,
            icon: Zap,
            sub: `Best: ${s.longestStreak} days`,
            color: "text-amber-500 bg-amber-500/10",
          },
        ].map((item, i) => (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
          >
            <Card className="p-4 dashboard-card">
              <div className="flex items-start justify-between mb-2">
                <p className="text-xs text-muted-foreground">{item.label}</p>
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${item.color.split(" ")[1]}`}>
                  <item.icon className={`w-4 h-4 ${item.color.split(" ")[0]}`} />
                </div>
              </div>
              <p className="font-bold">{item.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{item.sub}</p>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Attendance & Payments */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Attendance */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Attendance</CardTitle>
              <Link href="/student/attendance" className="text-xs text-indigo-400 hover:underline">View all</Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 relative">
                <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
                  <circle cx="32" cy="32" r="28" fill="none" stroke="hsl(var(--muted))" strokeWidth="8" />
                  <circle
                    cx="32" cy="32" r="28"
                    fill="none"
                    stroke="#6366f1"
                    strokeWidth="8"
                    strokeDasharray={`${2 * Math.PI * 28}`}
                    strokeDashoffset={`${2 * Math.PI * 28 * (1 - s.attendancePercentage / 100)}`}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-sm font-bold">{s.attendancePercentage}%</span>
                </div>
              </div>
              <div className="flex-1">
                <Progress value={s.attendancePercentage} className="h-2 mb-2" />
                <div className="flex gap-4 text-sm">
                  <span className="text-emerald-500">✅ {s.totalPresent} Present</span>
                  <span className="text-rose-500">❌ {s.totalAbsent} Absent</span>
                </div>
              </div>
            </div>

            {/* Recent attendance dots */}
            <div>
              <p className="text-xs text-muted-foreground mb-2">Last 30 days</p>
              <div className="flex flex-wrap gap-1">
                {s.attendance.slice(0, 30).map((a) => (
                  <div
                    key={a.id}
                    title={`${formatDate(a.date)} - ${a.status}`}
                    className={`w-5 h-5 rounded-sm text-[9px] flex items-center justify-center font-medium ${
                      a.status === "PRESENT" ? "bg-emerald-500/20 text-emerald-400" :
                      a.status === "ABSENT" ? "bg-rose-500/20 text-rose-400" :
                      "bg-amber-500/20 text-amber-400"
                    }`}
                  >
                    {new Date(a.date).getDate()}
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payments */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Payments</CardTitle>
              <Link href="/student/payments" className="text-xs text-indigo-400 hover:underline">View all</Link>
            </div>
          </CardHeader>
          <CardContent>
            {s.payments.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground text-sm">No payments yet</div>
            ) : (
              <div className="space-y-2">
                {s.payments.map((p) => (
                  <div key={p.id} className="flex items-center justify-between p-3 rounded-lg border border-border/50">
                    <div>
                      <p className="text-sm font-medium">{p.paymentType.replace("_", " ")}</p>
                      <p className="text-xs text-muted-foreground">
                        {p.paidAt ? formatDate(p.paidAt) : formatDate(p.createdAt)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-sm">{formatCurrency(p.amount)}</p>
                      <span className={`text-xs ${p.status === "PAID" ? "text-emerald-500" : "text-amber-500"}`}>
                        {p.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* QR Code Dialog */}
      <Dialog open={qrDialogOpen} onOpenChange={setQrDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>My Digital ID Card</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Card */}
            <div className="rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-700 p-6 text-white text-center">
              <Avatar className="w-16 h-16 mx-auto mb-3 border-2 border-white/30">
                <AvatarImage src={s.profilePhoto || ""} />
                <AvatarFallback className="bg-white/20 text-white text-xl">{getInitials(s.fullName)}</AvatarFallback>
              </Avatar>
              <h2 className="font-bold text-lg">{s.fullName}</h2>
              <p className="text-indigo-200 text-sm">{s.studentId}</p>
              {s.seat && <p className="text-indigo-100 text-xs mt-1">Seat {s.seat.seatNumber} · {s.shift?.name}</p>}
              {qrData && (
                <div className="mt-4 bg-white rounded-xl p-3 mx-auto w-fit">
                  <img src={qrData} alt="QR Code" className="w-40 h-40" />
                </div>
              )}
              <p className="text-indigo-200 text-xs mt-3">Scan for attendance</p>
            </div>
            <Button className="w-full" variant="outline" onClick={() => setQrDialogOpen(false)}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
