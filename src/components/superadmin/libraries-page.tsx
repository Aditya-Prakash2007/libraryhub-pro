"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  Building2, Users, Grid3X3, Search, CheckCircle2,
  XCircle, Clock, ShieldOff, Shield, Eye, MoreHorizontal,
  TrendingUp, RefreshCw,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/shared/page-header";
import { approveLibrary, rejectLibrary, toggleLibraryStatus } from "@/actions/auth";
import { formatDate, formatCurrency, getInitials } from "@/lib/utils";
import { useRouter } from "next/navigation";

interface LibraryRow {
  id: string;
  name: string;
  slug: string;
  city?: string | null;
  isActive: boolean;
  isSuspended: boolean;
  approvalStatus: string;
  isTrialActive: boolean;
  trialEndsAt?: Date | null;
  trialExpired: boolean;
  createdAt: Date;
  revenue: number;
  occupiedSeats: number;
  admin: { name: string; email: string; lastLogin?: Date | null };
  subscription?: { plan: string; status: string; endDate?: Date | null; trialEndDate?: Date | null } | null;
  _count: { students: number; seats: number };
}

export function SuperAdminLibrariesPage({ libraries }: { libraries: LibraryRow[] }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectLibraryId, setRejectLibraryId] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const router = useRouter();

  const filtered = libraries.filter((lib) => {
    const matchSearch =
      lib.name.toLowerCase().includes(search.toLowerCase()) ||
      lib.admin.name.toLowerCase().includes(search.toLowerCase()) ||
      lib.admin.email.toLowerCase().includes(search.toLowerCase());

    const matchStatus =
      statusFilter === "all" ||
      (statusFilter === "pending" && lib.approvalStatus === "PENDING") ||
      (statusFilter === "active" && lib.isActive && !lib.isSuspended && lib.approvalStatus === "APPROVED") ||
      (statusFilter === "trial" && lib.isTrialActive) ||
      (statusFilter === "suspended" && lib.isSuspended) ||
      (statusFilter === "rejected" && lib.approvalStatus === "REJECTED");

    return matchSearch && matchStatus;
  });

  const stats = {
    total: libraries.length,
    pending: libraries.filter((l) => l.approvalStatus === "PENDING").length,
    active: libraries.filter((l) => l.isActive && !l.isSuspended && l.approvalStatus === "APPROVED").length,
    trial: libraries.filter((l) => l.isTrialActive).length,
    suspended: libraries.filter((l) => l.isSuspended).length,
  };

  const handleApprove = async (id: string, adminId: string) => {
    setActionLoading(id + "approve");
    const result = await approveLibrary(id, adminId);
    setActionLoading(null);
    if ("error" in result) { toast.error(result.error); return; }
    toast.success("Library approved — 48h trial started");
    router.refresh();
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) { toast.error("Please provide a reason"); return; }
    setActionLoading(rejectLibraryId + "reject");
    const result = await rejectLibrary(rejectLibraryId, rejectReason);
    setActionLoading(null);
    if ("error" in result) { toast.error(result.error); return; }
    toast.success("Library rejected");
    setRejectDialogOpen(false);
    setRejectReason("");
    router.refresh();
  };

  const handleToggle = async (id: string, action: "suspend" | "enable" | "disable") => {
    setActionLoading(id + action);
    const result = await toggleLibraryStatus(id, action);
    setActionLoading(null);
    if ("error" in result) { toast.error(result.error); return; }
    toast.success(`Library ${action}d`);
    router.refresh();
  };

  const approvalBadge = (lib: LibraryRow) => {
    if (lib.approvalStatus === "PENDING") return <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-500 font-medium">Pending</span>;
    if (lib.approvalStatus === "REJECTED") return <span className="text-xs px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-500 font-medium">Rejected</span>;
    if (lib.isSuspended) return <span className="text-xs px-2 py-0.5 rounded-full bg-rose-600/15 text-rose-600 font-medium">Suspended</span>;
    if (!lib.isActive) return <span className="text-xs px-2 py-0.5 rounded-full bg-slate-500/15 text-slate-400 font-medium">Disabled</span>;
    if (lib.isTrialActive) return <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400 font-medium">Trial</span>;
    return <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-500 font-medium">Active</span>;
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Libraries" description={`${libraries.length} libraries on platform`} />

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: "Total", value: stats.total, color: "text-indigo-500", filter: "all" },
          { label: "Pending", value: stats.pending, color: "text-amber-500", filter: "pending" },
          { label: "Active", value: stats.active, color: "text-emerald-500", filter: "active" },
          { label: "Trial", value: stats.trial, color: "text-blue-400", filter: "trial" },
          { label: "Suspended", value: stats.suspended, color: "text-rose-500", filter: "suspended" },
        ].map((s) => (
          <Card
            key={s.label}
            className={`p-4 text-center cursor-pointer transition-all hover:shadow-md ${statusFilter === s.filter ? "ring-2 ring-indigo-500/50" : ""}`}
            onClick={() => setStatusFilter(s.filter)}
          >
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search libraries..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Button variant="outline" size="icon" onClick={() => router.refresh()}>
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 border-b border-border/50">
                  {["Library", "Owner", "Students / Seats", "Revenue", "Subscription", "Status", "Last Login", "Actions"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((lib, i) => (
                  <motion.tr
                    key={lib.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="border-b border-border/50 hover:bg-muted/30 transition-colors"
                  >
                    {/* Library */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Avatar className="w-8 h-8">
                          <AvatarFallback className="text-xs bg-indigo-500/10 text-indigo-500">{getInitials(lib.name)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{lib.name}</p>
                          {lib.city && <p className="text-xs text-muted-foreground">{lib.city}</p>}
                        </div>
                      </div>
                    </td>
                    {/* Owner */}
                    <td className="px-4 py-3">
                      <p className="font-medium">{lib.admin.name}</p>
                      <p className="text-xs text-muted-foreground">{lib.admin.email}</p>
                    </td>
                    {/* Students / Seats */}
                    <td className="px-4 py-3">
                      <div className="flex gap-3">
                        <span className="flex items-center gap-1 text-muted-foreground"><Users className="w-3 h-3" />{lib._count.students}</span>
                        <span className="flex items-center gap-1 text-muted-foreground"><Grid3X3 className="w-3 h-3" />{lib.occupiedSeats}/{lib._count.seats}</span>
                      </div>
                    </td>
                    {/* Revenue */}
                    <td className="px-4 py-3 font-semibold text-emerald-500">{formatCurrency(lib.revenue)}</td>
                    {/* Subscription */}
                    <td className="px-4 py-3">
                      <p className="text-xs font-medium">{lib.subscription?.plan ?? "FREE"}</p>
                      {lib.isTrialActive && lib.trialEndsAt && (
                        <p className="text-[10px] text-blue-400">Trial until {formatDate(lib.trialEndsAt)}</p>
                      )}
                      {lib.subscription?.endDate && !lib.isTrialActive && (
                        <p className="text-[10px] text-muted-foreground">Expires {formatDate(lib.subscription.endDate)}</p>
                      )}
                    </td>
                    {/* Status */}
                    <td className="px-4 py-3">{approvalBadge(lib)}</td>
                    {/* Last Login */}
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {lib.admin.lastLogin ? formatDate(lib.admin.lastLogin) : "Never"}
                    </td>
                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {/* Quick approve for pending */}
                        {lib.approvalStatus === "PENDING" && (
                          <>
                            <Button
                              size="sm"
                              className="h-7 text-xs bg-emerald-500 hover:bg-emerald-600 text-white px-2"
                              loading={actionLoading === lib.id + "approve"}
                              onClick={() => handleApprove(lib.id, lib.admin.email)}
                            >
                              <CheckCircle2 className="w-3 h-3 mr-1" />Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs text-rose-500 border-rose-500/30 px-2"
                              onClick={() => { setRejectLibraryId(lib.id); setRejectDialogOpen(true); }}
                            >
                              <XCircle className="w-3 h-3 mr-1" />Reject
                            </Button>
                          </>
                        )}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="w-7 h-7">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {lib.approvalStatus === "PENDING" && (
                              <>
                                <DropdownMenuItem className="text-emerald-500" onClick={() => handleApprove(lib.id, lib.admin.email)}>
                                  <CheckCircle2 className="w-4 h-4 mr-2" />Approve
                                </DropdownMenuItem>
                                <DropdownMenuItem className="text-rose-500" onClick={() => { setRejectLibraryId(lib.id); setRejectDialogOpen(true); }}>
                                  <XCircle className="w-4 h-4 mr-2" />Reject
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                              </>
                            )}
                            {lib.approvalStatus === "APPROVED" && !lib.isSuspended && lib.isActive && (
                              <>
                                <DropdownMenuItem className="text-amber-500" onClick={() => handleToggle(lib.id, "suspend")}>
                                  <ShieldOff className="w-4 h-4 mr-2" />Suspend
                                </DropdownMenuItem>
                                <DropdownMenuItem className="text-slate-400" onClick={() => handleToggle(lib.id, "disable")}>
                                  <XCircle className="w-4 h-4 mr-2" />Disable
                                </DropdownMenuItem>
                              </>
                            )}
                            {(lib.isSuspended || !lib.isActive) && lib.approvalStatus !== "REJECTED" && (
                              <DropdownMenuItem className="text-emerald-500" onClick={() => handleToggle(lib.id, "enable")}>
                                <Shield className="w-4 h-4 mr-2" />Enable
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div className="py-16 text-center">
                <Building2 className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-40" />
                <p className="text-muted-foreground">No libraries found</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Reject dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Reject Library</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Label>Reason for rejection *</Label>
            <Textarea
              placeholder="e.g. Incomplete information, invalid contact details..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>Cancel</Button>
            <Button
              className="bg-rose-500 hover:bg-rose-600 text-white"
              onClick={handleReject}
              loading={actionLoading?.includes("reject")}
            >
              Confirm Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
