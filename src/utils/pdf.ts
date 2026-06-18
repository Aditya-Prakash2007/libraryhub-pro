// PDF generation utilities using jsPDF + autoTable
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

type TableRow = (string | number)[];

export function generateStudentReport(
  students: Record<string, unknown>[],
  libraryName: string
) {
  const doc = new jsPDF();

  // Header
  doc.setFillColor(99, 102, 241);
  doc.rect(0, 0, 210, 40, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("LibraryHub Pro", 14, 18);
  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.text(libraryName, 14, 28);
  doc.text("Student Report", 14, 35);
  doc.setFontSize(10);
  doc.text(`Generated: ${new Date().toLocaleDateString("en-IN")}`, 150, 35);

  doc.setTextColor(0, 0, 0);

  // Summary
  const active = students.filter((s) => s.status === "ACTIVE").length;
  const paid = students.filter((s) => s.paymentStatus === "PAID").length;
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Summary", 14, 55);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Total Students: ${students.length}`, 14, 63);
  doc.text(`Active: ${active}`, 70, 63);
  doc.text(`Paid: ${paid}`, 120, 63);

  const body: TableRow[] = students.map((s) => [
    String(s.studentId ?? ""),
    String(s.fullName ?? ""),
    String(s.phone ?? ""),
    String((s.seat as { seatNumber?: string } | null)?.seatNumber ?? "—"),
    String((s.shift as { name?: string } | null)?.name ?? "—"),
    `₹${s.monthlyFee ?? 0}`,
    String(s.status ?? ""),
    String(s.paymentStatus ?? ""),
  ]);

  autoTable(doc, {
    startY: 72,
    head: [["Student ID", "Name", "Phone", "Seat", "Shift", "Fee", "Status", "Payment"]],
    body,
    headStyles: {
      fillColor: [99, 102, 241],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 9,
    },
    bodyStyles: { fontSize: 8 },
    alternateRowStyles: { fillColor: [248, 248, 255] },
    margin: { left: 14, right: 14 },
  });

  doc.save(`students_report_${new Date().toISOString().split("T")[0]}.pdf`);
}

export function generatePaymentReceipt(
  payment: Record<string, unknown>,
  student: Record<string, unknown>,
  libraryName: string
) {
  const doc = new jsPDF();

  // Header
  doc.setFillColor(99, 102, 241);
  doc.rect(0, 0, 210, 45, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text("PAYMENT RECEIPT", 14, 20);
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(libraryName, 14, 30);
  doc.setFontSize(10);
  const invoiceNum =
    (payment.invoice as { invoiceNumber?: string } | null)?.invoiceNumber ??
    String(payment.paymentId ?? "");
  doc.text(`Invoice: ${invoiceNum}`, 14, 38);

  doc.setTextColor(0, 0, 0);

  // Student info
  doc.setDrawColor(230, 230, 240);
  doc.setFillColor(248, 248, 255);
  doc.roundedRect(14, 55, 180, 35, 3, 3, "FD");
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Student Details", 18, 65);
  doc.setFont("helvetica", "normal");
  doc.text(`Name: ${student.fullName ?? ""}`, 18, 73);
  doc.text(`ID: ${student.studentId ?? ""}`, 18, 80);
  doc.text(`Phone: ${student.phone ?? ""}`, 100, 73);
  doc.text(`Email: ${student.email ?? ""}`, 100, 80);

  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Payment Details", 14, 105);

  const body: TableRow[] = [
    [
      `${String(payment.paymentType ?? "").replace("_", " ")} Fee`,
      `₹${payment.amount ?? 0}`,
    ],
    ["Discount", `-₹${payment.discount ?? 0}`],
    ["Tax", `₹${payment.taxAmount ?? 0}`],
    ["Total Paid", `₹${payment.totalAmount ?? 0}`],
  ];

  autoTable(doc, {
    startY: 110,
    head: [["Description", "Amount"]],
    body,
    headStyles: {
      fillColor: [99, 102, 241],
      textColor: [255, 255, 255],
      fontStyle: "bold",
    },
    bodyStyles: { fontSize: 10 },
    columnStyles: { 1: { halign: "right" } },
    foot: [
      [
        {
          content: "PAID",
          colSpan: 2,
          styles: {
            halign: "center",
            fillColor: [16, 185, 129],
            textColor: [255, 255, 255],
            fontStyle: "bold",
            fontSize: 12,
          },
        },
      ],
    ],
    margin: { left: 14, right: 14 },
  });

  const pageHeight = doc.internal.pageSize.height;
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text(
    "This is a computer-generated receipt. No signature required.",
    14,
    pageHeight - 15
  );
  const paidAtStr = payment.paidAt
    ? new Date(payment.paidAt as string).toLocaleString("en-IN")
    : "N/A";
  doc.text(`Paid on: ${paidAtStr}`, 14, pageHeight - 10);
  doc.text("Powered by LibraryHub Pro", 140, pageHeight - 10);

  doc.save(`receipt_${payment.paymentId ?? "receipt"}.pdf`);
}

export function generateAttendanceReport(
  records: Record<string, unknown>[],
  studentName: string,
  month: string,
  libraryName: string
) {
  const doc = new jsPDF();

  doc.setFillColor(99, 102, 241);
  doc.rect(0, 0, 210, 40, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("Attendance Report", 14, 18);
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(`${studentName} — ${month}`, 14, 28);
  doc.text(libraryName, 14, 35);

  doc.setTextColor(0, 0, 0);

  const present = records.filter((r) => r.status === "PRESENT").length;
  const absent = records.filter((r) => r.status === "ABSENT").length;
  const percentage =
    records.length > 0
      ? Math.round((present / records.length) * 100)
      : 0;

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Summary:", 14, 53);
  doc.setFont("helvetica", "normal");
  doc.text(
    `Present: ${present}  Absent: ${absent}  Total: ${records.length}  Percentage: ${percentage}%`,
    14,
    61
  );

  const body: TableRow[] = records.map((r) => [
    new Date(r.date as string).toLocaleDateString("en-IN"),
    String(r.status ?? ""),
    r.checkInTime
      ? new Date(r.checkInTime as string).toLocaleTimeString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
        })
      : "—",
    r.checkOutTime
      ? new Date(r.checkOutTime as string).toLocaleTimeString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
        })
      : "—",
    String((r.shift as { name?: string } | null)?.name ?? "—"),
  ]);

  autoTable(doc, {
    startY: 70,
    head: [["Date", "Status", "Check-In", "Check-Out", "Shift"]],
    body,
    headStyles: {
      fillColor: [99, 102, 241],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 9,
    },
    bodyStyles: { fontSize: 9 },
    alternateRowStyles: { fillColor: [248, 248, 255] },
    margin: { left: 14, right: 14 },
  });

  doc.save(
    `attendance_${studentName.replace(/\s+/g, "_")}_${month}.pdf`
  );
}
