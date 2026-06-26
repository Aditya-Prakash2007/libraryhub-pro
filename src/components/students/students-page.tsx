"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Search, Download, Upload,
  UserCheck, UserX, Trash2, Eye, MoreHorizontal,
  FileText, RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { DataTable } from "@/components/shared/data-table";
import { PageHeader } from "@/components/shared/page-header";
import { StudentDialog } from "./student-dialog";
import { StudentDetailDialog } from "./student-detail-dialog";
import { getStudents, deleteStudent, toggleStudentStatus } from "@/actions/students";
import { getShifts } from "@/actions/shifts";
import { formatCurrency, getInitials } from "@/lib/utils";
import type { Column } from "@/components/shared/data-table";
import type { StudentFormData } from "@/schemas";
import { exportStudentsToExcel } from "@/utils/export";
import { ExcelImportDialog } from "./excel-import-dialog";

// Shape returned by getStudents (dates come as Date objects from server)
interface StudentRow {
  id: string;
  studentId: string;
  fullName: string;
  email: string;
  phone: string;
  profilePhoto?: string | null;
  status: string;
  paymentStatus: string;
  monthlyFee: number;
  joiningDate: Date | string;
  expiryDate?: Date | string | null;
  attendancePercentage: number;
  shiftId?: string | null;
  seatId?: string | null;
  fatherName?: string | null;
  motherName?: string | null;
  whatsappNumber?: string | null;
  emergencyContact?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  gender?: string | null;
  occupation?: string | null;
  institution?: string | null;
  notes?: string | null;
  discountAmount?: number;
  depositAmount?: number;
  seat?: { seatNumber: string; floor?: number } | null;
  shift?: { name: string; startTime: string; endTime: string } | null;
}

interface ShiftOption {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  color: string;
}

import { useSearchParams } from "next/navigation";

export function StudentsPage() {
  const searchParams = useSearchParams();
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState(searchParams.get("status") || "all");
  const [shiftFilter, setShiftFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState(searchParams.get("payment") || "all");
  // Auto-open add dialog if ?action=add is in URL
  const [addDialogOpen, setAddDialogOpen] = useState(searchParams.get("action") === "add");
  const [editStudent, setEditStudent] = useState<StudentRow | null>(null);
  const [viewStudentId, setViewStudentId] = useState<string | null>(null);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  // Shifts for filter dropdown only (not for dialog — dialog loads fresh)
  const [filterShifts, setFilterShifts] = useState<ShiftOption[]>([]);

  const loadStudents = useCallback(async () => {
    setLoading(true);
    const result = await getStudents({
      search,
      status: statusFilter,
      shiftId: shiftFilter,
      paymentStatus: paymentFilter,
      page,
      limit: 15,
    });
    if ("error" in result) {
      toast.error(result.error);
    } else {
      setStudents(result.students as unknown as StudentRow[]);
      setTotal(result.total);
      setPages(result.pages);
    }
    setLoading(false);
  }, [search, statusFilter, shiftFilter, paymentFilter, page]);

  useEffect(() => { loadStudents(); }, [loadStudents]);

  useEffect(() => {
    getShifts().then((r) => {
      if (!("error" in r)) setFilterShifts(r.shifts as unknown as ShiftOption[]);
    });
  }, []);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete student "${name}"? This action cannot be undone.`)) return;
    const result = await deleteStudent(id);
    if ("error" in result) toast.error(result.error);
    else { toast.success("Student deleted"); loadStudents(); }
  };

  const handleStatusToggle = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
    const result = await toggleStudentStatus(
      id,
      newStatus as "ACTIVE" | "SUSPENDED" | "INACTIVE"
    );
    if ("error" in result) toast.error(result.error);
    else {
      toast.success(`Student ${newStatus === "ACTIVE" ? "activated" : "suspended"}`);
      loadStudents();
    }
  };

  const handleExport = () => {
    exportStudentsToExcel(students as unknown as Record<string, unknown>[]);
  };

  // Build the StudentFormData subset for editing
  const buildEditData = (s: StudentRow): Partial<StudentFormData> & { id: string } => ({
    id: s.id,
    fullName: s.fullName,
    fatherName: s.fatherName ?? undefined,
    motherName: s.motherName ?? undefined,
    email: s.email,
    phone: s.phone,
    whatsappNumber: s.whatsappNumber ?? undefined,
    emergencyContact: s.emergencyContact ?? undefined,
    address: s.address ?? undefined,
    city: s.city ?? undefined,
    state: s.state ?? undefined,
    pincode: s.pincode ?? undefined,
    gender: s.gender ?? undefined,
    occupation: s.occupation ?? undefined,
    institution: s.institution ?? undefined,
    seatId: s.seatId ?? undefined,
    shiftId: s.shiftId ?? undefined,
    monthlyFee: s.monthlyFee,
    depositAmount: s.depositAmount ?? 0,
    discountAmount: s.discountAmount ?? 0,
    notes: s.notes ?? undefined,
  });

  const statusBadge = (status: string) => {
    const v: Record<string, string> = {
      ACTIVE: "bg-emerald-500/15 text-emerald-500",
      INACTIVE: "bg-slate-500/15 text-slate-400",
      SUSPENDED: "bg-rose-500/15 text-rose-500",
      PENDING_VERIFICATION: "bg-amber-500/15 text-amber-500",
    };
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${v[status] ?? "bg-muted text-muted-foreground"}`}>
        {status.replace("_", " ")}
      </span>
    );
  };

  const paymentBadge = (status: string) => {
    const v: Record<string, string> = {
      PAID: "bg-emerald-500/15 text-emerald-500",
      PENDING: "bg-amber-500/15 text-amber-500",
      OVERDUE: "bg-rose-500/15 text-rose-500",
      FAILED: "bg-rose-600/15 text-rose-600",
    };
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${v[status] ?? "bg-muted text-muted-foreground"}`}>
        {status}
      </span>
    );
  };

  const columns: Column<StudentRow>[] = [
    {
      key: "student",
      header: "Student",
      cell: (row) => (
        <div className="flex items-center gap-3">
          <Avatar className="w-8 h-8">
            <AvatarImage src={row.profilePhoto ?? ""} />
            <AvatarFallback className="text-xs">{getInitials(row.fullName)}</AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium text-sm">{row.fullName}</p>
            <p className="text-xs text-muted-foreground">{row.studentId}</p>
          </div>
        </div>
      ),
    },
    {
      key: "contact",
      header: "Contact",
      cell: (row) => (
        <div>
          <p className="text-sm">{row.phone}</p>
          <p className="text-xs text-muted-foreground truncate max-w-[140px]">{row.email}</p>
        </div>
      ),
    },
    {
      key: "seat",
      header: "Seat / Shift",
      cell: (row) => (
        <div>
          <p className="text-sm font-medium">{row.seat?.seatNumber ? `${row.seat.seatNumber} (F${row.seat.floor || '-'})` : "—"}</p>
          <p className="text-xs text-muted-foreground">{row.shift?.name ?? "No shift"}</p>
        </div>
      ),
    },
    {
      key: "fee",
      header: "Monthly Fee",
      cell: (row) => (
        <span className="text-sm font-medium">{formatCurrency(row.monthlyFee)}</span>
      ),
    },
    { key: "status", header: "Status", cell: (row) => statusBadge(row.status) },
    { key: "payment", header: "Payment", cell: (row) => paymentBadge(row.paymentStatus) },
    {
      key: "attendance",
      header: "Attendance",
      cell: (row) => (
        <div className="flex items-center gap-2">
          <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-500 rounded-full"
              style={{ width: `${row.attendancePercentage}%` }}
            />
          </div>
          <span className="text-xs text-muted-foreground">{row.attendancePercentage}%</span>
        </div>
      ),
    },
    {
      key: "actions",
      header: "",
      cell: (row) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="w-8 h-8">
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setViewStudentId(row.id)}>
              <Eye className="w-4 h-4 mr-2" /> View Details
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setEditStudent(row)}>
              <FileText className="w-4 h-4 mr-2" /> Edit
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => handleStatusToggle(row.id, row.status)}>
              {row.status === "ACTIVE"
                ? <><UserX className="w-4 h-4 mr-2" /> Suspend</>
                : <><UserCheck className="w-4 h-4 mr-2" /> Activate</>}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => handleDelete(row.id, row.fullName)}
            >
              <Trash2 className="w-4 h-4 mr-2" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
      className: "w-12",
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Students" description={`${total} total students`}>
        <Button variant="outline" size="sm" onClick={() => setImportDialogOpen(true)}>
          <Upload className="w-4 h-4" />Import
        </Button>
        <Button variant="outline" size="sm" onClick={handleExport}>
          <Download className="w-4 h-4" />Export
        </Button>
        <Button size="sm" onClick={() => setAddDialogOpen(true)}>
          <Plus className="w-4 h-4" />Add Student
        </Button>
      </PageHeader>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search name, ID, email, phone..."
                className="pl-9"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              />
            </div>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
              <SelectTrigger className="w-36"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="INACTIVE">Inactive</SelectItem>
                <SelectItem value="SUSPENDED">Suspended</SelectItem>
              </SelectContent>
            </Select>
            <Select value={shiftFilter} onValueChange={(v) => { setShiftFilter(v); setPage(1); }}>
              <SelectTrigger className="w-36"><SelectValue placeholder="Shift" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Shifts</SelectItem>
                {filterShifts.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={paymentFilter} onValueChange={(v) => { setPaymentFilter(v); setPage(1); }}>
              <SelectTrigger className="w-36"><SelectValue placeholder="Payment" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Payments</SelectItem>
                <SelectItem value="PAID">Paid</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="OVERDUE">Overdue</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={loadStudents}>
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <DataTable
        data={students}
        columns={columns}
        loading={loading}
        emptyTitle="No students found"
        emptyDescription="Add your first student to get started"
        pagination={{ page, total, pages, onPageChange: setPage }}
      />

      <StudentDialog
        open={addDialogOpen || !!editStudent}
        onOpenChange={(open) => {
          if (!open) { setAddDialogOpen(false); setEditStudent(null); }
        }}
        student={editStudent ? buildEditData(editStudent) : null}
        onSuccess={() => { setAddDialogOpen(false); setEditStudent(null); loadStudents(); }}
      />

      {viewStudentId && (
        <StudentDetailDialog
          studentId={viewStudentId}
          open={!!viewStudentId}
          onOpenChange={(open) => !open && setViewStudentId(null)}
        />
      )}

      <ExcelImportDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        onSuccess={loadStudents}
      />
    </div>
  );
}
