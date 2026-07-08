"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  IndianRupee, UploadCloud, FileText, CheckCircle2, AlertCircle, Calendar, Clock, BookOpen, ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { workerExpenseSchema } from "@/schemas";
import type { WorkerExpenseFormData } from "@/schemas";
import { createWorkerExpense } from "@/actions/workers";

interface LibraryInfo {
  id: string;
  name: string;
  logo: string | null;
  primaryColor: string;
}

interface WorkerInfo {
  id: string;
  name: string;
}

interface PublicExpenseTrackerProps {
  library: LibraryInfo;
  workers: WorkerInfo[];
}

export function PublicExpenseTracker({ library, workers }: PublicExpenseTrackerProps) {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);

  const [uploading, setUploading] = useState(false);

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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (4MB limit)
    if (file.size > 4 * 1024 * 1024) {
      toast.error("File size must be under 4MB");
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    
    // Cloudinary credentials (dynamically read from env or fallback to general libraryhub preset)
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "dja2wlhvd";
    const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "libraryhub";
    formData.append("upload_preset", uploadPreset);

    try {
      const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        throw new Error("Failed to upload to Cloudinary");
      }

      const data = await res.json();
      setUploadedUrl(data.secure_url);
      setUploadedFileName(file.name);
      setValue("imageUrl", data.secure_url);
      toast.success("Receipt image uploaded successfully!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to upload receipt image. Please try again.");
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

  return (
    <div className="min-h-screen w-full bg-slate-950 flex flex-col items-center justify-center p-4 md:p-6 lg:p-8 select-none relative overflow-hidden">
      {/* Dynamic Background Gradients */}
      <div
        className="absolute -top-[30%] -left-[20%] w-[80%] h-[80%] rounded-full opacity-20 blur-[120px] pointer-events-none"
        style={{
          background: `radial-gradient(circle, ${library.primaryColor || "#6366f1"} 0%, transparent 70%)`,
        }}
      />
      <div className="absolute -bottom-[30%] -right-[20%] w-[80%] h-[80%] rounded-full opacity-20 blur-[120px] pointer-events-none bg-radial from-violet-600 to-transparent" />

      {/* Main Container */}
      <div className="w-full max-w-lg z-10">
        <AnimatePresence mode="wait">
          {!isSubmitted ? (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="border-border/40 bg-slate-900/60 backdrop-blur-xl shadow-2xl overflow-hidden">
                {/* Visual Header */}
                <div
                  className="h-2 w-full"
                  style={{
                    background: `linear-gradient(90deg, ${library.primaryColor || "#6366f1"}, #8b5cf6)`,
                  }}
                />

                <CardHeader className="text-center space-y-3 pb-4">
                  {library.logo ? (
                    <img
                      src={library.logo}
                      alt={library.name}
                      className="w-14 h-14 mx-auto rounded-xl object-cover border border-border/40 shadow-md"
                    />
                  ) : (
                    <div className="w-12 h-12 mx-auto rounded-xl bg-indigo-500/15 flex items-center justify-center text-indigo-400 border border-indigo-500/20 shadow-inner">
                      <BookOpen className="w-6 h-6" />
                    </div>
                  )}
                  <div>
                    <CardTitle className="text-lg md:text-xl font-bold text-foreground">
                      Staff Expense Tracker
                    </CardTitle>
                    <CardDescription className="text-xs text-muted-foreground">
                      Log your library maintenance, repairs, or bill payments for{" "}
                      <strong className="text-foreground">{library.name}</strong>.
                    </CardDescription>
                  </div>
                </CardHeader>

                <CardContent>
                  <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    {/* Auto Date/Time Label */}
                    <div className="grid grid-cols-2 gap-3 p-3 bg-slate-950/40 rounded-lg border border-border/40 text-[10px] text-muted-foreground font-medium mb-1">
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
                        Choose Your Name <span className="text-destructive">*</span>
                      </Label>
                      {workers.length === 0 ? (
                        <div className="text-xs text-amber-400 py-1 flex items-center gap-1.5">
                          <AlertCircle className="w-3.5 h-3.5" />
                          No registered staff found. Contact library owner to register.
                        </div>
                      ) : (
                        <Select
                          value={selectedWorkerId}
                          onValueChange={(val) => setValue("workerId", val, { shouldValidate: true })}
                        >
                          <SelectTrigger className="w-full bg-slate-950 border-border/60 text-sm h-10">
                            <SelectValue placeholder="Select staff member..." />
                          </SelectTrigger>
                          <SelectContent className="bg-slate-900 border-border">
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

                    {/* Paid Amount */}
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
                          className="bg-slate-950 border-border/60 pl-7 text-sm h-10"
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
                        className="bg-slate-950 border-border/60 text-sm min-h-[80px]"
                        {...register("description")}
                      />
                      {errors.description && (
                        <p className="text-xs text-destructive mt-1">{errors.description.message}</p>
                      )}
                    </div>

                    {/* Upload Receipt/Image */}
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold text-foreground/90">
                        Upload Receipt or Work Photo (Optional)
                      </Label>

                      <div className="flex flex-col items-center justify-center p-4 rounded-lg border border-dashed border-border/60 bg-slate-950/40 relative">
                        {uploadedUrl ? (
                          <div className="flex items-center gap-3 w-full bg-slate-900 border border-border/60 rounded-lg p-2">
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
              </Card>

              {/* Security Badge */}
              <div className="flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground/80 mt-4">
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-500/60" />
                <span>Secure Library Hub Payment System</span>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="border-border/40 bg-slate-900/60 backdrop-blur-xl shadow-2xl text-center py-8 px-6">
                <div className="w-16 h-16 bg-emerald-500/10 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-500/20">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <CardTitle className="text-xl font-bold mb-2">Expense Logged Successfully!</CardTitle>
                <CardDescription className="text-xs text-muted-foreground max-w-sm mx-auto mb-6">
                  Thank you! Your expense report has been logged and sent to the library owner. You can close this page or log another item below.
                </CardDescription>
                <Button
                  onClick={handleReset}
                  className="bg-indigo-600 text-white hover:bg-indigo-700 font-semibold h-10 px-6 text-sm"
                >
                  Log Another Expense
                </Button>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
