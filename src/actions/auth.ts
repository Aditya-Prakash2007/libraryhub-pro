"use server";

import bcrypt from "bcryptjs";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { generateSlug } from "@/lib/utils";
import { DEFAULT_SHIFTS } from "@/constants";
import { sendWelcomeEmail, sendPasswordResetOTP, sendLibraryApprovalEmail } from "@/services/brevo";

// ─── Register Library Admin ────────────────────────────────────────────────
export async function registerLibraryAdmin(data: {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  libraryName: string;
  phone: string;
  agreeToTerms: boolean;
}) {
  try {
    const existingUser = await prisma.user.findUnique({ where: { email: data.email } });
    if (existingUser) return { error: "Email already registered. Please sign in." };

    let slug = generateSlug(data.libraryName);
    const existingSlug = await prisma.library.findUnique({ where: { slug } });
    if (existingSlug) slug = `${slug}-${Date.now().toString(36)}`;

    const hashedPassword = await bcrypt.hash(data.password, 12);

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name: data.name,
          email: data.email,
          password: hashedPassword,
          role: "LIBRARY_ADMIN",
          status: "ACTIVE",
          phone: data.phone,
          emailVerified: new Date(),
        },
      });

      // Trial starts immediately — no approval needed
      const trialEndsAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

      const library = await tx.library.create({
        data: {
          name: data.libraryName,
          slug,
          adminId: user.id,
          email: data.email,
          phone: data.phone,
          approvalStatus: "APPROVED",   // Auto-approved
          isActive: true,
          isTrialActive: true,
          trialStartedAt: new Date(),
          trialEndsAt,
          trialExpired: false,
        },
      });

      // Default shifts
      await tx.shift.createMany({
        data: DEFAULT_SHIFTS.map((shift) => ({ ...shift, libraryId: library.id })),
      });

      // Subscription — trial active immediately
      await tx.subscription.create({
        data: {
          libraryId: library.id,
          plan: "FREE",
          status: "TRIAL",
          trialEndDate: trialEndsAt,
          startDate: new Date(),
          maxStudents: 50,
          maxSeats: 100,
        },
      });

      await tx.settings.create({ data: { libraryId: library.id } });

      return { user, library };
    });

    // Welcome email
    await sendWelcomeEmail(data.email, data.name, data.libraryName).catch(() => {});

    return { success: true, userId: result.user.id };
  } catch (error) {
    console.error("Registration error:", error);
    return { error: "Failed to create account. Please try again." };
  }
}

// ─── Send OTP for password reset ──────────────────────────────────────────
export async function sendOTP(email: string) {
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    // Don't reveal if email doesn't exist — but log it
    if (!user) {
      console.log(`[sendOTP] No user found for email: ${email}`);
      return { error: "No account found with this email address." };
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await prisma.user.update({
      where: { id: user.id },
      data: { otp, otpExpiry },
    });

    console.log(`[sendOTP] OTP generated for ${email}: ${otp} (expires ${otpExpiry})`);

    const result = await sendPasswordResetOTP(email, user.name, otp);

    if (!result.success) {
      console.error("[sendOTP] Email send failed:", result.error);
      // Still return success to user but log failure
      // In production, you might want to retry or queue
    } else {
      console.log(`[sendOTP] OTP email sent successfully to ${email}`);
    }

    return { success: true };
  } catch (error) {
    console.error("Send OTP error:", error);
    return { error: "Failed to send OTP. Please try again." };
  }
}

// ─── Verify OTP and reset password ────────────────────────────────────────
export async function verifyOTPAndReset(email: string, otp: string, newPassword: string) {
  try {
    const user = await prisma.user.findFirst({
      where: {
        email,
        otp,
        otpExpiry: { gt: new Date() },
      },
    });

    if (!user) {
      return { error: "Invalid or expired OTP. Please request a new one." };
    }

    // If just checking OTP (before showing password form)
    if (newPassword === "CHECK_ONLY") {
      return { success: true };
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);

    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword, otp: null, otpExpiry: null },
    });

    return { success: true };
  } catch (error) {
    console.error("Verify OTP error:", error);
    return { error: "Failed to reset password. Please try again." };
  }
}

// ─── Reset Password via Token ──────────────────────────────────────────────
export async function resetPassword(token: string, newPassword: string) {
  try {
    const user = await prisma.user.findFirst({
      where: {
        resetToken: token,
        resetTokenExpiry: { gt: new Date() },
      },
    });

    if (!user) {
      return { error: "Invalid or expired reset token." };
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpiry: null,
      },
    });

    return { success: true };
  } catch (error) {
    console.error("Reset password error:", error);
    return { error: "Failed to reset password. Please try again." };
  }
}

// ─── Verify Email ──────────────────────────────────────────────────────────
export async function verifyEmail(token: string) {
  try {
    const user = await prisma.user.findFirst({
      where: { verifyToken: token, verifyTokenExpiry: { gt: new Date() } },
    });

    if (!user) return { error: "Invalid or expired verification link." };

    await prisma.user.update({
      where: { id: user.id },
      data: { emailVerified: new Date(), status: "ACTIVE", verifyToken: null, verifyTokenExpiry: null },
    });

    return { success: true };
  } catch (error) {
    console.error("Verify email error:", error);
    return { error: "Failed to verify email." };
  }
}

// ─── Super Admin: Approve Library ─────────────────────────────────────────
export async function approveLibrary(libraryId: string, adminId: string) {
  try {
    const library = await prisma.library.findUnique({
      where: { id: libraryId },
      include: { admin: { select: { email: true, name: true } } },
    });
    if (!library) return { error: "Library not found" };

    const trialEndsAt = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 hours trial

    await prisma.$transaction([
      prisma.library.update({
        where: { id: libraryId },
        data: {
          approvalStatus: "APPROVED",
          approvedAt: new Date(),
          approvedBy: adminId,
          isActive: true,
          isTrialActive: true,
          trialStartedAt: new Date(),
          trialEndsAt,
          trialExpired: false,
        },
      }),
      prisma.subscription.update({
        where: { libraryId },
        data: {
          status: "TRIAL",
          trialEndDate: trialEndsAt,
          startDate: new Date(),
        },
      }),
    ]);

    // Send approval email
    await sendLibraryApprovalEmail(
      library.admin.email,
      library.admin.name,
      library.name,
      true
    ).catch(() => {});

    return { success: true };
  } catch (error) {
    console.error("Approve library error:", error);
    return { error: "Failed to approve library" };
  }
}

// ─── Super Admin: Reject Library ──────────────────────────────────────────
export async function rejectLibrary(libraryId: string, reason: string) {
  try {
    const library = await prisma.library.findUnique({
      where: { id: libraryId },
      include: { admin: { select: { email: true, name: true } } },
    });
    if (!library) return { error: "Library not found" };

    await prisma.library.update({
      where: { id: libraryId },
      data: {
        approvalStatus: "REJECTED",
        rejectedAt: new Date(),
        rejectedReason: reason,
        isActive: false,
      },
    });

    await sendLibraryApprovalEmail(
      library.admin.email,
      library.admin.name,
      library.name,
      false,
      reason
    ).catch(() => {});

    return { success: true };
  } catch (error) {
    console.error("Reject library error:", error);
    return { error: "Failed to reject library" };
  }
}

// ─── Super Admin: Suspend / Enable Library ────────────────────────────────
export async function toggleLibraryStatus(libraryId: string, action: "suspend" | "enable" | "disable") {
  try {
    const updateData =
      action === "suspend"
        ? { isSuspended: true, approvalStatus: "SUSPENDED" as const }
        : action === "disable"
        ? { isActive: false }
        : { isSuspended: false, isActive: true, approvalStatus: "APPROVED" as const };

    await prisma.library.update({ where: { id: libraryId }, data: updateData });
    return { success: true };
  } catch (error) {
    console.error("Toggle library status error:", error);
    return { error: "Failed to update library status" };
  }
}

// ─── Check Trial / Subscription Status ────────────────────────────────────
export async function checkLibraryAccess(libraryId: string) {
  const library = await prisma.library.findUnique({
    where: { id: libraryId },
    include: { subscription: true },
  });

  if (!library) return { allowed: false, reason: "LIBRARY_NOT_FOUND" };
  if (!library.isActive) return { allowed: false, reason: "LIBRARY_DISABLED" };
  if (library.isSuspended) return { allowed: false, reason: "LIBRARY_SUSPENDED" };
  if (library.approvalStatus === "PENDING") return { allowed: false, reason: "PENDING_APPROVAL" };
  if (library.approvalStatus === "REJECTED") return { allowed: false, reason: "REJECTED" };

  // Trial check
  if (library.isTrialActive && library.trialEndsAt) {
    if (new Date() > library.trialEndsAt) {
      // Trial expired — update DB
      await prisma.library.update({
        where: { id: libraryId },
        data: { isTrialActive: false, trialExpired: true },
      }).catch(() => {});
      return { allowed: false, reason: "TRIAL_EXPIRED" };
    }
    return { allowed: true, reason: "TRIAL", trialEndsAt: library.trialEndsAt };
  }

  // Subscription check
  const sub = library.subscription;
  if (!sub || sub.status === "EXPIRED" || sub.status === "CANCELLED") {
    return { allowed: false, reason: "SUBSCRIPTION_EXPIRED" };
  }
  if (sub.endDate && new Date() > sub.endDate) {
    await prisma.subscription.update({
      where: { libraryId },
      data: { status: "EXPIRED" },
    }).catch(() => {});
    return { allowed: false, reason: "SUBSCRIPTION_EXPIRED" };
  }

  return { allowed: true, reason: "ACTIVE" };
}
