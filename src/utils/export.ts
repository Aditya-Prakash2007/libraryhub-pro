// Export utilities for Excel and PDF generation
import * as XLSX from "xlsx";

// Export data to Excel
export function exportToExcel<T extends Record<string, unknown>>(
  data: T[],
  filename: string,
  sheetName = "Sheet1"
) {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  // Auto-size columns
  const maxWidths: Record<number, number> = {};
  data.forEach((row) => {
    Object.values(row).forEach((value, colIndex) => {
      const len = String(value || "").length;
      maxWidths[colIndex] = Math.max(maxWidths[colIndex] || 10, len + 2);
    });
  });

  worksheet["!cols"] = Object.values(maxWidths).map((w) => ({ wch: Math.min(w, 40) }));

  XLSX.writeFile(workbook, `${filename}.xlsx`);
}

// Export students to Excel
export function exportStudentsToExcel(students: Record<string, unknown>[]) {
  const data = students.map((s) => ({
    "Student ID": s.studentId,
    "Full Name": s.fullName,
    "Email": s.email,
    "Phone": s.phone,
    "Seat No.": (s.seat as { seatNumber?: string })?.seatNumber || "—",
    "Shift": (s.shift as { name?: string })?.name || "—",
    "Monthly Fee": s.monthlyFee,
    "Status": s.status,
    "Payment Status": s.paymentStatus,
    "Attendance %": s.attendancePercentage,
    "Joining Date": s.joiningDate ? new Date(s.joiningDate as string).toLocaleDateString("en-IN") : "",
    "Expiry Date": s.expiryDate ? new Date(s.expiryDate as string).toLocaleDateString("en-IN") : "",
  }));

  exportToExcel(data, `students_${new Date().toISOString().split("T")[0]}`, "Students");
}

// Export payments to Excel
export function exportPaymentsToExcel(payments: Record<string, unknown>[]) {
  const data = payments.map((p) => ({
    "Payment ID": p.paymentId,
    "Student": (p.student as { fullName?: string })?.fullName,
    "Student ID": (p.student as { studentId?: string })?.studentId,
    "Amount": p.amount,
    "Total Amount": p.totalAmount,
    "Type": p.paymentType,
    "Mode": p.paymentMode,
    "Status": p.status,
    "Paid On": p.paidAt ? new Date(p.paidAt as string).toLocaleDateString("en-IN") : "—",
    "Invoice": (p.invoice as { invoiceNumber?: string })?.invoiceNumber || "—",
  }));

  exportToExcel(data, `payments_${new Date().toISOString().split("T")[0]}`, "Payments");
}

// Export attendance to Excel
export function exportAttendanceToExcel(records: Record<string, unknown>[]) {
  const data = records.map((r) => ({
    "Student": (r.student as { fullName?: string })?.fullName,
    "Student ID": (r.student as { studentId?: string })?.studentId,
    "Date": new Date(r.date as string).toLocaleDateString("en-IN"),
    "Status": r.status,
    "Check-In": r.checkInTime ? new Date(r.checkInTime as string).toLocaleTimeString("en-IN") : "—",
    "Check-Out": r.checkOutTime ? new Date(r.checkOutTime as string).toLocaleTimeString("en-IN") : "—",
    "Shift": (r.shift as { name?: string })?.name || "—",
    "Via QR": r.markedViaQR ? "Yes" : "No",
  }));

  exportToExcel(data, `attendance_${new Date().toISOString().split("T")[0]}`, "Attendance");
}

// Parse bulk import Excel file
export async function parseBulkImportFile(file: File): Promise<Record<string, unknown>[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: "binary" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet) as Record<string, unknown>[];
        resolve(jsonData);
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = reject;
    reader.readAsBinaryString(file);
  });
}
