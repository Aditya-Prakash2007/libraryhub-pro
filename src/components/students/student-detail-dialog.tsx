"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Phone, Mail, MapPin, Calendar, CreditCard,
  Grid3X3, Clock, Zap, QrCode, FileText,
} from "lucide-react";
import { getStudent } from "@/actions/students";
import { formatDate, formatCurrency, getInitials } from "@/lib/utils";

interface StudentDetailDialogProps {
  studentId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function StudentDetailDialog({ studentId, open, onOpenChange }: StudentDetailDialogProps) {
  const [student, setStudent] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open && studentId) {
      setLoading(true);
      getStudent(studentId).then((result) => {
        if ("error" in result) {
          toast.error(result.error);
        } else {
          setStudent(result.student as Record<string, unknown>);
        }
        setLoading(false);
      });
    }
  }, [open, studentId]);

  const s = student as {
    fullName?: string; studentId?: string; email?: string; phone?: string;
    profilePhoto?: string; status?: string; paymentStatus?: string;
    monthlyFee?: number; joiningDate?: string; expiryDate?: string;
    attendancePercentage?: number; totalPresent?: number; totalAbsent?: number;
    currentStreak?: number; seat?: { seatNumber?: string; floor?: number }; shift?: { name?: string; startTime?: string; endTime?: string };
    payments?: { id: string; paymentId: string; amount: number; status: string; paymentType: string; paidAt?: string }[];
    attendance?: { id: string; date: string; status: string; checkInTime?: string; checkOutTime?: string }[];
    fatherName?: string; address?: string; city?: string; state?: string; depositAmount?: number;
  } | null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b border-border/50">
          <DialogTitle>Student Details</DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[80vh]">
          {loading ? (
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-4">
                <Skeleton className="w-16 h-16 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-4 w-24" />
                </div>
              </div>
              <Skeleton className="h-32 w-full" />
            </div>
          ) : s ? (
            <div className="p-6 space-y-6">
              {/* Profile header */}
              <div className="flex items-start gap-4">
                <Avatar className="w-16 h-16">
                  <AvatarImage src={s.profilePhoto || ""} />
                  <AvatarFallback className="text-lg">{getInitials(s.fullName || "")}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-xl font-bold">{s.fullName}</h2>
                    <Badge variant="secondary" className="text-xs">{s.studentId}</Badge>
                  </div>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      s.status === "ACTIVE" ? "bg-emerald-500/15 text-emerald-500" : "bg-rose-500/15 text-rose-500"
                    }`}>
                      {s.status}
                    </span>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      s.paymentStatus === "PAID" ? "bg-emerald-500/15 text-emerald-500" : "bg-amber-500/15 text-amber-500"
                    }`}>
                      {s.paymentStatus}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" />{s.phone}</span>
                    <span className="flex items-center gap-1 truncate"><Mail className="w-3.5 h-3.5" />{s.email}</span>
                  </div>
                </div>
              </div>

              <Tabs defaultValue="info">
                <TabsList>
                  <TabsTrigger value="info">Info</TabsTrigger>
                  <TabsTrigger value="payments">Payments</TabsTrigger>
                  <TabsTrigger value="attendance">Attendance</TabsTrigger>
                </TabsList>

                <TabsContent value="info" className="space-y-4 mt-4">
                  {/* Quick stats */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { label: "Seat", value: s.seat?.seatNumber ? `${s.seat.seatNumber} (Floor ${s.seat.floor})` : "—", icon: Grid3X3 },
                      { label: "Shift", value: s.shift?.name || "—", icon: Clock },
                      { label: "Monthly Fee", value: formatCurrency(s.monthlyFee || 0), icon: CreditCard },
                      { label: "Streak", value: `${s.currentStreak || 0} days`, icon: Zap },
                    ].map((item) => (
                      <div key={item.label} className="p-3 rounded-lg bg-muted/50 border border-border/50">
                        <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                          <item.icon className="w-3.5 h-3.5" />
                          <span className="text-xs">{item.label}</span>
                        </div>
                        <p className="font-semibold text-sm">{item.value}</p>
                      </div>
                    ))}
                  </div>

                  {/* Attendance progress */}
                  <div className="p-4 rounded-lg border border-border/50">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="font-medium">Attendance</span>
                      <span className="text-muted-foreground">{s.attendancePercentage || 0}%</span>
                    </div>
                    <Progress value={s.attendancePercentage || 0} className="h-2" />
                    <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                      <span>✅ Present: {s.totalPresent || 0}</span>
                      <span>❌ Absent: {s.totalAbsent || 0}</span>
                    </div>
                  </div>

                  {/* Details */}
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    {[
                      { label: "Father's Name", value: s.fatherName },
                      { label: "Joining Date", value: s.joiningDate ? formatDate(s.joiningDate) : "—" },
                      { label: "Expiry Date", value: s.expiryDate ? formatDate(s.expiryDate) : "—" },
                      { label: "Address", value: s.city ? `${s.city}, ${s.state}` : s.address },
                    ].map((item) => item.value && (
                      <div key={item.label}>
                        <p className="text-xs text-muted-foreground">{item.label}</p>
                        <p className="font-medium">{item.value}</p>
                      </div>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="payments" className="mt-4">
                  <div className="space-y-2">
                    {s.payments && s.payments.length > 0 ? (
                      s.payments.map((p) => (
                        <div key={p.id} className="flex items-center justify-between p-3 rounded-lg border border-border/50">
                          <div>
                            <p className="text-sm font-medium">{p.paymentType.replace("_", " ")}</p>
                            <p className="text-xs text-muted-foreground">{p.paymentId}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-sm">{formatCurrency(p.amount)}</p>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                              p.status === "PAID" ? "bg-emerald-500/15 text-emerald-500" : "bg-amber-500/15 text-amber-500"
                            }`}>
                              {p.status}
                            </span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-center text-muted-foreground py-8 text-sm">No payments yet</p>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="attendance" className="mt-4">
                  <div className="space-y-2">
                    {Array.from({ length: 7 }).map((_, i) => {
                      const d = new Date();
                      d.setDate(d.getDate() - i);
                      // Use local timezone formatting for YYYY-MM-DD
                      const dateStr = d.toLocaleDateString("en-CA"); // e.g. "2026-07-08"
                      
                      const record = s.attendance?.find((a: any) => {
                        const aDate = new Date(a.date).toLocaleDateString("en-CA");
                        return aDate === dateStr;
                      });

                      const isToday = i === 0;

                      return (
                        <div key={dateStr} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg border border-border/50 bg-muted/20">
                          <div className="flex items-center gap-3 mb-2 sm:mb-0">
                            <div className="flex flex-col">
                              <span className="text-sm font-medium">
                                {isToday ? "Today" : d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                              </span>
                              <span className="text-xs text-muted-foreground">{dateStr}</span>
                            </div>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                              record?.status === "PRESENT" ? "bg-emerald-500/15 text-emerald-500" :
                              record?.status === "ABSENT" ? "bg-rose-500/15 text-rose-500" :
                              record?.status ? "bg-amber-500/15 text-amber-500" :
                              "bg-slate-500/15 text-slate-500"
                            }`}>
                              {record?.status || "NO RECORD"}
                            </span>
                          </div>
                          <div className="flex gap-4 text-xs">
                            <div className="flex flex-col">
                              <span className="text-muted-foreground">Check-In</span>
                              <span className="font-medium">
                                {record?.checkInTime 
                                  ? new Date(record.checkInTime).toLocaleTimeString("en-US", { hour: '2-digit', minute: '2-digit', hour12: true }) 
                                  : "--:--"}
                              </span>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-muted-foreground">Check-Out</span>
                              <span className="font-medium">
                                {record?.checkOutTime 
                                  ? new Date(record.checkOutTime).toLocaleTimeString("en-US", { hour: '2-digit', minute: '2-digit', hour12: true }) 
                                  : "--:--"}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          ) : null}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
