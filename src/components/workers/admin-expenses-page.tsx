"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  IndianRupee, UploadCloud, CheckCircle2, AlertCircle,
  Calendar, Clock, Receipt, TrendingDown, Eye, Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/shared/page-header";
import { workerExpenseSchema } from "@/schemas";
import type { WorkerExpenseFormData } from "@/schemas";
import { getWorkers, createWorkerExpense, getWorkersExpenseStats } from "@/actions/workers";
import { formatCurrency } from "@/lib/utils";

interface Worker {
  id: string;
  name: string;
}

interface ExpenseEntry {
  id: string;
  workerId: string;
  amount: number;
  description: string;
  imageUrl: string | null;
  date: string;
}

export function AdminExpensesPage() {
  const { data: session } = useSession();
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [recentExpenses, setRecentExpenses] = useState<ExpenseEntry[]>([]);
  const [expensesLoading, setExpensesLoading] = useState(true);

  // Stats
  const [stats, setStats] = useState<{ spentToday: number; spentThisMonth: number } | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<WorkerExpenseFormData>({
    resolver: zodResolver(workerExpenseSchema),
    defaultValues: { workerId: "", amount: 0, description: "", imageUrl: "" },
  });

  const selectedWorkerId = watch("workerId");

  const fetchData = async () => {
    setExpensesLoading(true);
    try {
      const [workersResult, statsResult] = await Promise.all([
        getWorkers(),
        getWorkersExpenseStats(),
      ]);

      if (workersResult.workers) {
        setWorkers(workersResult.workers.map((w: any) => ({ id: w.id, name: w.name })));
      }

      if (statsResult && !("error" in statsResult)) {
        setStats(statsResult.stats || null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setExpensesLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 4 * 1024 * 1024) {
      toast.error("File size must be under 4MB");
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "dja2wlhvd";
    const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "libraryhub";
    formData.append("upload_preset", uploadPreset);

    try {
      const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Failed to upload to Cloudinary");

      const data = await res.json();
      setUploadedUrl(data.secure_url);
      setUploadedFileName(file.name);
      setValue("imageUrl", data.secure_url);
      toast.success("Receipt image uploaded!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to upload receipt image.");
    } finally {
      setUploading(false);
    }
  };

  const onSubmit = async (data: WorkerExpenseFormData) => {
    setLoading(true);
    try {
      const res = await createWorkerExpense({
        ...data,
        imageUrl: uploadedUrl || "",
      });

      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success("Expense logged successfully!");
        setIsSubmitted(true);
        // Refresh stats
        fetchData();
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to submit expense");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    reset();
    setUploadedUrl(null);
    setUploadedFileName(null);
    setIsSubmitted(false);
  };

  const currentTime = new Date();
  const selectedWorkerName = workers.find(w => w.id === selectedWorkerId)?.name;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Log Expense"
        description="Record library maintenance, repairs, or operational expenses."
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Stat Cards */}
        <div className="lg:col-span-1 flex flex-col gap-4">
          {/* Today's Expense */}
          <Card className="border-border/60 bg-gradient-to-br from-rose-500/5 to-orange-500/5 overflow-hidden relative group hover:shadow-md transition-all duration-300">
            <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:scale-110 transition-transform duration-300">
              <TrendingDown className="w-14 h-14 text-rose-500" />
            </div>
            <CardHeader className="pb-2">
              <CardDescription className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Today's Expense
              </CardDescription>
              <CardTitle className="text-3xl font-extrabold tracking-tight text-foreground mt-1">
                {formatCurrency(stats?.spentToday || 0)}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
                Total paid out today
              </span>
            </CardContent>
          </Card>

          {/* Month's Expense */}
          <Card className="border-border/60 bg-gradient-to-br from-amber-500/5 to-orange-500/5 overflow-hidden relative group hover:shadow-md transition-all duration-300">
            <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:scale-110 transition-transform duration-300">
              <Receipt className="w-14 h-14 text-amber-500" />
            </div>
            <CardHeader className="pb-2">
              <CardDescription className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                This Month's Expense
              </CardDescription>
              <CardTitle className="text-3xl font-extrabold tracking-tight text-foreground mt-1">
                {formatCurrency(stats?.spentThisMonth || 0)}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <span className="text-[10px] text-muted-foreground">
                Cumulative for current month
              </span>
            </CardContent>
          </Card>
        </div>

        {/* Right: Expense Form */}
        <Card className="lg:col-span-2 border-border/60 bg-card overflow-hidden">
          <div className="h-1.5 w-full bg-gradient-to-r from-indigo-500 to-violet-600" />

          {!isSubmitted ? (
            <>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-indigo-400" />
                  New Expense Entry
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Fill in the details below to log a new library expense.
                </CardDescription>
              </CardHeader>

              <CardContent>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  {/* Auto Date/Time */}
                  <div className="grid grid-cols-2 gap-3 p-3 bg-muted/20 rounded-lg border border-border/40 text-[10px] text-muted-foreground font-medium">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Date: {currentTime.toLocaleDateString("en-IN")}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Time: {currentTime.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}</span>
                    </div>
                  </div>

                  {/* Worker Selector */}
                  <div className="space-y-1.5">
                    <Label htmlFor="worker" className="text-xs font-semibold text-foreground/90">
                      Staff Member <span className="text-destructive">*</span>
                    </Label>
                    {workers.length === 0 ? (
                      <div className="text-xs text-amber-400 py-1 flex items-center gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5" />
                        No registered staff found. Add team members first.
                      </div>
                    ) : (
                      <Select
                        value={selectedWorkerId}
                        onValueChange={(val) => setValue("workerId", val, { shouldValidate: true })}
                      >
                        <SelectTrigger className="w-full bg-background border-border/60 text-sm h-10">
                          <SelectValue placeholder="Select staff member..." />
                        </SelectTrigger>
                        <SelectContent className="bg-popover border-border">
                          {workers.map((w) => (
                            <SelectItem key={w.id} value={w.id} className="text-sm">
                              {w.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    {errors.workerId && (
                      <p className="text-xs text-destructive mt-1">{errors.workerId.message}</p>
                    )}
                  </div>

                  {/* Amount */}
                  <div className="space-y-1.5">
                    <Label htmlFor="amount" className="text-xs font-semibold text-foreground/90">
                      Amount Paid (₹) <span className="text-destructive">*</span>
                    </Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm pointer-events-none select-none z-10 font-bold">
                        ₹
                      </span>
                      <Input
                        id="amount"
                        type="number"
                        step="any"
                        placeholder="e.g. 500"
                        disabled={loading}
                        className="bg-background border-border/60 pl-7 text-sm h-10"
                        onChange={(e) => setValue("amount", parseFloat(e.target.value) || 0, { shouldValidate: true })}
                      />
                    </div>
                    {errors.amount && (
                      <p className="text-xs text-destructive mt-1">{errors.amount.message}</p>
                    )}
                  </div>

                  {/* Description */}
                  <div className="space-y-1.5">
                    <Label htmlFor="description" className="text-xs font-semibold text-foreground/90">
                      What was the Expense for? <span className="text-destructive">*</span>
                    </Label>
                    <Textarea
                      id="description"
                      placeholder="e.g. Paid ₹350 for water pump repair / Bought new light bulbs"
                      disabled={loading}
                      className="bg-background border-border/60 text-sm min-h-[80px]"
                      {...register("description")}
                    />
                    {errors.description && (
                      <p className="text-xs text-destructive mt-1">{errors.description.message}</p>
                    )}
                  </div>

                  {/* Upload Receipt */}
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-foreground/90">
                      Upload Receipt or Work Photo (Optional)
                    </Label>

                    <div className="flex flex-col items-center justify-center p-4 rounded-lg border border-dashed border-border/60 bg-muted/10 relative">
                      {uploadedUrl ? (
                        <div className="flex items-center gap-3 w-full bg-background border border-border/60 rounded-lg p-2">
                          <div className="w-10 h-10 rounded bg-indigo-500/10 flex items-center justify-center text-indigo-400 shrink-0 overflow-hidden border border-border/40">
                            <img src={uploadedUrl} alt="Uploaded Receipt" className="w-full h-full object-cover" />
                          </div>
                          <div className="flex-1 min-w-0 text-left">
                            <p className="text-xs font-medium text-foreground truncate">
                              {uploadedFileName || "receipt-uploaded.jpg"}
                            </p>
                            <p className="text-[10px] text-emerald-400 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> Upload Complete
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs text-muted-foreground hover:text-destructive h-8 px-2.5"
                            onClick={() => {
                              setUploadedUrl(null);
                              setUploadedFileName(null);
                              setValue("imageUrl", "");
                            }}
                          >
                            Remove
                          </Button>
                        </div>
                      ) : (
                        <label className="flex flex-col items-center gap-2 cursor-pointer w-full py-4">
                          <UploadCloud className="w-8 h-8 text-muted-foreground/60" />
                          <p className="text-xs text-muted-foreground text-center">
                            Select an image of the bill, receipt or repair work.
                          </p>
                          <span className="bg-indigo-600/90 text-white hover:bg-indigo-700 h-9 px-4 text-xs font-semibold rounded-lg shadow-md hover:shadow-indigo-600/10 transition-all flex items-center justify-center gap-2 duration-200 mt-2">
                            {uploading ? (
                              <>
                                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                                Uploading...
                              </>
                            ) : (
                              "Choose Image"
                            )}
                          </span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleFileUpload}
                            disabled={uploading}
                            className="hidden"
                          />
                        </label>
                      )}
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={loading || workers.length === 0}
                    className="w-full bg-indigo-600 text-white hover:bg-indigo-700 font-semibold shadow-lg shadow-indigo-600/25 h-11 text-sm mt-3"
                  >
                    {loading ? "Submitting Expense..." : "Submit Expense"}
                  </Button>
                </form>
              </CardContent>
            </>
          ) : (
            <CardContent className="py-12">
              <div className="text-center">
                <div className="w-16 h-16 bg-emerald-500/10 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-500/20">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <CardTitle className="text-xl font-bold mb-2">Expense Logged!</CardTitle>
                <CardDescription className="text-xs text-muted-foreground max-w-sm mx-auto mb-6">
                  The expense has been successfully recorded and added to library records.
                </CardDescription>
                <Button
                  onClick={handleReset}
                  className="bg-indigo-600 text-white hover:bg-indigo-700 font-semibold h-10 px-6 text-sm"
                >
                  Log Another Expense
                </Button>
              </div>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
}
