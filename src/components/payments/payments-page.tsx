"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Plus, CreditCard, TrendingUp, AlertCircle, CheckCircle2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { DataTable } from "@/components/shared/data-table";
import { PageHeader } from "@/components/shared/page-header";
import { RecordPaymentDialog } from "./record-payment-dialog";
import { getPayments } from "@/actions/payments";
import { formatCurrency, formatDateTime, getInitials } from "@/lib/utils";
import type { Column } from "@/components/shared/data-table";

interface Payment {
  id: string;
  paymentId: string;
  amount: number;
  totalAmount: number;
  paymentType: string;
  paymentMode: string;
  status: string;
  paidAt?: Date | null;
  createdAt: Date;
  student: { fullName: string; studentId: string; profilePhoto?: string | null };
  invoice?: { invoiceNumber: string } | null;
}

export function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("all");
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  const loadPayments = useCallback(async () => {
    setLoading(true);
    const result = await getPayments({ status: statusFilter, page, limit: 15 });
    if ("error" in result) {
      toast.error(result.error);
    } else {
      setPayments(result.payments as Payment[]);
      setTotal(result.total);
      setPages(result.pages);
    }
    setLoading(false);
  }, [statusFilter, page]);

  useEffect(() => { loadPayments(); }, [loadPayments]);

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      PAID: "bg-emerald-500/15 text-emerald-500",
      PENDING: "bg-amber-500/15 text-amber-500",
      OVERDUE: "bg-rose-500/15 text-rose-500",
      FAILED: "bg-rose-600/15 text-rose-600",
      REFUNDED: "bg-blue-500/15 text-blue-500",
    };
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${map[status] || "bg-muted text-muted-foreground"}`}>
        {status}
      </span>
    );
  };

  const columns: Column<Payment>[] = [
    {
      key: "student",
      header: "Student",
      cell: (row) => (
        <div className="flex items-center gap-3">
          <Avatar className="w-8 h-8">
            <AvatarImage src={row.student.profilePhoto || ""} />
            <AvatarFallback className="text-xs">{getInitials(row.student.fullName)}</AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium text-sm">{row.student.fullName}</p>
            <p className="text-xs text-muted-foreground">{row.student.studentId}</p>
          </div>
        </div>
      ),
    },
    {
      key: "paymentId",
      header: "Payment ID",
      cell: (row) => (
        <div>
          <p className="text-sm font-mono text-indigo-400">{row.paymentId}</p>
          {row.invoice && <p className="text-xs text-muted-foreground">{row.invoice.invoiceNumber}</p>}
        </div>
      ),
    },
    {
      key: "type",
      header: "Type",
      cell: (row) => (
        <div>
          <p className="text-sm">{row.paymentType.replace("_", " ")}</p>
          <p className="text-xs text-muted-foreground">{row.paymentMode}</p>
        </div>
      ),
    },
    {
      key: "amount",
      header: "Amount",
      cell: (row) => (
        <p className="font-semibold text-sm">{formatCurrency(row.totalAmount)}</p>
      ),
    },
    { key: "status", header: "Status", cell: (row) => statusBadge(row.status) },
    {
      key: "date",
      header: "Date",
      cell: (row) => (
        <p className="text-xs text-muted-foreground">
          {row.paidAt ? formatDateTime(row.paidAt) : formatDateTime(row.createdAt)}
        </p>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Payments" description={`${total} total transactions`}>
        <Button variant="outline" size="sm" onClick={loadPayments}>
          <RefreshCw className="w-4 h-4" />
        </Button>
        <Button size="sm" onClick={() => setAddDialogOpen(true)}>
          <Plus className="w-4 h-4" />
          Record Payment
        </Button>
      </PageHeader>

      {/* Filter */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex gap-3">
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="PAID">Paid</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="OVERDUE">Overdue</SelectItem>
                <SelectItem value="FAILED">Failed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <DataTable
        data={payments}
        columns={columns}
        loading={loading}
        emptyTitle="No payments yet"
        emptyDescription="Record your first payment to get started"
        pagination={{ page, total, pages, onPageChange: setPage }}
      />

      <RecordPaymentDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onSuccess={() => { setAddDialogOpen(false); loadPayments(); }}
      />
    </div>
  );
}
