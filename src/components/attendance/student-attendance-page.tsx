"use client";

import { motion } from "framer-motion";
import { CalendarCheck, Zap, TrendingUp, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { PageHeader } from "@/components/shared/page-header";
import { formatDate } from "@/lib/utils";

interface AttendanceRecord {
  id: string;
  date: Date;
  checkInTime?: Date | null;
  checkOutTime?: Date | null;
  status: string;
  shift?: { name: string } | null;
}

interface Student {
  id: string;
  fullName: string;
  studentId: string;
  attendancePercentage: number;
  totalPresent: number;
  totalAbsent: number;
  currentStreak: number;
  longestStreak: number;
}

export function StudentAttendancePage({
  student, attendance,
}: {
  student: Student | null;
  attendance: AttendanceRecord[];
}) {
  if (!student) return null;

  const statusColor = (status: string) => {
    const map: Record<string, string> = {
      PRESENT: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
      ABSENT: "bg-rose-500/20 text-rose-400 border-rose-500/30",
      LATE: "bg-amber-500/20 text-amber-400 border-amber-500/30",
      HALF_DAY: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    };
    return map[status] || "bg-muted text-muted-foreground border-border";
  };

  return (
    <div className="space-y-6">
      <PageHeader title="My Attendance" description="Track your daily presence" />

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Attendance", value: `${student.attendancePercentage}%`, icon: TrendingUp, color: "text-indigo-500" },
          { label: "Present", value: student.totalPresent, icon: CalendarCheck, color: "text-emerald-500" },
          { label: "Absent", value: student.totalAbsent, icon: XCircle, color: "text-rose-500" },
          { label: "Current Streak", value: `${student.currentStreak}d`, icon: Zap, color: "text-amber-500" },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <s.icon className={`w-4 h-4 ${s.color}`} />
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Progress */}
      <Card>
        <CardHeader><CardTitle>Overall Progress</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between text-sm mb-1">
            <span>Attendance Percentage</span>
            <span className="font-semibold">{student.attendancePercentage}%</span>
          </div>
          <Progress value={student.attendancePercentage} className="h-3" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Minimum required: 75%</span>
            <span>Best streak: {student.longestStreak} days</span>
          </div>
        </CardContent>
      </Card>

      {/* Calendar heatmap style */}
      <Card>
        <CardHeader><CardTitle>Attendance History</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-1 mb-3">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <div key={d} className="text-center text-xs text-muted-foreground">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {attendance.slice(0, 63).reverse().map((a) => (
              <div
                key={a.id}
                title={`${formatDate(a.date)} - ${a.status}`}
                className={`aspect-square rounded-sm border text-[9px] flex items-center justify-center font-medium ${statusColor(a.status)}`}
              >
                {new Date(a.date).getDate()}
              </div>
            ))}
          </div>
          <div className="flex items-center gap-4 mt-3 flex-wrap">
            {[
              { label: "Present", cls: "bg-emerald-500" },
              { label: "Absent", cls: "bg-rose-500" },
              { label: "Late", cls: "bg-amber-500" },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <div className={`w-3 h-3 rounded-sm ${item.cls}`} />
                {item.label}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* List */}
      <Card>
        <CardHeader><CardTitle>Recent Records</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border/50">
            {attendance.slice(0, 20).map((a) => (
              <div key={a.id} className="flex items-center gap-3 px-4 py-3">
                <div className={`w-2 h-2 rounded-full ${
                  a.status === "PRESENT" ? "bg-emerald-500" :
                  a.status === "ABSENT" ? "bg-rose-500" : "bg-amber-500"
                }`} />
                <div className="flex-1">
                  <p className="text-sm font-medium">{formatDate(a.date)}</p>
                  {a.shift && <p className="text-xs text-muted-foreground">{a.shift.name}</p>}
                </div>
                <div className="text-right">
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${statusColor(a.status)}`}>
                    {a.status}
                  </span>
                  {a.checkInTime && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {new Date(a.checkInTime).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
