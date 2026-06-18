"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, AreaChart, Area, PieChart, Pie, Cell, Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/shared/page-header";
import { Download, FileText, BarChart3, TrendingUp, Users, Grid3X3 } from "lucide-react";
import { getRevenueAnalytics } from "@/actions/payments";
import { getDashboardStats } from "@/actions/students";
import { formatCurrency } from "@/lib/utils";

const COLORS = ["#6366f1", "#8b5cf6", "#10b981", "#f59e0b", "#f43f5e"];

export function ReportsPage() {
  const [period, setPeriod] = useState<"week" | "month" | "year">("month");
  const [revenueData, setRevenueData] = useState<{ date: string; revenue: number }[]>([]);
  const [stats, setStats] = useState<Record<string, number> | null>(null);

  useEffect(() => {
    getRevenueAnalytics(period).then((r) => {
      if (!("error" in r)) setRevenueData(r.chartData);
    });
    getDashboardStats().then((r) => {
      if (!("error" in r)) setStats(r as unknown as Record<string, number>);
    });
  }, [period]);

  const studentStatusData = stats ? [
    { name: "Active", value: stats.activeStudents },
    { name: "Inactive", value: stats.inactiveStudents },
    { name: "Suspended", value: stats.suspendedStudents },
  ] : [];

  const seatData = stats ? [
    { name: "Occupied", value: stats.occupiedSeats },
    { name: "Available", value: stats.availableSeats },
  ] : [];

  return (
    <div className="space-y-6">
      <PageHeader title="Reports & Analytics" description="Comprehensive library performance insights">
        <Select value={period} onValueChange={(v) => setPeriod(v as typeof period)}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="week">This Week</SelectItem>
            <SelectItem value="month">This Month</SelectItem>
            <SelectItem value="year">This Year</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm">
          <Download className="w-4 h-4" />
          Export PDF
        </Button>
      </PageHeader>

      {/* Key metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total Students", value: stats?.totalStudents || 0, icon: Users, color: "text-indigo-500" },
          { label: "Total Seats", value: stats?.totalSeats || 0, icon: Grid3X3, color: "text-violet-500" },
          { label: "Monthly Revenue", value: formatCurrency(stats?.revenueThisMonth || 0), icon: TrendingUp, color: "text-emerald-500" },
          { label: "Attendance Rate", value: `${stats?.attendanceRate || 0}%`, icon: BarChart3, color: "text-amber-500" },
        ].map((item, i) => (
          <motion.div key={item.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
            <Card className="p-5">
              <div className="flex items-center gap-3">
                <item.icon className={`w-8 h-8 ${item.color}`} />
                <div>
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                  <p className="text-xl font-bold">{item.value}</p>
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Revenue chart */}
      <Card>
        <CardHeader>
          <CardTitle>Revenue Trend</CardTitle>
          <CardDescription>Daily revenue for the selected period</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={revenueData}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
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
                formatter={(v: unknown) => [
                  formatCurrency(typeof v === "number" ? v : 0),
                  "Revenue",
                ]}
              />
              <Area type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={2} fill="url(#revGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Student status pie */}
        <Card>
          <CardHeader>
            <CardTitle>Student Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={studentStatusData} cx="50%" cy="50%" outerRadius={80} paddingAngle={4} dataKey="value" label={({ name, value }) => `${name}: ${value}`} labelLine={false}>
                  {studentStatusData.map((entry, index) => (
                    <Cell key={index} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Seat status */}
        <Card>
          <CardHeader>
            <CardTitle>Seat Utilization</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={seatData} barSize={60}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {seatData.map((entry, index) => (
                    <Cell key={index} fill={index === 0 ? "#f43f5e" : "#10b981"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
