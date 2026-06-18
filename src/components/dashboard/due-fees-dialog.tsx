"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Search, Download, RefreshCw, AlertCircle } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getDueFeesData, syncDueFees } from "@/actions/fees";
import { formatCurrency, formatDate } from "@/lib/utils";
import { exportToExcel } from "@/utils/export";

interface DueFeeRow {
  id: string;
  fullName: string;
  phone: string;
  monthlyFee: number;
  joiningDate: Date;
  lastPaymentDate: Date | null;
  pendingMonths: number;
  totalDueAmount: number;
  nextDueDate: Date;
  seat?: { seatNumber: string } | null;
  shift?: { name: string } | null;
}

interface DueFeesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DueFeesDialog({ open, onOpenChange }: DueFeesDialogProps) {
  const [rows, setRows] = useState<DueFeeRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [search, setSearch] = useState("");
  const [totalDue, setTotalDue] = useState(0);

  const load = useCallback(async (q = "") => {
    setLoading(true);
    const result = await getDueFeesData({ search: q });
    if (!("error" in result)) {
      setRows(result.rows as unknown as DueFeeRow[]);
      setTotalDue(result.totalDueRevenue);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (open) load(search);
  }, [open, load]);

  useEffect(() => {
    const timer = setTimeout(() => { if (open) load(search); }, 350);
    return () => clearTimeout(timer);
  }, [search, open, load]);

  const handleSync = async () => {
    setSyncing(true);
    const r = await syncDueFees();
    setSyncing(false);
    if ("error" in r) { toast.error(r.error); return; }
    toast.success(`Synced ${r.updated} students`);
    load(search);
  };

  const handleExport = () => {
    const data = rows.map((r) => ({
      "Student Name": r.fullName,
      "Seat No.": r.seat?.seatNumber ?? "—",
      "Shift": r.shift?.name ?? "—",
      "Monthly Fee": r.monthlyFee,
      "Last Payment": r.lastPaymentDate ? formatDate(r.lastPaymentDate) : "Never",
      "Pending Months": r.pendingMonths,
      "Total Due": r.totalDueAmount,
      "Mobile": r.phone,
      "Next Due Date": formatDate(r.nextDueDate),
    }));
    exportToExcel(data, `due_fees_${new Date().toISOString().split("T")[0]}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b border-border/50">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-rose-500" />
              <DialogTitle>Due Fees</DialogTitle>
              {rows.length > 0 && (
                <Badge className="bg-rose-500/15 text-rose-500 text-xs ml-1">{rows.length} students</Badge>
              )}
            </div>
            <div className="text-sm font-semibold text-rose-500">
              Total Due: {formatCurrency(totalDue)}
            </div>
          </div>
        </DialogHeader>

        {/* Toolbar */}
        <div className="px-4 py-3 border-b border-border/50 flex flex-wrap gap-3 bg-muted/20">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or phone..."
              className="pl-9 h-8 text-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button variant="outline" size="sm" onClick={handleSync} loading={syncing}>
            <RefreshCw className="w-3.5 h-3.5" />
            Sync
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="w-3.5 h-3.5" />
            Export Excel
          </Button>
        </div>

        <ScrollArea className="h-[60vh]">
          {loading ? (
            <div className="py-12 text-center text-muted-foreground text-sm">Loading...</div>
          ) : rows.length === 0 ? (
            <div className="py-16 text-center">
              <div className="w-14 h-14 bg-emerald-500/10 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <AlertCircle className="w-7 h-7 text-emerald-500" />
              </div>
              <p className="font-medium">All fees are up to date!</p>
              <p className="text-sm text-muted-foreground mt-1">No pending or overdue payments</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 border-b border-border/50">
                  {["Student", "Seat / Shift", "Monthly Fee", "Last Paid", "Pending", "Total Due", "Mobile"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium">{row.fullName}</p>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      <p>{row.seat?.seatNumber ?? "—"}</p>
                      <p className="text-xs">{row.shift?.name ?? "—"}</p>
                    </td>
                    <td className="px-4 py-3 font-medium">{formatCurrency(row.monthlyFee)}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {row.lastPaymentDate ? formatDate(row.lastPaymentDate) : (
                        <span className="text-rose-400 text-xs">Never paid</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        row.pendingMonths > 2
                          ? "bg-rose-500/15 text-rose-500"
                          : "bg-amber-500/15 text-amber-500"
                      }`}>
                        {row.pendingMonths} month{row.pendingMonths !== 1 ? "s" : ""}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-bold text-rose-500">
                      {formatCurrency(row.totalDueAmount)}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground font-mono text-xs">
                      {row.phone}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
