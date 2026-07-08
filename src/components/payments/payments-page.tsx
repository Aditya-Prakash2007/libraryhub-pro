"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Plus, QrCode, RefreshCw, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { DataTable } from "@/components/shared/data-table";
import { PageHeader } from "@/components/shared/page-header";
import { RecordPaymentDialog } from "./record-payment-dialog";
import { LibraryPaymentQR } from "./library-payment-qr";
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
  lateFee?: number | null;
  paidAt?: Date | null;
  createdAt: Date;
  periodStart?: Date | null;
  periodEnd?: Date | null;
  student: { id: string; fullName: string; studentId: string; profilePhoto?: string | null };
  invoice?: { invoiceNumber: string } | null;
}


const STATUS_COLORS: Record<string, string> = {
  PAID:     "bg-emerald-500/15 text-emerald-500",
  PENDING:  "bg-amber-500/15 text-amber-500",
  PARTIAL:  "bg-orange-500/15 text-orange-400",
  OVERDUE:  "bg-rose-500/15 text-rose-500",
  FAILED:   "bg-rose-600/15 text-rose-600",
  REFUNDED: "bg-blue-500/15 text-blue-500",
};

const STATUS_ICONS: Record<string, string> = {
  PAID: "✅", PENDING: "⏳", PARTIAL: "🟡",
  OVERDUE: "🔴", FAILED: "❌", REFUNDED: "↩️",
};

export function PaymentsPage() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("all");
  // Auto-open Record Payment dialog if ?action=add is in URL
  const [addDialogOpen, setAddDialogOpen] = useState(searchParams.get("action") === "add");
  const [qrDialogOpen, setQrDialogOpen] = useState(false);

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

  const statusBadge = (status: string) => (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[status] || "bg-muted text-muted-foreground"}`}>
      {STATUS_ICONS[status] || ""} {status}
    </span>
  );

  const getPaymentMonth = (row: Payment) => {
    const date = row.periodStart ? new Date(row.periodStart) : (row.paidAt ? new Date(row.paidAt) : new Date(row.createdAt));
    return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  };

  const columns: Column<Payment>[] = [
    {
      key: "student",
      header: "Student",
      cell: (row) => (
        <Link href={`/admin/students/${row.student.id}`} className="flex items-center gap-3 hover:opacity-85">
          <Avatar className="w-8 h-8">
            <AvatarImage src={row.student.profilePhoto || ""} />
            <AvatarFallback className="text-xs">{getInitials(row.student.fullName)}</AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium text-sm text-indigo-400 hover:underline">{row.student.fullName}</p>
            <p className="text-xs text-muted-foreground">{row.student.studentId}</p>
          </div>
        </Link>
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
      header: "Type & Month",
      cell: (row) => (
        <div>
          <p className="text-sm font-medium">{row.paymentType.replace(/_/g, " ")}</p>
          <p className="text-xs text-indigo-400 font-semibold">{getPaymentMonth(row)}</p>
          <p className="text-[10px] text-muted-foreground">{row.paymentMode}</p>
        </div>
      ),
    },
    {
      key: "amount",
      header: "Amount",
      cell: (row) => (
        <div>
          <p className="font-semibold text-sm">{formatCurrency(row.totalAmount)}</p>
          {row.status === "PARTIAL" && row.lateFee ? (
            <div className="mt-0.5 text-[10px] space-y-0.5">
              <p className="text-emerald-500">✅ Paid: {formatCurrency(row.totalAmount)}</p>
              <p className="text-orange-500 font-medium">⏳ Due: {formatCurrency(row.lateFee)}</p>
            </div>
          ) : null}
        </div>
      ),
    },

    {
      key: "status",
      header: "Status",
      cell: (row) => (
        <div className="space-y-1">
          {statusBadge(row.status)}
        </div>
      ),
    },
    {
      key: "date",
      header: "Date",
      cell: (row) => (
        <p className="text-xs text-muted-foreground">
          {row.paidAt ? formatDateTime(row.paidAt) : formatDateTime(row.createdAt)}
        </p>
      ),
    },
    {
      key: "receipt",
      header: "",
      cell: (row) =>
        row.invoice ? (
          <a
            href={`/api/receipt/${row.id}`}
            target="_blank"
            rel="noopener noreferrer"
            title="Download Receipt"
          >
            <Button variant="ghost" size="icon" className="w-7 h-7">
              <Download className="w-3.5 h-3.5" />
            </Button>
          </a>
        ) : null,
      className: "w-10",
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Payments" description={`${total} total transactions`}>
        <Button variant="outline" size="sm" onClick={loadPayments}>
          <RefreshCw className="w-4 h-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={() => setQrDialogOpen(true)}>
          <QrCode className="w-4 h-4" />
          Payment QR
        </Button>
        <Button size="sm" onClick={() => setAddDialogOpen(true)}>
          <Plus className="w-4 h-4" />
          Record Payment
        </Button>
      </PageHeader>

      {/* Filters — all statuses including PARTIAL & FAILED */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex gap-3 flex-wrap">
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="PAID">✅ Paid</SelectItem>
                <SelectItem value="PENDING">⏳ Pending</SelectItem>
                <SelectItem value="PARTIAL">🟡 Partial (Dues)</SelectItem>
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

      {/* Library Payment QR — only for admin with libraryId */}
      {session?.user?.libraryId && (
        <LibraryPaymentQR
          open={qrDialogOpen}
          onOpenChange={setQrDialogOpen}
          library={{
            id: session.user.libraryId,
            name: session.user.name || "Your Library",
            primaryColor: "#6366f1",
          }}
        />
      )}
    </div>
  );
}
