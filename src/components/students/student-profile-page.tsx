"use client";

import { motion } from "framer-motion";
import {
  User, Phone, Mail, MapPin, Calendar, Grid3X3,
  Clock, FileText, Building2, Shield, Zap,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { PageHeader } from "@/components/shared/page-header";
import { formatDate, formatCurrency, getInitials } from "@/lib/utils";
import { PaymentCalendar } from "@/components/students/payment-calendar";

interface StudentProfileProps {
  student: {
    id: string;
    studentId: string;
    fullName: string;
    fatherName?: string | null;
    motherName?: string | null;
    email: string;
    phone: string;
    whatsappNumber?: string | null;
    emergencyContact?: string | null;
    profilePhoto?: string | null;
    address?: string | null;
    city?: string | null;
    state?: string | null;
    pincode?: string | null;
    gender?: string | null;
    occupation?: string | null;
    institution?: string | null;
    status: string;
    paymentStatus: string;
    monthlyFee: number;
    joiningDate: Date;
    expiryDate?: Date | null;
    nextDueDate?: Date | null;
    totalDueAmount?: number;
    attendancePercentage: number;
    totalPresent: number;
    totalAbsent: number;
    currentStreak: number;
    longestStreak: number;
    notes?: string | null;
    seat?: { seatNumber: string; floor: number; seatType: string } | null;
    shift?: { name: string; startTime: string; endTime: string; color: string } | null;
    documents?: { id: string; name: string; type: string; url: string }[];
    library?: { name: string; logo?: string | null; primaryColor: string } | null;
  } | null;
}

export function StudentProfilePage({ student: s }: StudentProfileProps) {
  if (!s) return (
    <div className="flex items-center justify-center h-64">
      <p className="text-muted-foreground">Profile not found. Please contact admin.</p>
    </div>
  );

  const infoItems = [
    { label: "Student ID", value: s.studentId, icon: Shield },
    { label: "Email", value: s.email, icon: Mail },
    { label: "Phone", value: s.phone, icon: Phone },
    { label: "WhatsApp", value: s.whatsappNumber || "—", icon: Phone },
    { label: "Gender", value: s.gender || "—", icon: User },
    { label: "Occupation", value: s.occupation || "—", icon: Building2 },
    { label: "Institution", value: s.institution || "—", icon: Building2 },
    { label: "Emergency Contact", value: s.emergencyContact || "—", icon: Phone },
    { label: "Address", value: s.city ? `${s.city}, ${s.state} ${s.pincode}` : s.address || "—", icon: MapPin },
  ];

  const familyItems = [
    { label: "Father's Name", value: s.fatherName || "—" },
    { label: "Mother's Name", value: s.motherName || "—" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="My Profile" description="Your library membership details" />

      {/* Profile hero card */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="overflow-hidden">
          {/* Cover gradient */}
          <div
            className="h-28 bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-700"
            style={{ background: s.library?.primaryColor ? `linear-gradient(135deg, ${s.library.primaryColor}, #8b5cf6)` : undefined }}
          />
          <CardContent className="px-6 pb-6">
            <div className="flex flex-col sm:flex-row sm:items-end gap-4 -mt-10">
              <Avatar className="w-20 h-20 border-4 border-background shadow-xl">
                <AvatarImage src={s.profilePhoto || ""} />
                <AvatarFallback className="text-2xl">{getInitials(s.fullName)}</AvatarFallback>
              </Avatar>
              <div className="flex-1 sm:pb-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-2xl font-bold">{s.fullName}</h2>
                  <Badge variant={s.status === "ACTIVE" ? "default" : "destructive"} className="text-xs">
                    {s.status}
                  </Badge>
                  <Badge
                    className={`text-xs ${s.paymentStatus === "PAID" ? "bg-emerald-500/15 text-emerald-500" : "bg-amber-500/15 text-amber-500"}`}
                    variant="outline"
                  >
                    Fee: {s.paymentStatus}
                  </Badge>
                </div>
                <p className="text-muted-foreground text-sm mt-0.5">
                  {s.library?.name} · {s.studentId}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Seat", value: s.seat?.seatNumber || "—", sub: s.seat ? `Floor ${s.seat.floor} · ${s.seat.seatType}` : "Not assigned", icon: Grid3X3, color: "text-indigo-500 bg-indigo-500/10" },
          { label: "Shift", value: s.shift?.name || "—", sub: s.shift ? `${s.shift.startTime}–${s.shift.endTime}` : "No shift", icon: Clock, color: "text-violet-500 bg-violet-500/10" },
          { label: "Monthly Fee", value: formatCurrency(s.monthlyFee), sub: `Joined: ${formatDate(s.joiningDate)}`, icon: FileText, color: "text-emerald-500 bg-emerald-500/10" },
          { label: "Streak", value: `${s.currentStreak} days`, sub: `Best: ${s.longestStreak} days`, icon: Zap, color: "text-amber-500 bg-amber-500/10" },
        ].map((item, i) => (
          <motion.div key={item.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.08 }}>
            <Card className="p-4 dashboard-card">
              <div className="flex items-start justify-between mb-2">
                <p className="text-xs text-muted-foreground">{item.label}</p>
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${item.color.split(" ")[1]}`}>
                  <item.icon className={`w-4 h-4 ${item.color.split(" ")[0]}`} />
                </div>
              </div>
              <p className="font-bold text-base">{item.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{item.sub}</p>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Payment Calendar */}
      <Card>
        <CardContent className="p-6">
          <PaymentCalendar 
            joiningDate={s.joiningDate} 
            nextDueDate={s.nextDueDate} 
            totalDueAmount={s.totalDueAmount || 0} 
            monthlyFee={s.monthlyFee} 
          />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Personal info */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Personal Information</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {infoItems.map((item) => (
                  <div key={item.label} className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0 mt-0.5">
                      <item.icon className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">{item.label}</p>
                      <p className="text-sm font-medium break-all">{item.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Family info */}
          <Card>
            <CardHeader><CardTitle className="text-base">Family Information</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                {familyItems.map((item) => (
                  <div key={item.label}>
                    <p className="text-xs text-muted-foreground">{item.label}</p>
                    <p className="text-sm font-medium">{item.value}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right column */}
        <div className="space-y-4">
          {/* Membership */}
          <Card>
            <CardHeader><CardTitle className="text-base">Membership</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {[
                { label: "Joining Date", value: formatDate(s.joiningDate) },
                { label: "Expiry Date", value: s.expiryDate ? formatDate(s.expiryDate) : "N/A" },
                { label: "Monthly Fee", value: formatCurrency(s.monthlyFee) },
              ].map((item) => (
                <div key={item.label} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{item.label}</span>
                  <span className="font-medium">{item.value}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Attendance summary */}
          <Card>
            <CardHeader><CardTitle className="text-base">Attendance Summary</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div>
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="text-muted-foreground">Overall</span>
                  <span className="font-semibold">{s.attendancePercentage}%</span>
                </div>
                <Progress value={s.attendancePercentage} className="h-2" />
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="p-2 rounded-lg bg-emerald-500/10 text-center">
                  <p className="text-xl font-bold text-emerald-500">{s.totalPresent}</p>
                  <p className="text-xs text-emerald-600">Present</p>
                </div>
                <div className="p-2 rounded-lg bg-rose-500/10 text-center">
                  <p className="text-xl font-bold text-rose-500">{s.totalAbsent}</p>
                  <p className="text-xs text-rose-600">Absent</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Documents */}
          <Card>
            <CardHeader><CardTitle className="text-base">Documents</CardTitle></CardHeader>
            <CardContent>
              {s.documents && s.documents.length > 0 ? (
                <div className="space-y-2">
                  {s.documents.map((doc) => (
                    <a
                      key={doc.id}
                      href={doc.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 p-2 rounded-lg border border-border/50 hover:bg-muted/30 transition-colors"
                    >
                      <FileText className="w-4 h-4 text-indigo-500 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{doc.name}</p>
                        <p className="text-xs text-muted-foreground">{doc.type}</p>
                      </div>
                    </a>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">No documents uploaded</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Notes */}
      {s.notes && (
        <Card>
          <CardHeader><CardTitle className="text-base">Notes from Admin</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground leading-relaxed">{s.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
