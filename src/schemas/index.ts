// Zod Validation Schemas
import { z } from "zod";

// ==================== AUTH SCHEMAS ====================

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const signupSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Must contain at least one uppercase letter")
    .regex(/[0-9]/, "Must contain at least one number"),
  confirmPassword: z.string(),
  libraryName: z.string().min(3, "Library name must be at least 3 characters"),
  phone: z.string().min(10, "Invalid phone number"),
  agreeToTerms: z.boolean().refine((val) => val === true, {
    message: "You must agree to terms and conditions",
  }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

export const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email address"),
});

export const resetPasswordSchema = z.object({
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Must contain at least one uppercase letter")
    .regex(/[0-9]/, "Must contain at least one number"),
  confirmPassword: z.string(),
  token: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

export const verifyEmailSchema = z.object({
  token: z.string().min(6, "Invalid OTP"),
});

// ==================== STUDENT SCHEMAS ====================

export const studentSchema = z.object({
  fullName: z.string().min(2, "Name must be at least 2 characters"),
  fatherName: z.string().optional(),
  motherName: z.string().optional(),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(10, "Invalid phone number"),
  whatsappNumber: z.string().optional(),
  emergencyContact: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  pincode: z.string().optional(),
  dateOfBirth: z.string().optional(),
  gender: z.string().optional(),
  occupation: z.string().optional(),
  institution: z.string().optional(),
  seatId: z.string().min(1, "Seat selection is required"),
  shiftId: z.string().min(1, "Shift selection is required"),
  joiningDate: z.string().optional(),
  expiryDate: z.string().optional(),
  monthlyFee: z.number().optional(),
  depositAmount: z.number().min(0).optional(),
  discountAmount: z.number().min(0).optional(),
  notes: z.string().optional(),
});

export type StudentFormData = z.infer<typeof studentSchema>;

// ==================== SHIFT SCHEMAS ====================

export const shiftSchema = z.object({
  name: z.string().min(2, "Shift name required"),
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format"),
  endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format"),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Invalid color"),
  maxStudents: z.number().min(1, "Must have at least 1 student"),
  description: z.string().optional(),
});

export type ShiftFormData = z.infer<typeof shiftSchema>;

// ==================== SEAT SCHEMAS ====================

export const seatSchema = z.object({
  seatNumber: z.string().min(1, "Seat number required"),
  floor: z.number().min(1, "Floor must be at least 1"),
  row: z.string().optional(),
  column: z.number().optional(),
  shiftId: z.string().optional(),
  status: z.enum(["AVAILABLE", "OCCUPIED", "RESERVED", "MAINTENANCE"]).default("AVAILABLE"),
  seatType: z.enum(["STANDARD", "PREMIUM", "WINDOW", "CORNER", "POWER_OUTLET"]).default("STANDARD"),
  notes: z.string().optional(),
  amenities: z.array(z.string()).optional(),
});

export type SeatFormData = z.infer<typeof seatSchema>;

// ==================== PAYMENT SCHEMAS ====================

export const paymentSchema = z.object({
  studentId: z.string().min(1, "Student required"),
  amount: z.number().min(1, "Amount must be greater than 0"),
  paymentType: z.enum(["MONTHLY", "QUARTERLY", "HALF_YEARLY", "YEARLY", "REGISTRATION", "LATE_FEE", "OTHER"]),
  paymentMode: z.enum(["RAZORPAY", "CASH", "BANK_TRANSFER", "UPI", "CHEQUE"]),
  dueDate: z.string().optional(),
  periodStart: z.string().optional(),
  periodEnd: z.string().optional(),
  description: z.string().optional(),
  notes: z.string().optional(),
});

export type PaymentFormData = z.infer<typeof paymentSchema>;

// ==================== ATTENDANCE SCHEMAS ====================

export const attendanceSchema = z.object({
  studentId: z.string().min(1, "Student required"),
  date: z.string(),
  shiftId: z.string().optional(),
  checkInTime: z.string().optional(),
  checkOutTime: z.string().optional(),
  status: z.enum(["PRESENT", "ABSENT", "LATE", "HALF_DAY"]).default("PRESENT"),
  notes: z.string().optional(),
});

export type AttendanceFormData = z.infer<typeof attendanceSchema>;

// ==================== LIBRARY SETTINGS SCHEMAS ====================

export const librarySettingsSchema = z.object({
  name: z.string().min(2, "Library name required"),
  description: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  pincode: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  website: z.string().url().optional().or(z.literal("")),
  openingTime: z.string(),
  closingTime: z.string(),
  primaryColor: z.string(),
  secondaryColor: z.string(),
  currency: z.string(),
  timezone: z.string(),
  upiId: z.string().optional().or(z.literal("")),
  customQrCode: z.string().optional().or(z.literal("")),
});

export type LibrarySettingsFormData = z.infer<typeof librarySettingsSchema>;

// ==================== NOTIFICATION SCHEMAS ====================

export const notificationSchema = z.object({
  title: z.string().min(2, "Title required"),
  message: z.string().min(5, "Message required"),
  type: z.enum(["ANNOUNCEMENT", "REMINDER", "SYSTEM", "FEE_DUE", "FEE_OVERDUE"]),
  targetAll: z.boolean().default(true),
  studentIds: z.array(z.string()).optional(),
  scheduledAt: z.string().optional(),
});

export type NotificationFormData = z.infer<typeof notificationSchema>;

// ==================== WORKER SCHEMAS ====================

export const workerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  phone: z.string().min(10, "Invalid phone number"),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  shiftIds: z.array(z.string()).min(1, "Select at least one shift"),
});

export type WorkerFormData = z.infer<typeof workerSchema>;

export const workerExpenseSchema = z.object({
  workerId: z.string().min(1, "Worker selection is required"),
  amount: z.number().min(1, "Amount must be at least 1"),
  description: z.string().min(3, "Description must be at least 3 characters"),
  imageUrl: z.string().optional().or(z.literal("")),
});

export type WorkerExpenseFormData = z.infer<typeof workerExpenseSchema>;
