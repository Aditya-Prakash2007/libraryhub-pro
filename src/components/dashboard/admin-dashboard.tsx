"use client";

import { useState, useEffect } from "react";
import {
  Users, Grid3X3, CreditCard, CalendarCheck,
  TrendingUp, AlertCircle, CheckCircle2, Clock,
  BarChart3, Activity, BookOpen, Zap,
} from "lucide-react";
import { motion } from "framer-motion";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";
import { StatsCard } from "@/components/shared/stats-card";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrency, formatDate } from "@/lib/utils";
import { getRevenueAnalytics } from "@/actions/payments";
import { DueFeesDialog } from "@/components/dashboard/due-fees-dialog";
import Link from "next/link";

interface DashboardStats {
  totalStudents: number;
  activeStudents: number;
  inactiveStudents: number;
  suspendedStudents: number;
  totalSeats: number;
  occupiedSeats: number;
  availableSeats: number;
  revenueToday: number;
  revenueThisMonth: number;
  pendingPayments: number;
  todayAttendance: number;
  overdueStudents: number;
  occupancyRate: number;
  attendanceRate: number;
}

const COLORS = ["#6366f1", "#8b5cf6", "#a78bfa", "#c4b5fd"];

import { useRouter } from "next/navigation";

export function AdminDashboard({ stats }: { stats: DashboardStats | null }) {
  const router = useRouter();
  const [revenueData, setRevenueData] = useState<{ date: string; revenue: number }[]>([]);
  const [revenuePeriod, setRevenuePeriod] = useState<"week" | "month" | "year">("month");
  const [loading, setLoading] = useState(false);
  const [dueFeesOpen, setDueFeesOpen] = useState(false);

  useEffect(() => {
    async function loadRevenue() {
      setLoading(true);
      const result = await getRevenueAnalytics(revenuePeriod);
      if (!("error" in result)) {
        setRevenueData(result.chartData);
      }
      setLoading(false);
    }
    loadRevenue();
  }, [revenuePeriod]);

  const s = stats;

  const pieData = s
    ? [
        { name: "Occupied", value: s.occupiedSeats },
        { name: "Available", value: s.availableSeats },
        { name: "Reserved", value: Math.max(0, s.totalSeats - s.occupiedSeats - s.availableSeats) },
      ]
    : [];

  return (
    <>
    <div className="space-y-6">
      {/* Welcome banner */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-700 p-6 text-white"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-black/10 to-transparent" />
        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-indigo-200 text-sm font-medium mb-1">
              {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}
            </p>
            <h2 className="text-2xl font-bold">Welcome back! 👋</h2>
            <p className="text-indigo-100 text-sm mt-1">
              {s?.activeStudents ?? 0} active students today
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="bg-white/10 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold">{s?.attendanceRate ?? 0}%</p>
              <p className="text-xs text-indigo-200">Attendance</p>
            </div>
            <div className="bg-white/10 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold">{s?.occupancyRate ?? 0}%</p>
              <p className="text-xs text-indigo-200">Occupancy</p>
            </div>
          </div>
        </div>
        {/* Decorative circles */}
        <div className="absolute -right-8 -top-8 w-40 h-40 bg-white/5 rounded-full" />
        <div className="absolute -right-4 top-12 w-24 h-24 bg-white/5 rounded-full" />
      </motion.div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Total Students"
          value={s?.totalStudents ?? 0}
          icon={Users}
          color="indigo"
          change={8}
          changeLabel="vs last month"
          index={0}
          onClick={() => router.push("/admin/students")}
        />
        <StatsCard
          title="Occupied Seats"
          value={s?.occupiedSeats ?? 0}
          icon={Grid3X3}
          suffix={s ? `/${s.totalSeats}` : ""}
          color="violet"
          index={1}
          onClick={() => router.push("/admin/seats")}
        />
        <StatsCard
          title="Revenue Today"
          value={s?.revenueToday ?? 0}
          icon={CreditCard}
          color="emerald"
          isCurrency
          index={2}
          onClick={() => router.push("/admin/payments")}
        />
        <StatsCard
          title="Monthly Revenue"
          value={s?.revenueThisMonth ?? 0}
          icon={TrendingUp}
          color="blue"
          isCurrency
          change={12}
          changeLabel="vs last month"
          index={3}
          onClick={() => router.push("/admin/payments")}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Today's Attendance"
          value={s?.todayAttendance ?? 0}
          icon={CalendarCheck}
          color="amber"
          index={4}
          onClick={() => router.push("/admin/attendance")}
        />
        <StatsCard
          title="Pending Fees"
          value={s?.pendingPayments ?? 0}
          icon={AlertCircle}
          color="rose"
          index={5}
          onClick={() => setDueFeesOpen(true)}
        />
        <StatsCard
          title="Active Students"
          value={s?.activeStudents ?? 0}
          icon={CheckCircle2}
          color="emerald"
          index={6}
          onClick={() => router.push("/admin/students?status=ACTIVE")}
        />
        <StatsCard
          title="Overdue Students"
          value={s?.overdueStudents ?? 0}
          icon={Clock}
          color="rose"
          index={7}
          onClick={() => router.push("/admin/students?payment=OVERDUE")}
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Revenue Overview</CardTitle>
                <CardDescription>Daily revenue breakdown</CardDescription>
              </div>
              <Tabs value={revenuePeriod} onValueChange={(v) => setRevenuePeriod(v as "week" | "month" | "year")}>
                <TabsList className="h-8">
                  <TabsTrigger value="week" className="text-xs px-2 h-6">Week</TabsTrigger>
                  <TabsTrigger value="month" className="text-xs px-2 h-6">Month</TabsTrigger>
                  <TabsTrigger value="year" className="text-xs px-2 h-6">Year</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={revenueData}>
                <defs>
                  <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => {
                    const d = new Date(v);
                    return `${d.getDate()}/${d.getMonth() + 1}`;
                  }}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                  formatter={(value: unknown) => [
                    formatCurrency(typeof value === "number" ? value : 0),
                    "Revenue",
                  ]}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#6366f1"
                  strokeWidth={2}
                  fill="url(#revenueGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Seat occupancy pie */}
        <Card>
          <CardHeader>
            <CardTitle>Seat Occupancy</CardTitle>
            <CardDescription>Current seat status breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={75}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={
                        index === 0 ? "#f43f5e" : index === 1 ? "#10b981" : "#f59e0b"
                      }
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2 mt-2">
              {[
                { label: "Occupied", value: s?.occupiedSeats ?? 0, color: "bg-rose-500" },
                { label: "Available", value: s?.availableSeats ?? 0, color: "bg-emerald-500" },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className={`w-2.5 h-2.5 rounded-full ${item.color}`} />
                    <span className="text-muted-foreground">{item.label}</span>
                  </div>
                  <span className="font-medium">{item.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Occupancy progress */}
        <Card>
          <CardHeader>
            <CardTitle>Library Performance Score</CardTitle>
            <CardDescription>Key metrics at a glance</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { label: "Seat Occupancy", value: s?.occupancyRate ?? 0, color: "from-indigo-500 to-violet-600" },
              { label: "Attendance Rate", value: s?.attendanceRate ?? 0, color: "from-emerald-500 to-teal-600" },
              {
                label: "Payment Collection",
                value: s ? Math.round(((s.activeStudents - s.pendingPayments) / Math.max(s.activeStudents, 1)) * 100) : 0,
                color: "from-amber-500 to-orange-600",
              },
            ].map((metric) => (
              <div key={metric.label}>
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="text-muted-foreground">{metric.label}</span>
                  <span className="font-semibold">{metric.value}%</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${metric.value}%` }}
                    transition={{ duration: 1, delay: 0.3 }}
                    className={`h-full rounded-full bg-gradient-to-r ${metric.color}`}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Quick actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Frequently used operations</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3">
            {[
              { label: "Add Student", href: "/admin/students?action=add", icon: Users, color: "bg-indigo-500/10 text-indigo-500 hover:bg-indigo-500/20" },
              { label: "View Seats", href: "/admin/seats", icon: Grid3X3, color: "bg-violet-500/10 text-violet-500 hover:bg-violet-500/20" },
              { label: "Mark Attendance", href: "/admin/attendance", icon: CalendarCheck, color: "bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20" },
              { label: "Record Payment", href: "/admin/payments?action=add", icon: CreditCard, color: "bg-amber-500/10 text-amber-500 hover:bg-amber-500/20" },
              { label: "View Reports", href: "/admin/reports", icon: BarChart3, color: "bg-blue-500/10 text-blue-500 hover:bg-blue-500/20" },
              { label: "Send Notice", href: "/admin/notifications", icon: Activity, color: "bg-rose-500/10 text-rose-500 hover:bg-rose-500/20" },
            ].map((action) => (
              <Link
                key={action.label}
                href={action.href}
                className={`flex items-center gap-3 p-3 rounded-xl transition-colors cursor-pointer ${action.color}`}
              >
                <action.icon className="w-4 h-4 shrink-0" />
                <span className="text-sm font-medium">{action.label}</span>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>

    {/* Due Fees detail dialog */}
    <DueFeesDialog open={dueFeesOpen} onOpenChange={setDueFeesOpen} />
    </>
  );
}
