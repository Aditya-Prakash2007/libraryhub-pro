// Receipt PDF download route
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ paymentId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { paymentId } = await params;

    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        student: {
          select: {
            fullName: true,
            studentId: true,
            email: true,
            phone: true,
          },
        },
        invoice: true,
        library: {
          select: { name: true, address: true, phone: true, email: true },
        },
      },
    });

    if (!payment) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    // Access check — student can only see their own, admin can see their library's
    if (session.user.role === "STUDENT") {
      const student = await prisma.student.findFirst({
        where: { userId: session.user.id },
        select: { id: true },
      });
      if (student?.id !== payment.studentId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    } else if (session.user.role === "LIBRARY_ADMIN") {
      if (session.user.libraryId !== payment.libraryId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    // Generate PDF
    const doc = new jsPDF({ unit: "mm", format: "a4" });

    // Header gradient bar
    doc.setFillColor(99, 102, 241);
    doc.rect(0, 0, 210, 42, "F");

    // Library name
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.text(payment.library?.name || "Library", 14, 18);

    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text("PAYMENT RECEIPT", 14, 27);
    doc.setFontSize(9);
    doc.text(`Invoice: ${payment.invoice?.invoiceNumber || payment.paymentId}`, 14, 34);
    doc.text(`Date: ${payment.paidAt ? new Date(payment.paidAt).toLocaleDateString("en-IN") : new Date(payment.createdAt).toLocaleDateString("en-IN")}`, 140, 34);

    // Reset color
    doc.setTextColor(0, 0, 0);

    // Student info box
    doc.setDrawColor(220, 220, 240);
    doc.setFillColor(248, 248, 255);
    doc.roundedRect(14, 50, 182, 32, 3, 3, "FD");

    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("Bill To:", 18, 59);
    doc.setFont("helvetica", "normal");
    doc.text(payment.student.fullName, 18, 65);
    doc.text(`Student ID: ${payment.student.studentId}`, 18, 71);
    doc.text(`Phone: ${payment.student.phone}`, 100, 65);
    doc.text(`Email: ${payment.student.email}`, 100, 71);

    // Payment details table
    autoTable(doc, {
      startY: 90,
      head: [["Description", "Type", "Amount"]],
      body: [
        [
          payment.description || "Library Membership Fee",
          payment.paymentType.replace(/_/g, " "),
          `₹${payment.amount.toLocaleString("en-IN")}`,
        ],
        ...(payment.discount > 0 ? [["Discount", "", `-₹${payment.discount.toLocaleString("en-IN")}`]] : []),
        ...(payment.taxAmount > 0 ? [["Tax", "", `₹${payment.taxAmount.toLocaleString("en-IN")}`]] : []),
      ],
      headStyles: {
        fillColor: [99, 102, 241],
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 10,
      },
      bodyStyles: { fontSize: 10 },
      columnStyles: { 2: { halign: "right" } },
      margin: { left: 14, right: 14 },
    });

    const finalY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 5;

    // Total row
    doc.setFillColor(99, 102, 241);
    doc.rect(14, finalY, 182, 12, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("TOTAL PAID", 18, finalY + 8.5);
    doc.text(`₹${payment.totalAmount.toLocaleString("en-IN")}`, 192, finalY + 8.5, { align: "right" });

    // Payment method
    doc.setTextColor(100, 100, 100);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(`Payment Method: ${payment.paymentMode}`, 14, finalY + 22);
    if (payment.razorpayPaymentId) {
      doc.text(`Transaction ID: ${payment.razorpayPaymentId}`, 14, finalY + 28);
    }

    // Status stamp
    doc.setTextColor(16, 185, 129);
    doc.setFontSize(28);
    doc.setFont("helvetica", "bold");
    doc.text("PAID", 155, finalY + 28, { align: "center" });

    // Footer
    const pageH = doc.internal.pageSize.height;
    doc.setTextColor(150, 150, 150);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.line(14, pageH - 20, 196, pageH - 20);
    doc.text("This is a computer-generated receipt and does not require a physical signature.", 105, pageH - 14, { align: "center" });
    doc.text("Powered by LibraryHub Pro", 105, pageH - 9, { align: "center" });

    // Return as PDF buffer
    const pdfBuffer = Buffer.from(doc.output("arraybuffer"));

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="receipt-${payment.invoice?.invoiceNumber || payment.paymentId}.pdf"`,
        "Content-Length": String(pdfBuffer.length),
      },
    });
  } catch (error) {
    console.error("Receipt generation error:", error);
    return NextResponse.json({ error: "Failed to generate receipt" }, { status: 500 });
  }
}
