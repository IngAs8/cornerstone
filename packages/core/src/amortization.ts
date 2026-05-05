import type { PaymentRow, RateScheduleEntry } from "./types";

/**
 * Calculate amortization table for a loan.
 * Supports fixed and variable interest rates.
 *
 * Pure function — no I/O, fully testable.
 *
 * @param principal Loan principal amount
 * @param annualRate Annual interest rate (e.g., 0.075 for 7.5%)
 * @param termMonths Loan term in months
 * @param options.paymentAmount Custom payment override (otherwise calculated)
 * @param options.rateSchedule For variable rates: list of rate changes by month
 * @returns Array of payment rows with full breakdown
 */
export function calculateAmortizationTable(
  principal: number,
  annualRate: number,
  termMonths: number,
  options?: {
    paymentAmount?: number;
    rateSchedule?: RateScheduleEntry[];
  }
): PaymentRow[] {
  if (principal <= 0) throw new Error("Principal must be positive");
  if (termMonths <= 0) throw new Error("Term must be positive");
  if (annualRate < 0) throw new Error("Rate cannot be negative");

  const rows: PaymentRow[] = [];
  let balance = principal;

  // Sort rate schedule by month ascending
  const schedule = (options?.rateSchedule ?? []).slice().sort((a, b) => a.fromMonth - b.fromMonth);

  const getRateForMonth = (month: number): number => {
    if (schedule.length === 0) return annualRate;
    let currentRate = annualRate;
    for (const entry of schedule) {
      if (month >= entry.fromMonth) currentRate = entry.rate;
      else break;
    }
    return currentRate;
  };

  for (let month = 1; month <= termMonths; month++) {
    if (balance <= 0.01) break;

    const yearlyRate = getRateForMonth(month);
    const monthlyRate = yearlyRate / 12;

    // Calculate payment based on REMAINING term and current rate
    const remainingMonths = termMonths - month + 1;
    const calculatedPayment =
      monthlyRate === 0
        ? balance / remainingMonths
        : (balance * monthlyRate * Math.pow(1 + monthlyRate, remainingMonths)) /
          (Math.pow(1 + monthlyRate, remainingMonths) - 1);

    const payment = options?.paymentAmount ?? calculatedPayment;
    const interest = balance * monthlyRate;
    let principalPaid = payment - interest;

    // Don't overpay on the final payment
    if (principalPaid > balance) {
      principalPaid = balance;
    }

    const actualPayment = principalPaid + interest;
    balance = round2(balance - principalPaid);

    rows.push({
      month,
      payment: round2(actualPayment),
      principal: round2(principalPaid),
      interest: round2(interest),
      balance: round2(balance),
      rateApplied: yearlyRate,
    });
  }

  return rows;
}

/**
 * Total interest paid over the life of the loan.
 */
export function totalInterestPaid(rows: PaymentRow[]): number {
  return round2(rows.reduce((sum, r) => sum + r.interest, 0));
}

/**
 * Total amount paid (principal + interest).
 */
export function totalAmountPaid(rows: PaymentRow[]): number {
  return round2(rows.reduce((sum, r) => sum + r.payment, 0));
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
