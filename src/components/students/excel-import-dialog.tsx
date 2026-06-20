"use client";

import { useState, useRef } from "react";
import { toast } from "sonner";
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2, X, Loader2 } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { bulkImportStudents } from "@/actions/bulk-import";
import { parseBulkImportFile } from "@/utils/export";
import type { StudentFormData } from "@/schemas";

interface ImportRow {
  raw: Record<string, unknown>;
  parsed?: Partial<StudentFormData>;
  errors: string[];
  isValid: boolean;
  isDuplicate: boolean;
}

interface ImportResult {
  imported: number;
  failed: number;
  duplicates: number;
}

interface ExcelImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

// Map Excel column headers to field names (case-insensitive)
function mapRow(raw: Record<string, unknown>): { parsed: Partial<StudentFormData>; errors: string[] } {
  const get = (...keys: string[]): string => {
    for (const key of keys) {
      const found = Object.entries(raw).find(([k]) => k.toLowerCase().trim() === key.toLowerCase());
      if (found && found[1] != null && String(found[1]).trim() !== "") {
        return String(found[1]).trim();
      }
    }
    return "";
  };

  const errors: string[] = [];
  const fullName = get("full name", "fullname", "name", "student name");
  const email = get("email", "email address");
  const phone = get("phone", "mobile", "mobile number", "phone number", "contact");
  const monthlyFeeRaw = get("monthly fee", "monthlyfee", "fee", "fees");
  const monthlyFee = parseFloat(monthlyFeeRaw) || 0;

  if (!fullName) errors.push("Full Name is required");
  if (!email) errors.push("Email is required");
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push("Invalid email format");
  if (!phone) errors.push("Phone is required");
  if (monthlyFee <= 0) errors.push("Monthly Fee must be > 0");

  const parsed: Partial<StudentFormData> = {
    fullName,
    email,
    phone,
    fatherName: get("father name", "father", "fathers name") || undefined,
    motherName: get("mother name", "mother", "mothers name") || undefined,
    whatsappNumber: get("whatsapp", "whatsapp number") || undefined,
    address: get("address") || undefined,
    city: get("city") || undefined,
    state: get("state") || undefined,
    pincode: get("pincode", "pin code", "zip") || undefined,
    gender: get("gender") || undefined,
    occupation: get("occupation") || undefined,
    institution: get("institution", "college", "school") || undefined,
    monthlyFee,
    depositAmount: parseFloat(get("deposit", "security deposit")) || 0,
    discountAmount: parseFloat(get("discount")) || 0,
    notes: get("notes", "remarks") || undefined,
  };

  const joiningDate = get("joining date", "joiningdate", "start date");
  if (joiningDate) {
    try {
      parsed.joiningDate = new Date(joiningDate).toISOString().split("T")[0];
    } catch { /* ignore */ }
  }

  return { parsed, errors };
}

export function ExcelImportDialog({ open, onOpenChange, onSuccess }: ExcelImportDialogProps) {
  const [step, setStep] = useState<"upload" | "preview" | "importing" | "done">("upload");
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    const validTypes = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
      "text/csv",
    ];
    if (!validTypes.includes(file.type) && !file.name.match(/\.(xlsx|xls|csv)$/i)) {
      toast.error("Please upload an .xlsx, .xls or .csv file");
      return;
    }

    try {
      const rawData = await parseBulkImportFile(file);
      if (rawData.length === 0) {
        toast.error("File is empty or has no data rows");
        return;
      }

      const emails = new Set<string>();
      const phones = new Set<string>();

      const parsedRows: ImportRow[] = rawData.map((raw) => {
        const { parsed, errors } = mapRow(raw);
        const isDuplicate =
          (!!parsed.email && emails.has(parsed.email.toLowerCase())) ||
          (!!parsed.phone && phones.has(parsed.phone));

        if (parsed.email) emails.add(parsed.email.toLowerCase());
        if (parsed.phone) phones.add(parsed.phone);

        return {
          raw,
          parsed,
          errors,
          isValid: errors.length === 0 && !isDuplicate,
          isDuplicate,
        };
      });

      setRows(parsedRows);
      setStep("preview");
    } catch (err) {
      toast.error("Failed to parse file. Make sure it's a valid Excel/CSV file.");
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleImport = async () => {
    const validRows = rows.filter((r) => r.isValid && r.parsed);
    if (validRows.length === 0) {
      toast.error("No valid rows to import");
      return;
    }

    setStep("importing");
    setProgress(0);

    const result = await bulkImportStudents(
      validRows.map((r) => r.parsed as StudentFormData)
    );

    setProgress(100);

    if ("error" in result) {
      toast.error(result.error);
      setStep("preview");
      return;
    }

    setResult(result);
    setStep("done");
    toast.success(`${result.imported} students imported!`);
  };

  const handleClose = () => {
    if (step === "done") onSuccess();
    setStep("upload");
    setRows([]);
    setResult(null);
    setProgress(0);
    onOpenChange(false);
  };

  const validCount = rows.filter((r) => r.isValid).length;
  const invalidCount = rows.filter((r) => !r.isValid && !r.isDuplicate).length;
  const dupCount = rows.filter((r) => r.isDuplicate).length;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className="max-w-3xl p-0 gap-0"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader className="px-6 py-4 border-b border-border/50">
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-emerald-500" />
            Import Students from Excel
          </DialogTitle>
        </DialogHeader>

        {/* Upload step */}
        {step === "upload" && (
          <div className="p-6">
            <div
              onDragEnter={() => setDragging(true)}
              onDragLeave={() => setDragging(false)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all duration-200 ${
                dragging
                  ? "border-indigo-500 bg-indigo-500/10"
                  : "border-border hover:border-indigo-500/50 hover:bg-muted/30"
              }`}
            >
              <Upload className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
              <p className="font-semibold text-base mb-1">Drop your Excel file here</p>
              <p className="text-sm text-muted-foreground mb-4">or click to browse</p>
              <p className="text-xs text-muted-foreground">Supports .xlsx, .xls, .csv</p>
              <input
                ref={fileRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={(e) => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }}
              />
            </div>

            {/* Template columns guide */}
            <div className="mt-4 p-4 rounded-xl bg-muted/40 border border-border/50">
              <p className="text-sm font-medium mb-2">Required columns in your Excel:</p>
              <div className="flex flex-wrap gap-1.5">
                {["Full Name *", "Email *", "Phone *", "Monthly Fee *", "Father Name", "Gender", "Address", "City", "State", "Joining Date"].map((col) => (
                  <Badge key={col} variant={col.includes("*") ? "default" : "secondary"} className="text-xs font-mono">
                    {col}
                  </Badge>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-2">* Required fields</p>
            </div>
          </div>
        )}

        {/* Preview step */}
        {step === "preview" && (
          <>
            {/* Summary bar */}
            <div className="px-6 py-3 border-b border-border/50 flex flex-wrap gap-4 bg-muted/30">
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span className="font-medium">{validCount} valid</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <AlertCircle className="w-4 h-4 text-rose-500" />
                <span className="font-medium">{invalidCount} invalid</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <AlertCircle className="w-4 h-4 text-amber-500" />
                <span className="font-medium">{dupCount} duplicates</span>
              </div>
              <span className="text-sm text-muted-foreground">Total: {rows.length} rows</span>
            </div>

            <ScrollArea className="h-[50vh]">
              <div className="p-4 space-y-2">
                {rows.map((row, i) => (
                  <div
                    key={i}
                    className={`p-3 rounded-xl border text-sm ${
                      row.isDuplicate
                        ? "border-amber-500/30 bg-amber-500/5"
                        : row.isValid
                        ? "border-emerald-500/30 bg-emerald-500/5"
                        : "border-rose-500/30 bg-rose-500/5"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs text-muted-foreground">#{i + 1}</span>
                        <span className="font-medium">{row.parsed?.fullName || "—"}</span>
                        <span className="text-muted-foreground">{row.parsed?.email}</span>
                        <span className="text-muted-foreground">{row.parsed?.phone}</span>
                        {row.parsed?.monthlyFee && (
                          <span className="text-indigo-400">₹{row.parsed.monthlyFee}</span>
                        )}
                      </div>
                      <div className="shrink-0">
                        {row.isDuplicate ? (
                          <Badge className="bg-amber-500/15 text-amber-500 text-[10px]">Duplicate</Badge>
                        ) : row.isValid ? (
                          <Badge className="bg-emerald-500/15 text-emerald-500 text-[10px]">Valid</Badge>
                        ) : (
                          <Badge className="bg-rose-500/15 text-rose-500 text-[10px]">Invalid</Badge>
                        )}
                      </div>
                    </div>
                    {row.errors.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {row.errors.map((err, j) => (
                          <span key={j} className="text-[10px] px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-400">
                            {err}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>

            <DialogFooter className="px-6 py-4 border-t border-border/50">
              <Button variant="outline" onClick={() => setStep("upload")}>
                Choose Different File
              </Button>
              <Button
                onClick={handleImport}
                disabled={validCount === 0}
              >
                Import {validCount} Students
              </Button>
            </DialogFooter>
          </>
        )}

        {/* Importing step */}
        {step === "importing" && (
          <div className="p-8 text-center">
            <Loader2 className="w-10 h-10 mx-auto mb-4 text-indigo-500 animate-spin" />
            <p className="font-semibold text-lg mb-2">Importing students...</p>
            <p className="text-muted-foreground text-sm mb-6">Please wait, do not close this window.</p>
            <Progress value={progress} className="h-2 max-w-xs mx-auto" />
          </div>
        )}

        {/* Done step */}
        {step === "done" && result && (
          <div className="p-8 text-center">
            <div className="w-16 h-16 bg-emerald-500/15 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-emerald-500" />
            </div>
            <h3 className="text-xl font-bold mb-6">Import Complete!</h3>
            <div className="grid grid-cols-3 gap-4 max-w-sm mx-auto mb-6">
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                <p className="text-2xl font-bold text-emerald-500">{result.imported}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Imported</p>
              </div>
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20">
                <p className="text-2xl font-bold text-rose-500">{result.failed}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Failed</p>
              </div>
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <p className="text-2xl font-bold text-amber-500">{result.duplicates}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Skipped</p>
              </div>
            </div>
            <Button onClick={handleClose} className="w-full max-w-xs">
              Done
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
