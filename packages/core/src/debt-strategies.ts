import type { Debt } from "./types.js";

export interface PayoffStep {
  month: number;
  debtId: string;
  debtName: string;
  paymentApplied: number;
  remainingBalance: number;
}

export interface PayoffPlan {
  steps: PayoffStep[];
  monthsToDebtFree: number;
  totalInterestPaid: number;
  totalPaid: number;
  payoffOrder: string[]; // debt IDs in order paid
}

export interface StrategyComparison {
  avalanche: PayoffPlan;
  snowball: PayoffPlan;
  savingsWithAvalanche: number; // interest saved vs snowball
  fasterByMonths: number;       // months saved (negative if avalanche slower)
  recommendation: "avalanche" | "snowball" | "either";
}

/**
 * Avalanche method: pay minimums on all debts, throw extra at the HIGHEST rate first.
 * Mathematically optimal — minimizes total interest paid.
 */
export function avalanche(debts: Debt[], extraPaymentPerMonth: number): PayoffPlan {
  return simulatePayoff(debts, extraPaymentPerMonth, (a, b) => b.annualRate - a.annualRate);
}

/**
 * Snowball method: pay minimums on all debts, throw extra at the SMALLEST balance first.
 * Psychologically motivating — quick wins.
 */
export function snowball(debts: Debt[], extraPaymentPerMonth: number): PayoffPlan {
  return simulatePayoff(debts, extraPaymentPerMonth, (a, b) => a.currentBalance - b.currentBalance);
}

/**
 * Compare avalanche vs snowball strategies.
 */
export function compareStrategies(debts: Debt[], extraPayment: number): StrategyComparison {
  const av = avalanche(debts, extraPayment);
  const sb = snowball(debts, extraPayment);
  const savings = round2(sb.totalInterestPaid - av.totalInterestPaid);
  const monthsDiff = sb.monthsToDebtFree - av.monthsToDebtFree;

  let recommendation: StrategyComparison["recommendation"] = "either";
  if (savings > 100) recommendation = "avalanche";
  else if (savings < -100) recommendation = "snowball";

  return {
    avalanche: av,
    snowball: sb,
    savingsWithAvalanche: savings,
    fasterByMonths: monthsDiff,
    recommendation,
  };
}

function simulatePayoff(
  debts: Debt[],
  extraPaymentPerMonth: number,
  ordering: (a: Debt, b: Debt) => number
): PayoffPlan {
  // Clone debts (immutable input)
  const working = debts.map((d) => ({ ...d, balance: d.currentBalance }));
  const steps: PayoffStep[] = [];
  const payoffOrder: string[] = [];
  let totalInterest = 0;
  let totalPaid = 0;
  let month = 0;
  const MAX_MONTHS = 600; // 50 years safety limit

  while (working.some((d) => d.balance > 0.01) && month < MAX_MONTHS) {
    month++;

    // Step 1: accrue interest on all active debts
    for (const debt of working) {
      if (debt.balance > 0.01) {
        const monthlyRate = debt.annualRate / 12;
        const interest = debt.balance * monthlyRate;
        debt.balance += interest;
        totalInterest += interest;
      }
    }

    // Step 2: apply minimum payments to all
    let availableExtra = extraPaymentPerMonth;
    for (const debt of working) {
      if (debt.balance > 0.01) {
        const payment = Math.min(debt.minimumPayment, debt.balance);
        debt.balance -= payment;
        totalPaid += payment;
      } else if (debt.balance > 0) {
        // Add freed minimum to extra (debt avalanche/snowball cascade)
        availableExtra += debt.minimumPayment;
      }
    }

    // Add minimum payments of fully-paid debts to available extra
    for (const debt of working) {
      if (debt.balance <= 0.01 && !payoffOrder.includes(debt.id)) {
        // already paid this month or before
      }
    }

    // Step 3: throw extra at the priority debt (per ordering)
    const targets = working.filter((d) => d.balance > 0.01).sort(ordering);
    if (targets.length > 0 && availableExtra > 0) {
      const target = targets[0]!;
      const extraApplied = Math.min(availableExtra, target.balance);
      target.balance -= extraApplied;
      totalPaid += extraApplied;

      steps.push({
        month,
        debtId: target.id,
        debtName: target.name,
        paymentApplied: round2(target.minimumPayment + extraApplied),
        remainingBalance: round2(target.balance),
      });
    }

    // Track newly paid-off debts
    for (const debt of working) {
      if (debt.balance <= 0.01 && !payoffOrder.includes(debt.id)) {
        payoffOrder.push(debt.id);
      }
    }
  }

  return {
    steps,
    monthsToDebtFree: month,
    totalInterestPaid: round2(totalInterest),
    totalPaid: round2(totalPaid),
    payoffOrder,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
