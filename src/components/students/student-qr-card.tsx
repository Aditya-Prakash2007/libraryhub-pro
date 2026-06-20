"use client";

import { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import { Download, QrCode, Share2, BookOpen, Calendar, Grid3X3, Clock, Phone, Mail, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PageHeader } from "@/components/shared/page-header";
import { generateQRCode } from "@/lib/qrcode";
import { formatDate, formatCurrency, getInitials } from "@/lib/utils";
import { toast } from "sonner";

interface StudentQRCardPageProps {
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
    currentStreak: number;
    libraryId: string;
    seat?: { seatNumber: string; floor: number } | null;
    shift?: { name: string; startTime: string; endTime: string } | null;
    library?: { name: string; logo?: string | null; primaryColor: string } | null;
  } | null;
}

export function StudentQRCardPage({ student }: StudentQRCardPageProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!student) return;
    setGenerating(true);
    // QR data contains student ID + library ID for attendance marking
    const qrPayload = JSON.stringify({
      studentId: student.id,
      sid: student.studentId,
      libraryId: student.libraryId,
      v: 1, // version
    });
    generateQRCode(qrPayload)
      .then(setQrDataUrl)
      .catch(() => toast.error("QR generation failed"))
      .finally(() => setGenerating(false));
  }, [student]);

  const handleDownload = () => {
    if (!qrDataUrl || !student) return;
    // Download QR image
    const link = document.createElement("a");
    link.href = qrDataUrl;
    link.download = `qr-${student.studentId}.png`;
    link.click();
    toast.success("QR code downloaded!");
  };

  const handleShare = async () => {
    if (!student) return;
    if (navigator.share) {
      await navigator.share({
        title: `${student.fullName} — ${student.library?.name}`,
        text: `Student ID: ${student.studentId}`,
      });
    } else {
      navigator.clipboard.writeText(student.studentId);
      toast.success("Student ID copied to clipboard!");
    }
  };

  if (!student) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Student profile not found.</p>
      </div>
    );
  }

  const primaryColor = student.library?.primaryColor || "#6366f1";
  const isActive = student.status === "ACTIVE";
  const isPaid = student.paymentStatus === "PAID";

  return (
    <div className="space-y-6 max-w-lg mx-auto">
      <PageHeader title="My QR ID Card" description="Scan this QR code for attendance" />

      {/* Action buttons */}
      <div className="flex gap-3">
        <Button variant="outline" className="flex-1" onClick={handleShare}>
          <Share2 className="w-4 h-4" />Share
        </Button>
        <Button className="flex-1" onClick={handleDownload} disabled={!qrDataUrl}>
          <Download className="w-4 h-4" />Download QR
        </Button>
      </div>

      {/* ID Card */}
      <motion.div
        ref={cardRef}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-3xl overflow-hidden shadow-2xl"
        style={{ background: `linear-gradient(145deg, ${primaryColor}15, #8b5cf615)` }}
      >
        {/* Card header */}
        <div
          className="p-6 text-white"
          style={{ background: `linear-gradient(135deg, ${primaryColor}, #8b5cf6)` }}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                <BookOpen className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-xs text-white/70 font-medium uppercase tracking-wider">Library ID Card</p>
                <p className="text-sm font-bold">{student.library?.name || "LibraryHub Pro"}</p>
              </div>
            </div>
            <Badge className="bg-white/20 text-white border-0 text-xs">
              {isActive ? "ACTIVE" : "INACTIVE"}
            </Badge>
          </div>

          <div className="flex items-center gap-4">
            <Avatar className="w-20 h-20 border-3 border-white/40 shadow-xl">
              <AvatarImage src={student.profilePhoto ?? ""} />
              <AvatarFallback className="text-2xl bg-white/20 text-white font-bold">
                {getInitials(student.fullName)}
              </AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-2xl font-bold">{student.fullName}</h2>
              <p className="text-white/80 font-mono text-sm mt-0.5">{student.studentId}</p>
              <div className="flex gap-2 mt-2 flex-wrap">
                {student.shift && (
                  <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">{student.shift.name}</span>
                )}
                {student.seat && (
                  <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">Seat {student.seat.seatNumber}</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Card body */}
        <div className="p-6 bg-card space-y-4">
          {/* Info grid */}
          <div className="grid grid-cols-2 gap-4">
            {[
              { icon: Calendar, label: "Joined", value: formatDate(student.joiningDate) },
              { icon: Calendar, label: "Expires", value: student.expiryDate ? formatDate(student.expiryDate) : "—" },
              { icon: Phone, label: "Phone", value: student.phone },
              { icon: Mail, label: "Email", value: student.email, truncate: true },
            ].map((item) => (
              <div key={item.label} className="flex items-start gap-2">
                <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center shrink-0 mt-0.5">
                  <item.icon className="w-3.5 h-3.5 text-muted-foreground" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                  <p className={`text-sm font-medium ${item.truncate ? "truncate" : ""}`}>{item.value}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Attendance", value: `${student.attendancePercentage}%`, color: student.attendancePercentage >= 75 ? "text-emerald-500" : "text-rose-500" },
              { label: "Monthly Fee", value: `₹${student.monthlyFee.toLocaleString("en-IN")}`, color: "text-indigo-400" },
              { label: "Streak", value: `${student.currentStreak}d 🔥`, color: "text-amber-500" },
            ].map((s) => (
              <div key={s.label} className="text-center p-2.5 rounded-xl bg-muted/50 border border-border/50">
                <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Payment status */}
          <div className={`flex items-center justify-between px-4 py-3 rounded-xl border ${isPaid ? "bg-emerald-500/10 border-emerald-500/30" : "bg-amber-500/10 border-amber-500/30"}`}>
            <span className="text-sm font-medium">Fee Status</span>
            <Badge className={isPaid ? "bg-emerald-500/20 text-emerald-500 border-emerald-500/30" : "bg-amber-500/20 text-amber-500 border-amber-500/30"} variant="outline">
              {isPaid ? "✅ PAID" : "⚠️ PENDING"}
            </Badge>
          </div>

          {/* QR Code */}
          <div className="flex flex-col items-center gap-3 pt-2">
            <div className="p-4 bg-white rounded-2xl shadow-lg">
              {generating ? (
                <div className="w-44 h-44 flex items-center justify-center">
                  <QrCode className="w-10 h-10 text-muted-foreground animate-pulse" />
                </div>
              ) : qrDataUrl ? (
                <img src={qrDataUrl} alt="Student QR Code" className="w-44 h-44" />
              ) : (
                <div className="w-44 h-44 flex items-center justify-center">
                  <QrCode className="w-10 h-10 text-muted-foreground" />
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground text-center">
              Scan this QR code to mark attendance
            </p>
          </div>

          {/* Card footer */}
          <div className="flex items-center justify-center gap-2 pt-2 border-t border-border/50">
            <BookOpen className="w-3.5 h-3.5 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">Powered by LibraryHub Pro</p>
          </div>
        </div>
      </motion.div>

      {/* Instructions */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <p className="font-medium text-sm">How to use your QR card</p>
          <div className="space-y-2">
            {[
              { icon: "1️⃣", text: "Show this QR code at the entrance" },
              { icon: "2️⃣", text: "Admin scans it → attendance marked automatically" },
              { icon: "3️⃣", text: "First scan = Check In · Second scan = Check Out" },
              { icon: "4️⃣", text: "Download and keep QR handy on your phone" },
            ].map(({ icon, text }) => (
              <div key={text} className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>{icon}</span>
                <span>{text}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
