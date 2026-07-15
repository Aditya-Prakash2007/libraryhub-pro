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
 * Calculate how many billing cycles are overdue.
 *
 * Semantics of nextDueDateFromDB:
 *   - null  → student has never paid; use joiningDate as "unpaid from" date.
 *             First billing cycle runs from joiningDate. Pending = complete
 *             months elapsed since joiningDate.
 *   - set   → student is paid UP UNTIL this date. As soon as today >= this
 *             date, the NEXT billing cycle has started → at least 1 month due.
 *             pendingMonths = monthsElapsed(nextDueDate → today) + 1
 *
 * totalDueAmount passed here is monthlyFee (per month) — NOT the partial
 * balance. The partial balance is tracked separately in the Student record.
 */
export function calculateDueFee(
  joiningDate: Date,
  monthlyFee: number,
  nextDueDateFromDB: Date | null,
  today = new Date()
): FeeCalculation {
  if (nextDueDateFromDB === null) {
    // New student — never paid. Pending from joining date.
    const paidUntil = new Date(joiningDate);

    if (paidUntil > today) {
      return {
        pendingMonths: 0,
        totalDueAmount: 0,
        lastPaymentDate: null,
        nextDueDate: paidUntil,
        monthsElapsed: 0,
        isOverdue: false,
      };
    }

    const monthsElapsed = monthsBetween(paidUntil, today);
    const pendingMonths = monthsElapsed + 1;
    return {
      pendingMonths,
      totalDueAmount: pendingMonths * monthlyFee,
      lastPaymentDate: null,
      nextDueDate: paidUntil,
      monthsElapsed,
      isOverdue: true,
    };
  }

  // Student has paid. nextDueDateFromDB = date until which they are covered.
  const paidUntil = new Date(nextDueDateFromDB);

  if (paidUntil > today) {
    // Still within paid period — nothing due.
    return {
      pendingMonths: 0,
      totalDueAmount: 0,
      lastPaymentDate: null,
      nextDueDate: paidUntil,
      monthsElapsed: 0,
      isOverdue: false,
    };
  }

  // today >= paidUntil → new billing cycle has started.
  // At minimum 1 month is due (the new cycle). Each additional complete month
  // that has elapsed adds one more.
  const monthsElapsed = monthsBetween(paidUntil, today);
  const pendingMonths = monthsElapsed + 1; // +1 because current cycle started

  return {
    pendingMonths,
    totalDueAmount: pendingMonths * monthlyFee,
    lastPaymentDate: null,
    nextDueDate: paidUntil,
    monthsElapsed,
    isOverdue: true,
  };
}

/** Count COMPLETE months elapsed from `from` to `to`. */
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
  discountAmount?: number | null;
  joiningDate: Date;
  nextDueDate?: Date | null;   // used for accurate calculation
  lastPaymentDate: Date | null;
  paymentStatus: string;
  totalDueAmount?: number;     // partial balance stored in DB
  pendingMonths?: number;
  seat?: { seatNumber: string } | null;
  shift?: { name: string } | null;
}

export function buildDueFeeRows(students: StudentFeeRow[]): (StudentFeeRow & FeeCalculation)[] {
  const today = new Date();
  return students
    .map((s) => {
      const baseFee = Math.max(0, s.monthlyFee - (s.discountAmount || 0));
      const calc = calculateDueFee(s.joiningDate, baseFee, s.nextDueDate ?? null, today);

      // If the student has a partial balance in DB, add it to the total due
      const partialBalance = s.totalDueAmount && s.totalDueAmount > 0 ? s.totalDueAmount : 0;
      // But only add partialBalance if it's truly a partial (not the same as pendingMonths×fee)
      // We detect partial balance by checking: totalDueAmount != pendingMonths * baseFee
      const syncedDue = (s.pendingMonths || 0) * baseFee;
      const extraPartial = partialBalance > syncedDue ? partialBalance - syncedDue : 0;

      return {
        ...s,
        ...calc,
        totalDueAmount: calc.totalDueAmount + extraPartial,
      };
    })
    .filter((s) => s.pendingMonths > 0 || s.paymentStatus === "PARTIAL")
    .sort((a, b) => b.pendingMonths - a.pendingMonths);
}
