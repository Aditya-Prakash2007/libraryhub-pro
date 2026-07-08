// Application-wide constants

export const APP_NAME = "LibraryHub Pro";
export const APP_DESCRIPTION = "Modern Library Seat Management Platform";
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

// Color theme - Indigo + Purple gradient
export const BRAND_COLORS = {
  primary: "#6366f1",    // Indigo-500
  secondary: "#8b5cf6",  // Violet-500
  accent: "#a78bfa",     // Violet-400
  dark: "#1e1b4b",       // Indigo-950
};

// Seat status colors (for visual seat map)
export const SEAT_STATUS_COLORS = {
  AVAILABLE: {
    bg: "bg-emerald-500/20",
    border: "border-emerald-500",
    text: "text-emerald-400",
    dot: "bg-emerald-500",
    hex: "#10b981",
  },
  OCCUPIED: {
    bg: "bg-rose-500/20",
    border: "border-rose-500",
    text: "text-rose-400",
    dot: "bg-rose-500",
    hex: "#f43f5e",
  },
  RESERVED: {
    bg: "bg-amber-500/20",
    border: "border-amber-500",
    text: "text-amber-400",
    dot: "bg-amber-500",
    hex: "#f59e0b",
  },
  MAINTENANCE: {
    bg: "bg-slate-500/20",
    border: "border-slate-500",
    text: "text-slate-400",
    dot: "bg-slate-500",
    hex: "#64748b",
  },
};

// Default shifts — only A, B, C, Full Day
export const DEFAULT_SHIFTS = [
  {
    name: "Shift A",
    startTime: "06:00",
    endTime: "14:00",
    color: "#6366f1",
    shiftType: "MORNING" as const,
    description: "Morning: 6:00 AM – 2:00 PM",
  },
  {
    name: "Shift B",
    startTime: "14:00",
    endTime: "22:00",
    color: "#8b5cf6",
    shiftType: "AFTERNOON" as const,
    description: "Afternoon: 2:00 PM – 10:00 PM",
  },
  {
    name: "Shift C",
    startTime: "22:00",
    endTime: "06:00",
    color: "#a78bfa",
    shiftType: "NIGHT" as const,
    description: "Night: 10:00 PM – 6:00 AM",
  },
  {
    name: "Full Day",
    startTime: "06:00",
    endTime: "06:00",
    color: "#10b981",
    shiftType: "FULL_DAY" as const,
    description: "Full Day: 6:00 AM – 6:00 AM (24 hrs)",
  },
];

// Payment types with duration multiplier
export const PAYMENT_TYPES = [
  { value: "MONTHLY", label: "Monthly", months: 1 },
  { value: "QUARTERLY", label: "Quarterly (3 months)", months: 3 },
  { value: "HALF_YEARLY", label: "Half-Yearly (6 months)", months: 6 },
  { value: "YEARLY", label: "Yearly (12 months)", months: 12 },
];

// Navigation items
export const ADMIN_NAV_ITEMS = [
  { title: "Dashboard", href: "/admin/dashboard", icon: "LayoutDashboard" },
  { title: "Students", href: "/admin/students", icon: "Users" },
  { title: "Seats", href: "/admin/seats", icon: "Grid3X3" },
  { title: "Shifts", href: "/admin/shifts", icon: "Clock" },
  { title: "Payments", href: "/admin/payments", icon: "CreditCard" },
  { title: "Attendance", href: "/admin/attendance", icon: "CalendarCheck" },
  { title: "Reports", href: "/admin/reports", icon: "BarChart3" },
  { title: "Notifications", href: "/admin/notifications", icon: "Bell" },
  { title: "Team Members", href: "/admin/workers", icon: "Briefcase" },
  { title: "Upgrade Plan", href: "/admin/subscription", icon: "Zap" },
  { title: "Settings", href: "/admin/settings", icon: "Settings" },
  { title: "Feedback", href: "/admin/feedback", icon: "MessageSquare" },
];

export const STUDENT_NAV_ITEMS = [
  { title: "Dashboard", href: "/student/dashboard", icon: "LayoutDashboard" },
  { title: "Profile", href: "/student/profile", icon: "User" },
  { title: "My QR Card", href: "/student/qr-card", icon: "QrCode" },
  { title: "Attendance", href: "/student/attendance", icon: "CalendarCheck" },
  { title: "Payments", href: "/student/payments", icon: "CreditCard" },
  { title: "Notifications", href: "/student/notifications", icon: "Bell" },
  { title: "Feedback", href: "/student/feedback", icon: "MessageSquare" },
];

export const SUPERADMIN_NAV_ITEMS = [
  {
    title: "Dashboard",
    href: "/superadmin/dashboard",
    icon: "LayoutDashboard",
  },
  {
    title: "Libraries",
    href: "/superadmin/libraries",
    icon: "Building2",
  },
  {
    title: "Subscriptions",
    href: "/superadmin/subscriptions",
    icon: "CreditCard",
  },
  {
    title: "Analytics",
    href: "/superadmin/analytics",
    icon: "BarChart3",
  },
  {
    title: "Feedback",
    href: "/superadmin/feedback",
    icon: "MessageSquare",
  },
];

// File upload limits
export const UPLOAD_LIMITS = {
  profilePhoto: { maxSize: 4 * 1024 * 1024, accepts: ["image/*"] },
  document: { maxSize: 10 * 1024 * 1024, accepts: ["image/*", "application/pdf"] },
  logo: { maxSize: 2 * 1024 * 1024, accepts: ["image/*"] },
  bulkImport: { maxSize: 5 * 1024 * 1024, accepts: [".xlsx", ".csv"] },
};

// Subscription plans
export const SUBSCRIPTION_PLANS = [
  {
    id: "FREE",
    name: "Free",
    price: 0,
    maxStudents: 25,
    maxSeats: 50,
    features: [
      "Up to 25 students",
      "Up to 50 seats",
      "Basic analytics",
      "Email notifications",
    ],
  },
  {
    id: "STARTER",
    name: "Starter",
    price: 999,
    maxStudents: 100,
    maxSeats: 200,
    features: [
      "Up to 100 students",
      "Up to 200 seats",
      "Advanced analytics",
      "Email & SMS notifications",
      "QR attendance",
      "PDF reports",
    ],
  },
  {
    id: "PROFESSIONAL",
    name: "Professional",
    price: 2499,
    maxStudents: 500,
    maxSeats: 1000,
    features: [
      "Up to 500 students",
      "Up to 1000 seats",
      "Full analytics suite",
      "All notification channels",
      "Custom branding",
      "API access",
      "Priority support",
    ],
  },
  {
    id: "ENTERPRISE",
    name: "Enterprise",
    price: 0,
    maxStudents: -1,
    maxSeats: -1,
    features: [
      "Unlimited students",
      "Unlimited seats",
      "White-label solution",
      "Custom integrations",
      "Dedicated support",
      "SLA guarantee",
    ],
  },
];
