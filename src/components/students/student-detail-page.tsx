"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  ArrowLeft, Edit, Trash2, UserX, UserCheck, Bell,
  Phone, Mail, MapPin, Grid3X3, Clock, CreditCard,
  CalendarCheck, FileText, Download, Zap,
  LogIn, LogOut,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { formatDate, formatCurrency, getInitials, formatDateTime } from "@/lib/utils";
import { deleteStudent, toggleStudentStatus } from "@/actions/students";
import { sendSingleFeeReminder } from "@/actions/fees";


interface StudentDetailPageProps {
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
    depositAmount: number;
    discountAmount: number;
    joiningDate: Date;
    expiryDate?: Date | null;
    nextDueDate?: Date | null;
    attendancePercentage: number;
    totalPresent: number;
    totalAbsent: number;
    currentStreak: number;
    longestStreak: number;
    notes?: string | null;
    seat?: { seatNumber: string; floor: number; seatType: string } | null;
    shift?: { name: string; startTime: string; endTime: string; color: string } | null;
    payments: { id: string; paymentId: string; amount: number; totalAmount: number; paymentType: string; paymentMode: string; status: string; paidAt?: Date | null; createdAt: Date }[];
    invoices: { id: string; invoiceNumber: string; total: number; status: string; issuedAt: Date }[];
    attendance: { id: string; date: Date; status: string; checkInTime?: Date | null; checkOutTime?: Date | null }[];
    documents: { id: string; name: string; type: string; url: string; isVerified: boolean }[];
  };
}

export function StudentDetailPage({ student: s }: StudentDetailPageProps) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [sendingReminder, setSendingReminder] = useState(false);

  const handleDelete = async () => {
    if (!confirm(`Permanently delete "${s.fullName}"? This cannot be undone.`)) return;
    setDeleting(true);
    const result = await deleteStudent(s.id);
    if ("error" in result) {
      toast.error(result.error);
      setDeleting(false);
    } else {
      toast.success("Student deleted");
      router.push("/admin/students");
    }
  };

  const handleToggleStatus = async () => {
    setToggling(true);
    const newStatus = s.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
    const result = await toggleStudentStatus(s.id, newStatus);
    if ("error" in result) {
      toast.error(result.error);
    } else {
      toast.success(`Student ${newStatus === "ACTIVE" ? "activated" : "suspended"}`);
      router.refresh();
    }
    setToggling(false);
  };

  const handleSendReminder = async () => {
    setSendingReminder(true);
    const result = await sendSingleFeeReminder(s.id);
    if ("error" in result) {
      toast.error(result.error);
    } else {
      toast.success("Fee reminder sent successfully! 🔔");
    }
    setSendingReminder(false);
  };

  const statusColor = (status: string) => ({
    PRESENT: "bg-emerald-500/20 text-emerald-400",
    ABSENT: "bg-rose-500/20 text-rose-400",
    LATE: "bg-amber-500/20 text-amber-400",
    HALF_DAY: "bg-blue-500/20 text-blue-400",
  }[status] || "bg-muted text-muted-foreground");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/students"><ArrowLeft className="w-4 h-4" /></Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Student Details</h1>
          <p className="text-muted-foreground text-sm">{s.studentId}</p>
        </div>
        <div className="flex items-center gap-2">
          {s.status === "ACTIVE" && s.paymentStatus !== "PAID" && (
            <Button
              variant="outline"
              size="sm"
              className="text-amber-500 hover:text-amber-600 hover:bg-amber-500/10 border-amber-500/30"
              onClick={handleSendReminder}
              loading={sendingReminder}
            >
              <Bell className="w-4 h-4 mr-1" /> Send Reminder
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleToggleStatus}
            loading={toggling}
          >
            {s.status === "ACTIVE"
              ? <><UserX className="w-4 h-4" /> Suspend</>
              : <><UserCheck className="w-4 h-4" /> Activate</>}
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/admin/students?edit=${s.id}`}>
              <Edit className="w-4 h-4" /> Edit
            </Link>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={handleDelete}
            loading={deleting}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>


      {/* Profile card */}
      <Card className="overflow-hidden">
        <div className="h-20 bg-gradient-to-r from-indigo-600 to-violet-700" />
        <CardContent className="px-6 pb-6">
          <div className="flex flex-col sm:flex-row sm:items-end gap-4 -mt-10">
            <Avatar className="w-20 h-20 border-4 border-background shadow-xl">
              <AvatarImage src={s.profilePhoto || ""} />
              <AvatarFallback className="text-2xl">{getInitials(s.fullName)}</AvatarFallback>
            </Avatar>
            <div className="flex-1 sm:pb-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-bold">{s.fullName}</h2>
                <Badge variant={s.status === "ACTIVE" ? "default" : "destructive"} className="text-xs">{s.status}</Badge>
                <Badge variant="outline" className={`text-xs ${s.paymentStatus === "PAID" ? "text-emerald-500 border-emerald-500/30" : "text-amber-500 border-amber-500/30"}`}>
                  {s.paymentStatus === "PAID"
                    ? `Paid until ${s.nextDueDate ? formatDate(s.nextDueDate) : "—"}`
                    : `Pending since ${s.nextDueDate ? formatDate(s.nextDueDate) : "—"}`}
                </Badge>
              </div>
              <div className="flex flex-wrap gap-4 mt-2 text-sm text-muted-foreground">
                <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" />{s.phone}</span>
                <span className="flex items-center gap-1 truncate"><Mail className="w-3.5 h-3.5" />{s.email}</span>
                {s.city && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{s.city}</span>}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Seat", value: s.seat?.seatNumber || "—", sub: s.seat ? `Floor ${s.seat.floor}` : "Unassigned", color: "text-indigo-500 bg-indigo-500/10", icon: Grid3X3 },
          { label: "Shift", value: s.shift?.name || "—", sub: s.shift ? `${s.shift.startTime}–${s.shift.endTime}` : "No shift", color: "text-violet-500 bg-violet-500/10", icon: Clock },
          { label: "Monthly Fee", value: formatCurrency(s.monthlyFee), sub: `Net: ${formatCurrency(s.monthlyFee - s.discountAmount)}`, color: "text-emerald-500 bg-emerald-500/10", icon: CreditCard },
          { label: "Attendance", value: `${s.attendancePercentage}%`, sub: `Streak: ${s.currentStreak} days`, color: "text-amber-500 bg-amber-500/10", icon: CalendarCheck },
        ].map((item, i) => (
          <motion.div key={item.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
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

      {/* Tabs */}
      <Tabs defaultValue="info">
        <TabsList>
          <TabsTrigger value="info">Info</TabsTrigger>
          <TabsTrigger value="attendance">Attendance ({s.attendance.length})</TabsTrigger>
          <TabsTrigger value="payments">Payments ({s.payments.length})</TabsTrigger>
          <TabsTrigger value="documents">Documents ({s.documents.length})</TabsTrigger>
        </TabsList>

        {/* Info tab */}
        <TabsContent value="info" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle className="text-base">Personal Details</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm">
                {[
                  ["Father's Name", s.fatherName || "—"],
                  ["Mother's Name", s.motherName || "—"],
                  ["Gender", s.gender || "—"],
                  ["WhatsApp", s.whatsappNumber || "—"],
                  ["Emergency Contact", s.emergencyContact || "—"],
                  ["Occupation", s.occupation || "—"],
                  ["Institution", s.institution || "—"],
                  ["Address", s.address ? `${s.address}, ${s.city}, ${s.state} ${s.pincode}` : "—"],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between gap-4">
                    <span className="text-muted-foreground shrink-0">{label}</span>
                    <span className="font-medium text-right">{value}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">Membership</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm">
                {[
                  ["Joining Date", formatDate(s.joiningDate)],
                  ["Expiry Date", s.expiryDate ? formatDate(s.expiryDate) : "N/A"],
                  ["Fee Paid Until", s.nextDueDate ? formatDate(s.nextDueDate) : "N/A"],
                  ["Monthly Fee", formatCurrency(s.monthlyFee)],
                  ["Discount", formatCurrency(s.discountAmount)],
                  ["Net Monthly", formatCurrency(s.monthlyFee - s.discountAmount)],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between gap-4">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="font-medium">{value}</span>
                  </div>
                ))}
                {s.notes && (
                  <div className="pt-2 border-t border-border/50">
                    <p className="text-muted-foreground text-xs mb-1">Notes</p>
                    <p>{s.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Attendance tab */}
        <TabsContent value="attendance" className="mt-4">
          <Card>
            <CardContent className="p-4">
              {/* Progress */}
              <div className="flex items-center gap-4 mb-4 p-3 rounded-lg bg-muted/50">
                <div className="flex-1">
                  <div className="flex justify-between text-sm mb-1">
                    <span>Overall Attendance</span>
                    <span className="font-semibold">{s.attendancePercentage}%</span>
                  </div>
                  <Progress value={s.attendancePercentage} className="h-2" />
                </div>
                <div className="flex gap-4 text-sm shrink-0">
                  <span className="text-emerald-500">✅ {s.totalPresent}</span>
                  <span className="text-rose-500">❌ {s.totalAbsent}</span>
                  <span className="text-amber-500">🔥 {s.currentStreak} days</span>
                </div>
              </div>

              {/* Weekly In/Out History */}
              <div className="mb-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2">This Week&apos;s In / Out Times</p>
                <div className="rounded-lg border border-border/40 overflow-hidden">
                  <div className="grid grid-cols-4 gap-0 bg-muted/30 px-3 py-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                    <span>Day</span>
                    <span className="text-emerald-500 flex items-center gap-1"><LogIn className="w-3 h-3" />In</span>
                    <span className="text-rose-400 flex items-center gap-1"><LogOut className="w-3 h-3" />Out</span>
                    <span>Status</span>
                  </div>
                  {(() => {
                    const rows = [];
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    for (let i = 0; i < 7; i++) {
                      const d = new Date();
                      d.setDate(d.getDate() - i);
                      d.setHours(0, 0, 0, 0);
                      const dateStr = d.toISOString().split("T")[0];
                      const rec = s.attendance.find((a) => {
                        const rd = new Date(a.date);
                        rd.setHours(0, 0, 0, 0);
                        return rd.toISOString().split("T")[0] === dateStr;
                      });
                      const label = i === 0 ? "Today" : i === 1 ? "Yesterday" : d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
                      const fmtT = (dt?: Date | null) =>
                        dt ? new Date(dt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true }) : "—";
                      const statusCls = rec
                        ? { PRESENT: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20", ABSENT: "text-rose-400 bg-rose-500/10 border-rose-500/20", LATE: "text-amber-400 bg-amber-500/10 border-amber-500/20", HALF_DAY: "text-blue-400 bg-blue-500/10 border-blue-500/20" }[rec.status] ?? "text-muted-foreground bg-muted border-border"
                        : "text-slate-500 bg-slate-800/30 border-slate-700/30";
                      rows.push(
                        <div key={dateStr} className={`grid grid-cols-4 gap-0 px-3 py-2.5 text-xs border-t border-border/30 ${i === 0 ? "bg-indigo-500/5" : "hover:bg-muted/20"} transition-colors`}>
                          <span className={`font-medium ${i === 0 ? "text-indigo-400" : "text-foreground"}`}>{label}</span>
                          <span className="text-muted-foreground font-mono">{fmtT(rec?.checkInTime)}</span>
                          <span className="text-muted-foreground font-mono">{fmtT(rec?.checkOutTime)}</span>
                          <span className={`inline-flex self-center text-[9px] px-1.5 py-0.5 rounded-full border font-semibold w-fit ${statusCls}`}>
                            {rec ? rec.status : "ABSENT"}
                          </span>
                        </div>
                      );
                    }
                    return rows;
                  })()}
                </div>
              </div>

              {/* Calendar grid */}
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2">Recent Calendar</p>
              <div className="flex flex-wrap gap-1">
                {s.attendance.slice(0, 60).reverse().map((a) => (
                  <div
                    key={a.id}
                    title={`${formatDate(a.date)} — ${a.status}`}
                    className={`w-8 h-8 rounded text-[10px] flex items-center justify-center font-medium ${statusColor(a.status)}`}
                  >
                    {new Date(a.date).getDate()}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payments tab */}
        <TabsContent value="payments" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <div className="divide-y divide-border/50">
                {s.payments.length === 0 ? (
                  <div className="py-12 text-center text-muted-foreground text-sm">No payments yet</div>
                ) : (
                  s.payments.map((p) => (
                    <div key={p.id} className="flex items-center gap-4 px-5 py-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{p.paymentType.replace("_", " ")}</p>
                        <p className="text-xs text-muted-foreground font-mono">{p.paymentId} · {p.paymentMode}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-sm">{formatCurrency(p.totalAmount)}</p>
                        <p className="text-xs text-muted-foreground">{p.paidAt ? formatDate(p.paidAt) : formatDate(p.createdAt)}</p>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${p.status === "PAID" ? "bg-emerald-500/15 text-emerald-500" : "bg-amber-500/15 text-amber-500"}`}>
                        {p.status}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Documents tab */}
        <TabsContent value="documents" className="mt-4">
          <Card>
            <CardContent className="p-4">
              {s.documents.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground text-sm">No documents uploaded</div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {s.documents.map((doc) => (
                    <a
                      key={doc.id}
                      href={doc.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 rounded-lg border border-border/50 hover:bg-muted/30 transition-colors group"
                    >
                      <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center shrink-0">
                        <FileText className="w-5 h-5 text-indigo-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{doc.name}</p>
                        <p className="text-xs text-muted-foreground">{doc.type}</p>
                      </div>
                      <Download className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
                    </a>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
