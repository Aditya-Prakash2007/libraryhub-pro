"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Building2, Users, CreditCard, TrendingUp,
  CheckCircle2, Clock, AlertTriangle, Shield,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { StatsCard } from "@/components/shared/stats-card";
import { formatCurrency, formatDate, getInitials } from "@/lib/utils";
import { approveLibrary, rejectLibrary, toggleLibraryStatus } from "@/actions/auth";
import { toast } from "sonner";

interface LibraryRow {
  id: string;
  name: string;
  isActive: boolean;
  isSuspended: boolean;
  approvalStatus: string;
  isTrialActive?: boolean;
  trialEndsAt?: Date | null;
  createdAt: Date;
  revenue: number;
  occupiedSeats: number;
  admin: { name: string; email: string; lastLogin?: Date | null };
  subscription?: { plan: string; status: string; endDate?: Date | null } | null;
  _count: { students: number; seats: number };
}

interface SuperAdminDashboardProps {
  stats: {
    totalLibraries: number;
    activeLibraries: number;
    pendingLibraries: number;
    totalStudents: number;
    totalRevenue: number;
  };
  recentLibraries: LibraryRow[];
}

export function SuperAdminDashboard({ stats, recentLibraries }: SuperAdminDashboardProps) {
  const router = useRouter();

  const handleApprove = async (id: string, adminEmail: string) => {
    const r = await approveLibrary(id, adminEmail);
    if ("error" in r) { toast.error(r.error); return; }
    toast.success("Library approved — trial started");
    router.refresh();
  };

  const handleAction = async (id: string, action: "suspend" | "enable" | "disable") => {
    const r = await toggleLibraryStatus(id, action);
    if ("error" in r) { toast.error(r.error); return; }
    toast.success(`Library ${action}d`);
    router.refresh();
  };

  const statusBadge = (lib: LibraryRow) => {
    if (lib.approvalStatus === "PENDING") return <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-500 font-medium">Pending</span>;
    if (lib.isSuspended) return <span className="text-xs px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-500 font-medium">Suspended</span>;
    if (!lib.isActive) return <span className="text-xs px-2 py-0.5 rounded-full bg-slate-500/15 text-slate-400 font-medium">Disabled</span>;
    if (lib.isTrialActive) return <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400 font-medium">Trial</span>;
    return <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-500 font-medium">Active</span>;
  };

  return (
    <div className="space-y-6">
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-700 p-6 text-white"
      >
        <div className="relative">
          <p className="text-indigo-200 text-sm mb-1">Platform Overview</p>
          <h2 className="text-2xl font-bold">Super Admin Dashboard</h2>
          <p className="text-indigo-100 text-sm mt-1">
            {stats.pendingLibraries > 0 && (
              <span className="bg-amber-500/30 px-2 py-0.5 rounded-full text-amber-200 font-medium mr-2">
                ⚠️ {stats.pendingLibraries} pending approval
              </span>
            )}
            {stats.totalLibraries} libraries · {stats.totalStudents} students
          </p>
        </div>
        <div className="absolute -right-8 -top-8 w-40 h-40 bg-white/5 rounded-full" />
        <div className="absolute right-12 bottom-0 w-24 h-24 bg-white/5 rounded-full" />
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard title="Total Libraries" value={stats.totalLibraries} icon={Building2} color="indigo" change={18} changeLabel="vs last month" index={0} />
        <StatsCard title="Active Libraries" value={stats.activeLibraries} icon={CheckCircle2} color="emerald" index={1} />
        <StatsCard title="Total Students" value={stats.totalStudents} icon={Users} color="violet" change={24} changeLabel="vs last month" index={2} />
        <StatsCard title="Platform Revenue" value={stats.totalRevenue} icon={CreditCard} isCurrency color="amber" index={3} />
      </div>

      {/* Pending approvals */}
      {recentLibraries.some((l) => l.approvalStatus === "PENDING") && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2 text-amber-500">
              <AlertTriangle className="w-4 h-4" />
              Pending Approvals
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border/50">
              {recentLibraries
                .filter((l) => l.approvalStatus === "PENDING")
                .map((lib) => (
                  <div key={lib.id} className="flex items-center gap-4 px-5 py-3">
                    <Avatar className="w-9 h-9">
                      <AvatarFallback className="text-xs bg-amber-500/10 text-amber-500">{getInitials(lib.name)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{lib.name}</p>
                      <p className="text-xs text-muted-foreground">{lib.admin.name} · {lib.admin.email}</p>
                      <p className="text-xs text-muted-foreground">Registered: {formatDate(lib.createdAt)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        className="h-7 text-xs bg-emerald-500 hover:bg-emerald-600"
                        onClick={() => handleApprove(lib.id, lib.admin.email)}
                      >
                        <CheckCircle2 className="w-3 h-3 mr-1" />Approve
                      </Button>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Libraries table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base">Recent Libraries</CardTitle>
          <Button variant="outline" size="sm" onClick={() => router.push("/superadmin/libraries")}>
            View All
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 border-b border-border/50">
                  {["Library", "Owner", "Students", "Revenue", "Status", "Last Login", "Actions"].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentLibraries.map((lib, i) => (
                  <motion.tr
                    key={lib.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="border-b border-border/50 hover:bg-muted/30 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Avatar className="w-7 h-7">
                          <AvatarFallback className="text-[10px] bg-indigo-500/10 text-indigo-500">{getInitials(lib.name)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-sm">{lib.name}</p>
                          <p className="text-[10px] text-muted-foreground">{lib.subscription?.plan ?? "FREE"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm">{lib.admin.name}</p>
                      <p className="text-xs text-muted-foreground truncate max-w-[140px]">{lib.admin.email}</p>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="font-semibold">{lib._count.students}</span>
                    </td>
                    <td className="px-4 py-3 font-semibold text-emerald-500 text-sm">
                      {formatCurrency(lib.revenue)}
                    </td>
                    <td className="px-4 py-3">{statusBadge(lib)}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {lib.admin.lastLogin ? formatDate(lib.admin.lastLogin) : "Never"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        {lib.approvalStatus === "PENDING" && (
                          <Button size="sm" className="h-6 text-[10px] px-2 bg-emerald-500 hover:bg-emerald-600" onClick={() => handleApprove(lib.id, lib.admin.email)}>
                            Approve
                          </Button>
                        )}
                        {lib.isActive && !lib.isSuspended && lib.approvalStatus === "APPROVED" && (
                          <Button size="sm" variant="outline" className="h-6 text-[10px] px-2 text-amber-500 border-amber-500/30" onClick={() => handleAction(lib.id, "suspend")}>
                            Suspend
                          </Button>
                        )}
                        {(lib.isSuspended || !lib.isActive) && (
                          <Button size="sm" variant="outline" className="h-6 text-[10px] px-2 text-emerald-500 border-emerald-500/30" onClick={() => handleAction(lib.id, "enable")}>
                            Enable
                          </Button>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
