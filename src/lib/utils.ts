// Core utility functions
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Format currency
export function formatCurrency(
  amount: number,
  currency: string = "INR"
): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

// Format date
export function formatDate(date: Date | string, options?: Intl.DateTimeFormatOptions): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...options,
  }).format(d);
}

// Format date-time
export function formatDateTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

// Format time
export function formatTime(time: string): string {
  const [hours, minutes] = time.split(":");
  const h = parseInt(hours);
  const ampm = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
}

// Generate student ID
export function generateStudentId(librarySlug: string, count: number): string {
  const prefix = librarySlug.toUpperCase().slice(0, 3);
  const year = new Date().getFullYear().toString().slice(-2);
  const num = count.toString().padStart(4, "0");
  return `${prefix}-${year}-${num}`;
}

// Generate payment ID
export function generatePaymentId(count: number): string {
  const year = new Date().getFullYear().toString().slice(-2);
  const num = count.toString().padStart(6, "0");
  return `PAY-${year}-${num}`;
}

// Generate invoice number
export function generateInvoiceNumber(count: number): string {
  const year = new Date().getFullYear().toString().slice(-2);
  const num = count.toString().padStart(6, "0");
  return `INV-${year}-${num}`;
}

// Calculate days until expiry
export function daysUntilExpiry(expiryDate: Date | string): number {
  const expiry = typeof expiryDate === "string" ? new Date(expiryDate) : expiryDate;
  const today = new Date();
  const diffTime = expiry.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

// Calculate attendance percentage
export function calculateAttendancePercentage(
  present: number,
  total: number
): number {
  if (total === 0) return 0;
  return Math.round((present / total) * 100);
}

// Get status color
export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    ACTIVE: "text-green-500",
    INACTIVE: "text-gray-500",
    SUSPENDED: "text-red-500",
    PENDING_VERIFICATION: "text-yellow-500",
    AVAILABLE: "text-green-500",
    OCCUPIED: "text-red-500",
    RESERVED: "text-yellow-500",
    MAINTENANCE: "text-gray-500",
    PAID: "text-green-500",
    PENDING: "text-yellow-500",
    OVERDUE: "text-red-500",
    FAILED: "text-red-600",
    PRESENT: "text-green-500",
    ABSENT: "text-red-500",
    LATE: "text-yellow-500",
  };
  return colors[status] || "text-gray-500";
}

// Get badge variant
export function getBadgeVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    ACTIVE: "default",
    PAID: "default",
    PRESENT: "default",
    AVAILABLE: "default",
    INACTIVE: "secondary",
    PENDING: "secondary",
    RESERVED: "secondary",
    SUSPENDED: "destructive",
    OVERDUE: "destructive",
    FAILED: "destructive",
    ABSENT: "destructive",
    MAINTENANCE: "outline",
  };
  return variants[status] || "outline";
}

// Truncate text
export function truncate(text: string, length: number): string {
  if (text.length <= length) return text;
  return `${text.slice(0, length)}...`;
}

// Generate slug from name
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

// Get initials from name
export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((word) => word[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

// Format file size
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

// Check if date is today
export function isToday(date: Date | string): boolean {
  const d = typeof date === "string" ? new Date(date) : date;
  const today = new Date();
  return (
    d.getDate() === today.getDate() &&
    d.getMonth() === today.getMonth() &&
    d.getFullYear() === today.getFullYear()
  );
}

// Get relative time
export function getRelativeTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  const week = 7 * day;
  const month = 30 * day;
  
  if (diff < minute) return "just now";
  if (diff < hour) return `${Math.floor(diff / minute)}m ago`;
  if (diff < day) return `${Math.floor(diff / hour)}h ago`;
  if (diff < week) return `${Math.floor(diff / day)}d ago`;
  if (diff < month) return `${Math.floor(diff / week)}w ago`;
  return formatDate(d);
}

// Calculate expiry date
export function calculateExpiryDate(
  startDate: Date,
  durationType: "MONTHLY" | "QUARTERLY" | "HALF_YEARLY" | "YEARLY"
): Date {
  const date = new Date(startDate);
  switch (durationType) {
    case "MONTHLY":
      date.setMonth(date.getMonth() + 1);
      break;
    case "QUARTERLY":
      date.setMonth(date.getMonth() + 3);
      break;
    case "HALF_YEARLY":
      date.setMonth(date.getMonth() + 6);
      break;
    case "YEARLY":
      date.setFullYear(date.getFullYear() + 1);
      break;
  }
  return date;
}

// Debounce function
export function debounce<T extends (...args: Parameters<T>) => ReturnType<T>>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  return function (...args: Parameters<T>) {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}
