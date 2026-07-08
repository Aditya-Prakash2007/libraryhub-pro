"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Plus, Search, Edit2, Trash2, Link2, Copy, Check, Info, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/shared/page-header";
import { getWorkers, deleteWorker, getWorkersExpenseStats } from "@/actions/workers";
import { WorkerDialog } from "./worker-dialog";
import { useRouter } from "next/navigation";
import { formatCurrency } from "@/lib/utils";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Worker {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  shiftIds: string[];
  status: string;
  shifts: {
    id: string;
    name: string;
    startTime: string;
    endTime: string;
    color: string;
  }[];
}

export function WorkersPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedWorker, setSelectedWorker] = useState<{
    id?: string; name?: string; phone?: string; email?: string; shiftIds?: string[];
  } | null>(null);
  
  // Copy state
  const [copied, setCopied] = useState(false);
  const [origin, setOrigin] = useState("https://libraryhub-pro.vercel.app");

  // Expense stats state
  const [stats, setStats] = useState<{ spentToday: number; spentThisMonth: number } | null>(null);
  const [chartData, setChartData] = useState<{ date: string; amount: number }[]>([]);
  const [statsLoading, setStatsLoading] = useState(true);

  const libraryId = session?.user?.libraryId;

  useEffect(() => {
    if (typeof window !== "undefined") {
      setOrigin(window.location.origin);
    }
  }, []);

  const fetchWorkersList = async () => {
    setLoading(true);
    try {
      const result = await getWorkers();
      if (result.workers) {
        setWorkers(result.workers as Worker[]);
      } else if (result.error) {
        toast.error(result.error);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to load team members list");
    } finally {
      setLoading(false);
    }
  };

  const fetchExpenseStats = async () => {
    setStatsLoading(true);
    try {
      const result = await getWorkersExpenseStats();
      if (result && "error" in result) {
        toast.error(result.error);
      } else if (result) {
        setStats(result.stats || null);
        setChartData(result.chartData || []);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to load expense statistics");
    } finally {
      setStatsLoading(false);
    }
  };

  const handleDataRefresh = () => {
    fetchWorkersList();
    fetchExpenseStats();
  };

  useEffect(() => {
    fetchWorkersList();
    fetchExpenseStats();
  }, []);

  const handleCopyLink = () => {
    if (!libraryId) return;
    const url = `${origin}/expense-tracker/${libraryId}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success("Expense Tracker link copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await deleteWorker(id);
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success("Team member deleted successfully");
        handleDataRefresh();
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete team member");
    }
  };


  const filteredWorkers = workers.filter((worker) =>
    worker.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    worker.phone.includes(searchQuery) ||
    (worker.email && worker.email.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <PageHeader
          title="Team Member Management"
          description="Manage library staff, shifts, and track custom team member expenses."
        />
        <Button
          onClick={() => {
            setSelectedWorker(null);
            setDialogOpen(true);
          }}
          className="bg-indigo-600 text-white hover:bg-indigo-700 font-semibold shadow-lg shadow-indigo-600/20 w-fit self-start md:self-auto"
        >
          <Plus className="w-4 h-4 mr-2" /> Add Staff Member
        </Button>
      </div>

      {/* Copy Link Widget */}
      {libraryId && (
        <Card className="border-border/60 bg-gradient-to-r from-indigo-500/5 to-violet-500/5 overflow-hidden relative">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Link2 className="w-4 h-4 text-indigo-400" />
              Public Expense Tracker Link for Team Members
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Share this unique link with your team members. They can visit this page on their phone or computer to log receipts, repair costs, and daily expenses.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 bg-background border border-border/80 rounded-lg px-3 py-2 text-xs flex items-center font-mono text-muted-foreground select-all overflow-x-auto truncate">
              {`${origin}/expense-tracker/${libraryId}`}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyLink}
              className="border-indigo-500/20 text-indigo-400 hover:bg-indigo-500/10 h-10 px-4 flex items-center justify-center shrink-0"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 mr-2" /> Copied
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 mr-2" /> Copy Link
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Worker Expenses Dashboard */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Stats Cards */}
        <div className="lg:col-span-1 flex flex-col gap-4">
          {statsLoading ? (
            <>
              <Card className="p-6 border-border/60 bg-card flex flex-col justify-between h-[120px] animate-pulse">
                <div className="space-y-2">
                  <div className="h-3 w-24 bg-muted rounded" />
                  <div className="h-6 w-32 bg-muted rounded" />
                </div>
                <div className="h-2.5 w-40 bg-muted rounded" />
              </Card>
              <Card className="p-6 border-border/60 bg-card flex flex-col justify-between h-[120px] animate-pulse">
                <div className="space-y-2">
                  <div className="h-3 w-24 bg-muted rounded" />
                  <div className="h-6 w-32 bg-muted rounded" />
                </div>
                <div className="h-2.5 w-40 bg-muted rounded" />
              </Card>
            </>
          ) : (
            <>
              {/* Today's Expense Card */}
              <Card className="border-border/60 bg-gradient-to-br from-indigo-500/5 to-violet-500/5 overflow-hidden relative group hover:shadow-md transition-all duration-300">
                <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:scale-110 transition-transform duration-300">
                  <TrendingUp className="w-16 h-16 text-indigo-500" />
                </div>
                <CardHeader className="pb-2">
                  <CardDescription className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Today's Team Member Expense
                  </CardDescription>
                  <CardTitle className="text-3xl font-extrabold tracking-tight text-foreground mt-1">
                    {formatCurrency(stats?.spentToday || 0)}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                    Consolidated today's payouts
                  </span>
                </CardContent>
              </Card>

              {/* Month's Expense Card */}
              <Card className="border-border/60 bg-gradient-to-br from-indigo-500/5 to-violet-500/5 overflow-hidden relative group hover:shadow-md transition-all duration-300">
                <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:scale-110 transition-transform duration-300">
                  <Plus className="w-16 h-16 text-violet-500" />
                </div>
                <CardHeader className="pb-2">
                  <CardDescription className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Monthly Team Member Expense
                  </CardDescription>
                  <CardTitle className="text-3xl font-extrabold tracking-tight text-foreground mt-1">
                    {formatCurrency(stats?.spentThisMonth || 0)}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <span className="text-[10px] text-muted-foreground">
                    Total logged in the current calendar month
                  </span>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* Right: Chart */}
        <Card className="lg:col-span-2 border-border/60 bg-card overflow-hidden flex flex-col">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-indigo-400" />
              Team Member Expense Trend (Last 15 Days)
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Daily consolidated expenses across all library staff
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 min-h-[200px] flex items-center justify-center p-4">
            {statsLoading ? (
              <div className="w-full h-full bg-muted/20 animate-pulse rounded" />
            ) : chartData.length === 0 || chartData.every(d => d.amount === 0) ? (
              <div className="text-center py-6 text-xs text-muted-foreground">
                No team member expenses logged in the last 15 days.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `₹${v}`}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "11px",
                    }}
                    formatter={(v: any) => [formatCurrency(Number(v)), "Spent"]}
                  />
                  <Area
                    type="monotone"
                    dataKey="amount"
                    stroke="#6366f1"
                    strokeWidth={2}
                    fill="url(#expenseGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Workers list / table */}
      <Card className="border-border/60 bg-card">
        <CardHeader className="pb-3 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-base font-semibold">Active Team Members</CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              A list of team members registered under your library.
            </CardDescription>
          </div>
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4 pointer-events-none" />
            <Input
              placeholder="Search by name, phone or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-background border-border/60 text-sm h-9"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-20 text-center text-sm text-muted-foreground animate-pulse">
              Loading team member database...
            </div>
          ) : filteredWorkers.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground space-y-2">
              <Info className="w-8 h-8 mx-auto opacity-40 text-indigo-400" />
              <p className="text-sm font-medium">No team members found</p>
              <p className="text-xs text-muted-foreground">
                {searchQuery ? "Try refining your search query." : "Register a team member using the button above."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow className="border-border/40 hover:bg-transparent">
                    <TableHead className="font-semibold text-xs py-3">Name</TableHead>
                    <TableHead className="font-semibold text-xs py-3">Phone</TableHead>
                    <TableHead className="font-semibold text-xs py-3">Email</TableHead>
                    <TableHead className="font-semibold text-xs py-3">Assigned Shifts</TableHead>
                    <TableHead className="font-semibold text-xs py-3">Status</TableHead>
                    <TableHead className="font-semibold text-xs py-3 text-right pr-6">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredWorkers.map((worker) => (
                    <TableRow
                      key={worker.id}
                      className="border-border/40 hover:bg-muted/10 transition-colors duration-150 group cursor-pointer"
                      onClick={() => router.push(`/admin/workers/${worker.id}`)}
                    >
                      <TableCell className="font-medium text-sm py-4">
                        <span className="group-hover:text-indigo-400 transition-colors">
                          {worker.name}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground py-4" onClick={(e) => e.stopPropagation()}>
                        {worker.phone}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground py-4" onClick={(e) => e.stopPropagation()}>
                        {worker.email || "-"}
                      </TableCell>
                      <TableCell className="py-4" onClick={(e) => e.stopPropagation()}>
                        <div className="flex flex-wrap gap-1.5">
                          {worker.shifts.length === 0 ? (
                            <span className="text-[10px] text-muted-foreground">No shifts</span>
                          ) : (
                            worker.shifts.map((shift) => (
                              <Badge
                                key={shift.id}
                                className="text-[10px] px-2 py-0.5 border font-semibold shadow-sm"
                                style={{
                                  backgroundColor: `${shift.color}15`,
                                  borderColor: shift.color,
                                  color: shift.color,
                                }}
                              >
                                {shift.name}
                              </Badge>
                            ))
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="py-4" onClick={(e) => e.stopPropagation()}>
                        <Badge
                          className={`text-[10px] font-semibold ${
                            worker.status === "ACTIVE"
                              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                              : "bg-amber-500/10 border-amber-500/30 text-amber-400"
                          } border`}
                        >
                          {worker.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right py-4 pr-6" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="w-8 h-8 text-muted-foreground hover:text-indigo-400"
                            onClick={() => {
                              setSelectedWorker({
                                id: worker.id,
                                name: worker.name,
                                phone: worker.phone,
                                email: worker.email ?? undefined,
                                shiftIds: worker.shiftIds,
                              });
                              setDialogOpen(true);
                            }}
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="w-8 h-8 text-muted-foreground hover:text-destructive"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="bg-card border-border">
                              <AlertDialogHeader>
                                <AlertDialogTitle className="text-lg font-semibold text-destructive">
                                  Delete Team Member?
                                </AlertDialogTitle>
                                <AlertDialogDescription className="text-sm text-muted-foreground">
                                  Are you sure you want to delete team member <strong className="text-foreground">{worker.name}</strong>? This action will permanently remove their profile and all their recorded expenses. This cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel className="bg-accent hover:bg-accent/80 text-foreground">
                                  Cancel
                                </AlertDialogCancel>
                                <AlertDialogAction
                                  className="bg-destructive hover:bg-destructive/80 text-white font-semibold"
                                  onClick={() => handleDelete(worker.id)}
                                >
                                  Delete Permanently
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog for Add/Edit worker */}
      <WorkerDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        worker={selectedWorker}
        onSuccess={handleDataRefresh}
      />
    </div>
  );
}

