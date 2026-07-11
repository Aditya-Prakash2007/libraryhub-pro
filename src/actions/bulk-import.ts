"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateStudentId } from "@/lib/utils";
import { revalidatePath } from "next/cache";
import type { StudentFormData } from "@/schemas";

export async function bulkImportStudents(rows: Partial<StudentFormData>[]) {
  try {
    const session = await auth();
    if (!session?.user?.libraryId) return { error: "Unauthorized" };

    const libraryId = session.user.libraryId;

    const library = await prisma.library.findUnique({
      where: { id: libraryId },
      select: { slug: true },
    });
    if (!library) return { error: "Library not found" };

    // Fetch existing emails and phones to detect duplicates
    const existingStudents = await prisma.student.findMany({
      where: { libraryId },
      select: { email: true, phone: true, studentId: true },
    });

    const existingEmails = new Set(existingStudents.map((s) => s.email.toLowerCase()));
    const existingPhones = new Set(existingStudents.map((s) => s.phone));

    let currentCount = await prisma.student.count({ where: { libraryId } });

    let imported = 0;
    let failed = 0;
    let duplicates = 0;

    for (const row of rows) {
      if (!row.fullName || !row.email || !row.phone || !row.monthlyFee) {
        failed++;
        continue;
      }

      // Skip duplicates
      if (
        existingEmails.has(row.email.toLowerCase()) ||
        existingPhones.has(row.phone)
      ) {
        duplicates++;
        continue;
      }

      try {
        currentCount++;
        const studentId = generateStudentId(library.slug, currentCount);

        const createdStudent = await prisma.student.create({
          data: {
            studentId,
            libraryId,
            fullName: row.fullName,
            fatherName: row.fatherName || null,
            motherName: row.motherName || null,
            email: row.email,
            phone: row.phone,
            whatsappNumber: row.whatsappNumber || null,
            address: row.address || null,
            city: row.city || null,
            state: row.state || null,
            pincode: row.pincode || null,
            gender: row.gender || null,
            occupation: row.occupation || null,
            institution: row.institution || null,
            monthlyFee: row.monthlyFee,
            depositAmount: row.depositAmount || 0,
            discountAmount: row.discountAmount || 0,
            notes: row.notes || null,
            joiningDate: row.joiningDate ? new Date(row.joiningDate) : new Date(),
            expiryDate: row.expiryDate ? new Date(row.expiryDate) : null,
            status: "ACTIVE",
            paymentStatus: "PENDING",
            nextDueDate: row.joiningDate
              ? (() => { const d = new Date(row.joiningDate); d.setMonth(d.getMonth() + 1); return d; })()
              : (() => { const d = new Date(); d.setMonth(d.getMonth() + 1); return d; })(),
          },
        });

        // Send immediate fee reminder if the registration date is backdated
        // and next due date is within 7 days or overdue
        if (createdStudent.nextDueDate && createdStudent.paymentStatus !== "PAID") {
          const now = new Date();
          const diffTime = createdStudent.nextDueDate.getTime() - now.getTime();
          const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          if (daysLeft <= 7) {
            const { sendSingleFeeReminder } = await import("@/actions/fees");
            await sendSingleFeeReminder(createdStudent.id).catch((err) => {
              console.error("Instant fee reminder failed on student bulk import:", err);
            });
          }
        }

        // Track so in-loop duplicates are caught too
        existingEmails.add(row.email.toLowerCase());
        existingPhones.add(row.phone);
        imported++;
      } catch {
        failed++;
      }
    }

    revalidatePath("/admin/students");
    return { imported, failed, duplicates };
  } catch (error) {
    console.error("Bulk import error:", error);
    return { error: "Bulk import failed. Please try again." };
  }
}
