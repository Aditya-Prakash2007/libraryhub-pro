"use client";

import { motion } from "framer-motion";
import {
  CalendarCheck, Zap, TrendingUp, XCircle,
  LogIn, LogOut, Clock, CheckCircle2, Circle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/shared/page-header";

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

function fmt(d: Date | null | undefined) {
  if (!d) return null;
  return new Date(d).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function fmtDay(d: Date) {
  const date = new Date(d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  date.setHours(0, 0, 0, 0);

  if (date.getTime() === today.getTime()) return "Today";
  if (date.getTime() === yesterday.getTime()) return "Yesterday";
  return new Date(d).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
}

function buildWeek(records: AttendanceRecord[]) {
  // Build last 7 days array (most recent first)
  const week: { dateStr: string; date: Date; record: AttendanceRecord | null }[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    d.setHours(0, 0, 0, 0);
    const dateStr = d.toISOString().split("T")[0];
    const record = records.find((r) => {
      const rd = new Date(r.date);
      rd.setHours(0, 0, 0, 0);
      return rd.toISOString().split("T")[0] === dateStr;
    }) ?? null;
    week.push({ dateStr, date: d, record });
  }
  return week;
}

export function StudentAttendancePage({
  student, attendance,
}: {
  student: Student | null;
  attendance: AttendanceRecord[];
}) {
  if (!student) return null;

  const week = buildWeek(attendance);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const statusColor = (status: string) => ({
    PRESENT: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    ABSENT: "text-rose-400 bg-rose-500/10 border-rose-500/20",
    LATE: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    HALF_DAY: "text-blue-400 bg-blue-500/10 border-blue-500/20",
  }[status] || "text-muted-foreground bg-muted border-border");

  const dotColor = (status: string) => ({
    PRESENT: "bg-emerald-500",
    ABSENT: "bg-rose-500",
    LATE: "bg-amber-500",
    HALF_DAY: "bg-blue-500",
  }[status] || "bg-muted-foreground");

  // Today's record
  const todayRec = week[0]?.record;

  return (
    <div className="space-y-6">
      <PageHeader title="My Attendance" description="This week's attendance history" />

      {/* Today's Status Banner */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        {todayRec?.checkInTime ? (
          <Card className={`border ${todayRec.checkOutTime
            ? "border-violet-500/30 bg-violet-500/5"
            : "border-emerald-500/30 bg-emerald-500/5"
          }`}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  todayRec.checkOutTime ? "bg-violet-500/15" : "bg-emerald-500/15"
                }`}>
                  {todayRec.checkOutTime
                    ? <LogOut className="w-5 h-5 text-violet-400" />
                    : <LogIn className="w-5 h-5 text-emerald-400" />
                  }
                </div>
                <div className="flex-1">
                  <p className={`font-semibold ${todayRec.checkOutTime ? "text-violet-400" : "text-emerald-400"}`}>
                    {todayRec.checkOutTime ? "Session Complete" : "Currently Checked In"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {todayRec.checkOutTime
                      ? `${fmt(todayRec.checkInTime)} → ${fmt(todayRec.checkOutTime)}`
                      : `Checked in at ${fmt(todayRec.checkInTime)} · Still inside`
                    }
                  </p>
                </div>
                <Badge variant="outline" className={
                  todayRec.checkOutTime
                    ? "text-violet-400 border-violet-500/30"
                    : "text-emerald-400 border-emerald-500/30 animate-pulse"
                }>
                  {todayRec.checkOutTime ? "Done" : "Live"}
                </Badge>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-slate-700/50 bg-muted/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-muted/50 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium text-muted-foreground">Not checked in today</p>
                  <p className="text-xs text-muted-foreground">Scan the library QR code to mark your attendance</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Attendance", value: `${student.attendancePercentage}%`, icon: TrendingUp, color: "text-indigo-500" },
          { label: "Present", value: student.totalPresent, icon: CalendarCheck, color: "text-emerald-500" },
          { label: "Absent", value: student.totalAbsent, icon: XCircle, color: "text-rose-500" },
          { label: "Current Streak", value: `${student.currentStreak}d`, icon: Zap, color: "text-amber-500" },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
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
        <CardHeader><CardTitle className="text-base">Overall Progress</CardTitle></CardHeader>
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

      {/* Weekly History — 7 days with In/Out times */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <CalendarCheck className="w-4 h-4 text-indigo-500" />
            This Week&apos;s History
            <Badge variant="secondary" className="ml-auto text-[10px]">Last 7 days</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border/40">
            {week.map(({ date, record }, i) => {
              const isToday = date.getTime() === today.getTime();
              const isFuture = date.getTime() > today.getTime();

              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className={`flex items-center gap-4 px-4 py-3.5 ${isToday ? "bg-indigo-500/5" : ""} ${isFuture ? "opacity-40" : ""}`}
                >
                  {/* Day label */}
                  <div className="w-20 shrink-0">
                    <p className={`text-sm font-medium ${isToday ? "text-indigo-400" : "text-foreground"}`}>
                      {fmtDay(date)}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {new Date(date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                    </p>
                  </div>

                  {/* Status indicator */}
                  <div className="flex items-center justify-center w-6">
                    {isFuture ? (
                      <Circle className="w-3 h-3 text-muted-foreground/30" />
                    ) : record ? (
                      <div className={`w-2.5 h-2.5 rounded-full ${dotColor(record.status)}`} />
                    ) : (
                      <div className="w-2.5 h-2.5 rounded-full bg-slate-600" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    {isFuture ? (
                      <p className="text-xs text-muted-foreground">—</p>
                    ) : record ? (
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                        {/* Check-in */}
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <LogIn className="w-3 h-3 text-emerald-500" />
                          {fmt(record.checkInTime) ?? <span className="text-slate-500">—</span>}
                        </span>
                        {/* Check-out */}
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <LogOut className="w-3 h-3 text-rose-400" />
                          {fmt(record.checkOutTime) ?? <span className="text-slate-500">—</span>}
                        </span>
                        {record.shift && (
                          <span className="text-[10px] text-muted-foreground opacity-70">{record.shift.name}</span>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">No record</p>
                    )}
                  </div>

                  {/* Status badge */}
                  <div className="shrink-0">
                    {!isFuture && record ? (
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${statusColor(record.status)}`}>
                        {record.status}
                      </span>
                    ) : !isFuture ? (
                      <span className="text-[10px] px-2 py-0.5 rounded-full border border-slate-700 text-slate-500 font-medium">
                        ABSENT
                      </span>
                    ) : null}
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 px-4 py-3 border-t border-border/40 flex-wrap">
            {[
              { label: "Present", cls: "bg-emerald-500" },
              { label: "Absent", cls: "bg-rose-500" },
              { label: "Late", cls: "bg-amber-500" },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <div className={`w-2 h-2 rounded-full ${item.cls}`} />
                {item.label}
              </div>
            ))}
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground ml-auto">
              <CheckCircle2 className="w-3 h-3 text-indigo-400" />
              Records auto-reset at midnight daily
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
