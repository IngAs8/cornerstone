import { describe, it, expect } from "vitest";
import { avalanche, snowball, compareStrategies } from "./debt-strategies.js";
import type { Debt } from "./types.js";

const sampleDebts: Debt[] = [
  {
    id: "1",
    name: "Credit Card",
    type: "credit_card",
    currentBalance: 5000,
    currency: "USD",
    annualRate: 0.20,
    rateType: "fixed",
    minimumPayment: 150,
    paymentFrequency: "monthly",
  },
  {
    id: "2",
    name: "Auto Loan",
    type: "auto_loan",
    currentBalance: 15000,
    currency: "USD",
    annualRate: 0.06,
    rateType: "fixed",
    minimumPayment: 350,
    paymentFrequency: "monthly",
  },
  {
    id: "3",
    name: "Personal Loan",
    type: "personal_loan",
    currentBalance: 3000,
    currency: "USD",
    annualRate: 0.12,
    rateType: "fixed",
    minimumPayment: 100,
    paymentFrequency: "monthly",
  },
];

describe("debt strategies", () => {
  it("avalanche pays highest-rate debt first", () => {
    const plan = avalanche(sampleDebts, 500);

    // Credit card (20%) should be paid off first
    expect(plan.payoffOrder[0]).toBe("1");
  });

  it("snowball pays smallest balance first", () => {
    const plan = snowball(sampleDebts, 500);

    // Personal loan ($3000) should be paid off first
    expect(plan.payoffOrder[0]).toBe("3");
  });

  it("avalanche generally results in less interest paid than snowball", () => {
    const comparison = compareStrategies(sampleDebts, 500);

    expect(comparison.avalanche.totalInterestPaid).toBeLessThanOrEqual(
      comparison.snowball.totalInterestPaid
    );
    expect(comparison.savingsWithAvalanche).toBeGreaterThanOrEqual(0);
  });

  it("both methods eventually pay off all debts", () => {
    const av = avalanche(sampleDebts, 500);
    const sb = snowball(sampleDebts, 500);

    expect(av.payoffOrder).toHaveLength(3);
    expect(sb.payoffOrder).toHaveLength(3);
    expect(av.monthsToDebtFree).toBeLessThan(600);
    expect(sb.monthsToDebtFree).toBeLessThan(600);
  });
});
