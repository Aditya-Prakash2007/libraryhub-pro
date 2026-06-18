// Automatic fee calculation utility

export interface FeeCalculation {
  pendingMonths: number;
  totalDueAmount: number;
  lastPaymentDate: Date | null;
  nextDueDate: Date;
  monthsElapsed: number;
  isOverdue: boolean;
}

/**
 * Calculate how many months are due based on joining date and last payment date.
 * Fee cycle starts from the joining date (e.g. joined Jan 15 → due Feb 15 → Mar 15 etc.)
 */
export function calculateDueFee(
  joiningDate: Date,
  monthlyFee: number,
  lastPaymentDate: Date | null,
  today = new Date()
): FeeCalculation {
  const startDate = lastPaymentDate
    ? new Date(lastPaymentDate)
    : new Date(joiningDate);

  // Next due date = startDate + 1 month
  const nextDueDate = new Date(startDate);
  nextDueDate.setMonth(nextDueDate.getMonth() + 1);

  // If next due date is in the future, nothing is due
  if (nextDueDate > today) {
    return {
      pendingMonths: 0,
      totalDueAmount: 0,
      lastPaymentDate,
      nextDueDate,
      monthsElapsed: 0,
      isOverdue: false,
    };
  }

  // Calculate months elapsed since last payment (or joining)
  const monthsElapsed = monthsBetween(startDate, today);
  const pendingMonths = Math.max(0, monthsElapsed);
  const totalDueAmount = pendingMonths * monthlyFee;

  // Next due date after clearing all pending
  const clearedUpTo = new Date(startDate);
  clearedUpTo.setMonth(clearedUpTo.getMonth() + pendingMonths);

  return {
    pendingMonths,
    totalDueAmount,
    lastPaymentDate,
    nextDueDate,
    monthsElapsed,
    isOverdue: pendingMonths > 0,
  };
}

/** Count complete months between two dates */
function monthsBetween(from: Date, to: Date): number {
  const years = to.getFullYear() - from.getFullYear();
  const months = to.getMonth() - from.getMonth();
  const dayAdjust = to.getDate() >= from.getDate() ? 0 : -1;
  return Math.max(0, years * 12 + months + dayAdjust);
}

/** Recalculate and update due fees for all active students of a library */
export interface StudentFeeRow {
  id: string;
  fullName: string;
  phone: string;
  monthlyFee: number;
  joiningDate: Date;
  lastPaymentDate: Date | null;
  paymentStatus: string;
  seat?: { seatNumber: string } | null;
  shift?: { name: string } | null;
}

export function buildDueFeeRows(students: StudentFeeRow[]): (StudentFeeRow & FeeCalculation)[] {
  const today = new Date();
  return students
    .map((s) => ({
      ...s,
      ...calculateDueFee(s.joiningDate, s.monthlyFee, s.lastPaymentDate, today),
    }))
    .filter((s) => s.pendingMonths > 0)
    .sort((a, b) => b.pendingMonths - a.pendingMonths);
}
