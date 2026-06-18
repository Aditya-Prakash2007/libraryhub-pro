"use client";

import { motion } from "framer-motion";
import {
  Building2, Users, Grid3X3, TrendingUp,
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";
import { StatsCard } from "@/components/shared/stats-card";
import { formatCurrency } from "@/lib/utils";
import { SUBSCRIPTION_PLANS } from "@/constants";

interface SuperAdminAnalyticsPageProps {
  stats: {
    totalLibraries: number;
    totalStudents: number;
    totalSeats: number;
    totalRevenue: number;
  };
}

const MOCK_GROWTH = [
  { month: "Jan", libraries: 12, students: 480 },
  { month: "Feb", libraries: 18, students: 720 },
  { month: "Mar", libraries: 26, students: 1040 },
  { month: "Apr", libraries: 35, students: 1400 },
  { month: "May", libraries: 48, students: 1920 },
  { month: "Jun", libraries: 62, students: 2480 },
  { month: "Jul", libraries: 80, students: 3200 },
  { month: "Aug", libraries: 104, students: 4160 },
  { month: "Sep", libraries: 130, students: 5200 },
  { month: "Oct", libraries: 168, students: 6720 },
  { month: "Nov", libraries: 210, students: 8400 },
  { month: "Dec", libraries: 254, students: 10160 },
];

const PLAN_COLORS: Record<string, string> = {
  FREE: "#64748b",
  STARTER: "#3b82f6",
  PROFESSIONAL: "#6366f1",
  ENTERPRISE: "#f59e0b",
};

export function SuperAdminAnalyticsPage({ stats }: SuperAdminAnalyticsPageProps) {
  const planData = SUBSCRIPTION_PLANS.map((p) => ({
    name: p.name,
    value: Math.floor(Math.random() * 50) + 5,
    color: PLAN_COLORS[p.id],
  }));

  return (
    <div className="space-y-6">
      <PageHeader title="Platform Analytics" description="Overview of the entire LibraryHub Pro platform" />

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard title="Total Libraries" value={stats.totalLibraries} icon={Building2} color="indigo" change={18} changeLabel="vs last month" index={0} />
        <StatsCard title="Total Students" value={stats.totalStudents} icon={Users} color="violet" change={24} changeLabel="vs last month" index={1} />
        <StatsCard title="Total Seats" value={stats.totalSeats} icon={Grid3X3} color="blue" index={2} />
        <StatsCard title="Platform Revenue" value={stats.totalRevenue} icon={TrendingUp} isCurrency color="emerald" change={12} changeLabel="vs last month" index={3} />
      </div>

      {/* Growth charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Library Growth</CardTitle>
            <CardDescription>Monthly new library registrations</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={MOCK_GROWTH}>
                <defs>
                  <linearGradient id="libGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }} />
                <Area type="monotone" dataKey="libraries" stroke="#6366f1" strokeWidth={2} fill="url(#libGrad)" name="Libraries" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Student Growth</CardTitle>
            <CardDescription>Monthly student registrations across all libraries</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={MOCK_GROWTH}>
                <defs>
                  <linearGradient id="stuGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }} />
                <Area type="monotone" dataKey="students" stroke="#8b5cf6" strokeWidth={2} fill="url(#stuGrad)" name="Students" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Plan distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Subscription Plan Distribution</CardTitle>
          <CardDescription>Libraries across different subscription tiers</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={planData} barSize={64}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }} />
              <Bar dataKey="value" radius={[8, 8, 0, 0]} name="Libraries">
                {planData.map((entry, index) => (
                  <Cell key={index} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
