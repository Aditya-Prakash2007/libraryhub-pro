// Database Seed Script
// Run: npx tsx prisma/seed.ts

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // ==================== SUPER ADMIN ====================
  const superAdminPassword = await bcrypt.hash("SuperAdmin@123", 12);
  const superAdmin = await prisma.user.upsert({
    where: { email: "superadmin@libraryhub.com" },
    update: { password: superAdminPassword },
    create: {
      name: "Super Admin",
      email: "superadmin@libraryhub.com",
      password: superAdminPassword,
      role: "SUPER_ADMIN",
      status: "ACTIVE",
      emailVerified: new Date(),
    },
  });
  console.log("✅ Super Admin created:", superAdmin.email);

  // ==================== LIBRARY ADMIN ====================
  const adminPassword = await bcrypt.hash("Admin@123", 12);
  const libraryAdmin = await prisma.user.upsert({
    where: { email: "admin@demolibrary.com" },
    update: { password: adminPassword },
    create: {
      name: "Rahul Sharma",
      email: "admin@demolibrary.com",
      password: adminPassword,
      role: "LIBRARY_ADMIN",
      status: "ACTIVE",
      emailVerified: new Date(),
      phone: "9876543210",
    },
  });
  console.log("✅ Library Admin created:", libraryAdmin.email);

  // ==================== LIBRARY ====================
  const library = await prisma.library.upsert({
    where: { slug: "demo-public-library" },
    update: {},
    create: {
      name: "Demo Public Library",
      slug: "demo-public-library",
      adminId: libraryAdmin.id,
      description: "A modern study library in the heart of the city",
      city: "Mumbai",
      state: "Maharashtra",
      phone: "022-12345678",
      email: "admin@demolibrary.com",
      totalSeats: 50,
      totalFloors: 2,
      openingTime: "06:00",
      closingTime: "22:00",
      approvalStatus: "APPROVED",
      isActive: true,
      isTrialActive: false,
    },
  });
  console.log("✅ Library created:", library.name);

  // ==================== SHIFTS ====================
  const shiftA = await prisma.shift.upsert({
    where: { name_libraryId: { name: "Morning Shift", libraryId: library.id } },
    update: {},
    create: {
      name: "Morning Shift",
      startTime: "06:00",
      endTime: "14:00",
      color: "#6366f1",
      maxStudents: 50,
      libraryId: library.id,
      description: "6:00 AM - 2:00 PM",
    },
  });

  const shiftB = await prisma.shift.upsert({
    where: { name_libraryId: { name: "Evening Shift", libraryId: library.id } },
    update: {},
    create: {
      name: "Evening Shift",
      startTime: "14:00",
      endTime: "22:00",
      color: "#8b5cf6",
      maxStudents: 50,
      libraryId: library.id,
      description: "2:00 PM - 10:00 PM",
    },
  });
  console.log("✅ Shifts created");

  // ==================== SEATS ====================
  const existingSeats = await prisma.seat.count({ where: { libraryId: library.id } });
  if (existingSeats === 0) {
    const seatData = [];
    // Floor 1: A01-A25
    for (let i = 1; i <= 25; i++) {
      seatData.push({
        seatNumber: `A${String(i).padStart(2, "0")}`,
        floor: 1,
        libraryId: library.id,
        status: "AVAILABLE" as const,
        seatType: i <= 5 ? ("WINDOW" as const) : ("STANDARD" as const),
        amenities: i % 5 === 0 ? ["Power Outlet"] : [],
      });
    }
    // Floor 2: B01-B25
    for (let i = 1; i <= 25; i++) {
      seatData.push({
        seatNumber: `B${String(i).padStart(2, "0")}`,
        floor: 2,
        libraryId: library.id,
        status: "AVAILABLE" as const,
        seatType: i <= 3 ? ("PREMIUM" as const) : ("STANDARD" as const),
        amenities: [],
      });
    }
    await prisma.seat.createMany({ data: seatData });
    await prisma.library.update({
      where: { id: library.id },
      data: { totalSeats: seatData.length },
    });
    console.log(`✅ ${seatData.length} seats created`);
  } else {
    console.log(`⏭  Seats already exist (${existingSeats})`);
  }

  // ==================== SETTINGS ====================
  await prisma.settings.upsert({
    where: { libraryId: library.id },
    update: {},
    create: {
      libraryId: library.id,
      emailNotifications: true,
      lateFeeEnabled: true,
      lateFeeAmount: 50,
      qrCheckInEnabled: true,
    },
  });

  // ==================== SUBSCRIPTION ====================
  await prisma.subscription.upsert({
    where: { libraryId: library.id },
    update: {},
    create: {
      libraryId: library.id,
      plan: "PROFESSIONAL",
      status: "ACTIVE",
      maxStudents: 500,
      maxSeats: 1000,
      amount: 2499,
      startDate: new Date(),
      endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
    },
  });
  console.log("✅ Subscription created");

  // ==================== DEMO SEATS (occupied) ====================
  const seat1 = await prisma.seat.findFirst({
    where: { libraryId: library.id, seatNumber: "A01" },
  });
  const seat2 = await prisma.seat.findFirst({
    where: { libraryId: library.id, seatNumber: "A02" },
  });

  // ==================== STUDENT USER ====================
  const studentPassword = await bcrypt.hash("Student@123", 12);
  const studentUser = await prisma.user.upsert({
    where: { email: "student@demolibrary.com" },
    update: {},
    create: {
      name: "Priya Patel",
      email: "student@demolibrary.com",
      password: studentPassword,
      role: "STUDENT",
      status: "ACTIVE",
      emailVerified: new Date(),
      phone: "9123456789",
    },
  });

  // ==================== STUDENT RECORD ====================
  const existingStudent = await prisma.student.findUnique({
    where: { userId: studentUser.id },
  });

  if (!existingStudent) {
    const student = await prisma.student.create({
      data: {
        studentId: "DPL-24-0001",
        userId: studentUser.id,
        libraryId: library.id,
        fullName: "Priya Patel",
        fatherName: "Rajesh Patel",
        email: "student@demolibrary.com",
        phone: "9123456789",
        whatsappNumber: "9123456789",
        gender: "Female",
        address: "42, Green Colony",
        city: "Mumbai",
        state: "Maharashtra",
        pincode: "400001",
        seatId: seat1?.id,
        shiftId: shiftA.id,
        joiningDate: new Date("2024-01-15"),
        expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        monthlyFee: 1500,
        depositAmount: 1000,
        status: "ACTIVE",
        paymentStatus: "PAID",
        attendancePercentage: 85,
        totalPresent: 68,
        totalAbsent: 12,
        currentStreak: 7,
        longestStreak: 15,
      },
    });

    // Mark seat as occupied
    if (seat1) {
      await prisma.seat.update({
        where: { id: seat1.id },
        data: { status: "OCCUPIED" },
      });
    }

    // Add sample attendance (last 30 days)
    const attendanceData = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);

      // ~85% present
      const status = Math.random() < 0.85 ? "PRESENT" : "ABSENT";
      attendanceData.push({
        studentId: student.id,
        libraryId: library.id,
        shiftId: shiftA.id,
        date,
        status: status as "PRESENT" | "ABSENT",
        checkInTime:
          status === "PRESENT"
            ? new Date(date.getTime() + 6 * 60 * 60 * 1000)
            : null,
        checkOutTime:
          status === "PRESENT"
            ? new Date(date.getTime() + 13 * 60 * 60 * 1000)
            : null,
        markedViaQR: Math.random() > 0.5,
      });
    }

    await prisma.attendance.createMany({ data: attendanceData });

    // Add sample payments
    await prisma.payment.create({
      data: {
        paymentId: "PAY-24-000001",
        studentId: student.id,
        libraryId: library.id,
        amount: 1500,
        paymentType: "MONTHLY",
        paymentMode: "RAZORPAY",
        status: "PAID",
        paidAt: new Date("2024-01-15"),
        totalAmount: 1500,
        description: "January 2024 Fee",
      },
    });

    await prisma.payment.create({
      data: {
        paymentId: "PAY-24-000002",
        studentId: student.id,
        libraryId: library.id,
        amount: 1500,
        paymentType: "MONTHLY",
        paymentMode: "CASH",
        status: "PAID",
        paidAt: new Date("2024-02-15"),
        totalAmount: 1500,
        description: "February 2024 Fee",
      },
    });

    console.log("✅ Student created:", student.studentId);
  } else {
    console.log("⏭  Student already exists");
  }

  // ==================== SECOND STUDENT (no user account) ====================
  const student2Exists = await prisma.student.findUnique({
    where: { studentId: "DPL-24-0002" },
  });

  if (!student2Exists) {
    const student2 = await prisma.student.create({
      data: {
        studentId: "DPL-24-0002",
        libraryId: library.id,
        fullName: "Arjun Singh",
        email: "arjun@example.com",
        phone: "9876500001",
        seatId: seat2?.id,
        shiftId: shiftB.id,
        joiningDate: new Date("2024-02-01"),
        expiryDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days — expiring soon
        monthlyFee: 1200,
        status: "ACTIVE",
        paymentStatus: "OVERDUE",
        attendancePercentage: 72,
        totalPresent: 58,
        totalAbsent: 22,
      },
    });

    if (seat2) {
      await prisma.seat.update({
        where: { id: seat2.id },
        data: { status: "OCCUPIED" },
      });
    }
    console.log("✅ Second student created:", student2.studentId);
  }

  // ==================== SAMPLE NOTIFICATIONS ====================
  const priyaStudent = await prisma.student.findUnique({
    where: { studentId: "DPL-24-0001" },
    select: { userId: true, id: true },
  });

  if (priyaStudent?.userId) {
    const notifExists = await prisma.notification.findFirst({
      where: { userId: priyaStudent.userId },
    });

    if (!notifExists) {
      await prisma.notification.createMany({
        data: [
          {
            userId: priyaStudent.userId,
            studentId: priyaStudent.id,
            libraryId: library.id,
            title: "Welcome to Demo Public Library! 🎉",
            message:
              "Your seat A01 in Morning Shift has been assigned. Carry your ID card for QR attendance.",
            type: "ANNOUNCEMENT",
            channel: "IN_APP",
            isRead: false,
            sentAt: new Date(),
          },
          {
            userId: priyaStudent.userId,
            studentId: priyaStudent.id,
            libraryId: library.id,
            title: "Payment Received ✅",
            message: "Your February 2024 fee of ₹1,500 has been received. Receipt: INV-24-000002",
            type: "PAYMENT_SUCCESS",
            channel: "IN_APP",
            isRead: true,
            sentAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
          },
          {
            userId: priyaStudent.userId,
            studentId: priyaStudent.id,
            libraryId: library.id,
            title: "Fee Due in 30 Days",
            message:
              "Your library membership is expiring soon. Renew now to avoid interruption.",
            type: "FEE_DUE",
            channel: "IN_APP",
            isRead: false,
            sentAt: new Date(),
          },
        ],
      });
      console.log("✅ Sample notifications created");
    }
  }

  console.log("\n🎉 Seed complete!\n");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("Login Credentials:");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🔴 Super Admin:");
  console.log("   Email:    superadmin@libraryhub.com");
  console.log("   Password: SuperAdmin@123");
  console.log("   Access:   /superadmin/dashboard");
  console.log("");
  console.log("🟡 Library Admin:");
  console.log("   Email:    admin@demolibrary.com");
  console.log("   Password: Admin@123");
  console.log("   Access:   /admin/dashboard");
  console.log("");
  console.log("🟢 Student:");
  console.log("   Email:    student@demolibrary.com");
  console.log("   Password: Student@123");
  console.log("   Access:   /student/dashboard");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
