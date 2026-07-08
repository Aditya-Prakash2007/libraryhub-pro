"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Phone, Mail, Clock, IndianRupee, Image as ImageIcon, Archive, Receipt, Sparkles, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatsCard } from "@/components/shared/stats-card";
import { getWorkerDetails } from "@/actions/workers";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";

interface WorkerDetails {
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

interface Expense {
  id: string;
  amount: number;
  description: string;
  imageUrl: string | null;
  date: Date;
  isArchived: boolean;
  archivedAt: Date | null;
}

interface WorkerDetailPageProps {
  workerId: string;
}

export function WorkerDetailPage({ workerId }: WorkerDetailPageProps) {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [worker, setWorker] = useState<WorkerDetails | null>(null);
  const [activeExpenses, setActiveExpenses] = useState<Expense[]>([]);
  const [archivedExpenses, setArchivedExpenses] = useState<Expense[]>([]);
  const [stats, setStats] = useState({ spentToday: 0, spentThisMonth: 0 });

  const fetchDetails = async () => {
    setLoading(true);
    try {
      const res = await getWorkerDetails(workerId);
      if (res.error) {
        toast.error(res.error);
        router.push("/admin/workers");
      } else if (res.worker) {
        setWorker(res.worker as WorkerDetails);
        setActiveExpenses((res.activeExpenses ?? []) as Expense[]);
        setArchivedExpenses((res.archivedExpenses ?? []) as Expense[]);
        setStats(res.stats ?? { spentToday: 0, spentThisMonth: 0 });
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to load worker details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (workerId) {
      fetchDetails();
    }
  }, [workerId]);

  if (loading) {
    return (
      <div className="py-24 text-center text-sm text-muted-foreground animate-pulse space-y-4">
        <Sparkles className="w-8 h-8 mx-auto text-indigo-400 animate-spin" />
        <p>Loading worker record & expenses...</p>
      </div>
    );
  }

  if (!worker) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        <p className="text-sm font-semibold">Worker not found</p>
        <Button variant="ghost" className="mt-4" onClick={() => router.push("/admin/workers")}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to list
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header and Back Button */}
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="icon"
          onClick={() => router.push("/admin/workers")}
          className="border-border/60 hover:bg-accent/40"
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
            {worker.name}
          </h1>
          <p className="text-xs text-muted-foreground">
            Staff Profile & Expense Tracking
          </p>
        </div>
      </div>

      {/* Info Card & Stats Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Worker Info Card */}
        <Card className="border-border/60 bg-card lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Contact Info</CardTitle>
            <CardDescription className="text-[10px]">Basic details of the staff member.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="flex items-center gap-3 text-muted-foreground">
              <Phone className="w-4 h-4 text-indigo-400 shrink-0" />
              <span className="truncate">{worker.phone}</span>
            </div>
            <div className="flex items-center gap-3 text-muted-foreground">
              <Mail className="w-4 h-4 text-indigo-400 shrink-0" />
              <span className="truncate">{worker.email || "No email added"}</span>
            </div>
            <div className="flex items-start gap-3 text-muted-foreground">
              <Clock className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="text-xs font-semibold text-foreground">Assigned Shifts:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {worker.shifts.length === 0 ? (
                    <span className="text-xs text-muted-foreground">No shifts assigned</span>
                  ) : (
                    worker.shifts.map((s) => (
                      <Badge
                        key={s.id}
                        className="text-[10px] px-2 py-0.5 border"
                        style={{
                          backgroundColor: `${s.color}15`,
                          borderColor: s.color,
                          color: s.color,
                        }}
                      >
                        {s.name}
                      </Badge>
                    ))
                  )}
                </div>
              </div>
            </div>
            <div className="pt-2 border-t border-border/40 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Registration Status</span>
              <Badge
                className={`text-[10px] font-semibold ${
                  worker.status === "ACTIVE"
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                    : "bg-amber-500/10 border-amber-500/30 text-amber-400"
                } border`}
              >
                {worker.status}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Stats Cards */}
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <StatsCard
            title="Spent Today"
            value={`₹${stats.spentToday.toLocaleString("en-IN")}`}
            icon={IndianRupee}
            color="indigo"
            index={0}
          />
          <StatsCard
            title="Spent This Month"
            value={`₹${stats.spentThisMonth.toLocaleString("en-IN")}`}
            icon={IndianRupee}
            color="violet"
            index={1}
          />
        </div>
      </div>

      {/* Expense Tables */}
      <Tabs defaultValue="active" className="space-y-4">
        <div className="flex items-center justify-between border-b border-border/40 pb-1">
          <TabsList className="bg-muted/30 border border-border/50 h-9 p-0.5">
            <TabsTrigger value="active" className="text-xs h-8 data-[state=active]:bg-background">
              Active Expenses ({activeExpenses.length})
            </TabsTrigger>
            <TabsTrigger value="archived" className="text-xs h-8 data-[state=active]:bg-background">
              <Archive className="w-3.5 h-3.5 mr-1.5" /> Archived Expenses ({archivedExpenses.length})
            </TabsTrigger>
          </TabsList>
          <span className="text-[10px] text-muted-foreground hidden sm:inline-block">
            *Expenses are archived after 1 month and auto-deleted after 3 months.
          </span>
        </div>

        <TabsContent value="active" className="m-0">
          <Card className="border-border/60 bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Current Month / Unarchived Expenses</CardTitle>
              <CardDescription className="text-[10px]">Expenses logged in the last 30 days.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <ExpenseTable expenses={activeExpenses} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="archived" className="m-0">
          <Card className="border-border/60 bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Archived Expense History</CardTitle>
              <CardDescription className="text-[10px]">Expenses older than 30 days. These will be purged from the database 3 months after archival.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <ExpenseTable expenses={archivedExpenses} isArchiveTable={true} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ----------------- LOCAL HELPER COMPONENT: EXPENSE TABLE -----------------

interface ExpenseTableProps {
  expenses: Expense[];
  isArchiveTable?: boolean;
}

function ExpenseTable({ expenses, isArchiveTable = false }: ExpenseTableProps) {
  if (expenses.length === 0) {
    return (
      <div className="py-12 text-center text-xs text-muted-foreground space-y-1">
        <Receipt className="w-6 h-6 mx-auto opacity-45 text-indigo-400" />
        <p>No expenses logged.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader className="bg-muted/20">
          <TableRow className="border-border/40 hover:bg-transparent">
            <TableHead className="font-semibold text-xs py-3 w-40">Date & Time</TableHead>
            <TableHead className="font-semibold text-xs py-3">Description</TableHead>
            <TableHead className="font-semibold text-xs py-3 w-28">Amount</TableHead>
            <TableHead className="font-semibold text-xs py-3 w-24 text-center">Receipt</TableHead>
            {isArchiveTable && (
              <TableHead className="font-semibold text-xs py-3 w-40">Archived Date</TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {expenses.map((exp) => (
            <TableRow key={exp.id} className="border-border/40 hover:bg-muted/5">
              <TableCell className="text-xs text-muted-foreground py-3.5">
                {format(new Date(exp.date), "dd MMM yyyy, hh:mm a")}
              </TableCell>
              <TableCell className="text-sm font-medium py-3.5">
                {exp.description}
              </TableCell>
              <TableCell className="text-sm font-semibold text-indigo-400 py-3.5">
                ₹{exp.amount.toLocaleString("en-IN")}
              </TableCell>
              <TableCell className="text-center py-3.5">
                {exp.imageUrl ? (
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="w-8 h-8 rounded-lg hover:bg-indigo-500/10 text-indigo-400"
                      >
                        <ImageIcon className="w-4 h-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-[90vw] md:max-w-2xl border-border bg-card p-2 flex flex-col justify-center items-center">
                      <div className="relative w-full max-h-[80vh] overflow-y-auto p-4 flex justify-center items-center">
                        <img
                          src={exp.imageUrl}
                          alt="Receipt or Problem Proof"
                          className="max-w-full max-h-[70vh] rounded-lg object-contain shadow-lg border border-border/40"
                        />
                      </div>
                      <div className="p-3 w-full text-center text-xs text-muted-foreground bg-muted/20 border-t border-border/40 flex justify-between items-center px-6">
                        <span>{exp.description}</span>
                        <a
                          href={exp.imageUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-indigo-400 font-semibold hover:underline flex items-center gap-1 shrink-0"
                        >
                          Open in Tab <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </DialogContent>
                  </Dialog>
                ) : (
                  <span className="text-[10px] text-muted-foreground">-</span>
                )}
              </TableCell>
              {isArchiveTable && (
                <TableCell className="text-xs text-muted-foreground py-3.5">
                  {exp.archivedAt ? format(new Date(exp.archivedAt), "dd MMM yyyy") : "-"}
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
