import { describe, it, expect } from "vitest";
import {
  calculateAmortizationTable,
  totalInterestPaid,
  totalAmountPaid,
} from "./amortization.js";

describe("calculateAmortizationTable", () => {
  it("calculates a simple fixed-rate loan correctly", () => {
    // $10,000 loan @ 6% APR over 12 months
    const rows = calculateAmortizationTable(10000, 0.06, 12);

    expect(rows).toHaveLength(12);
    expect(rows[0]?.balance).toBeLessThan(10000);
    expect(rows[11]?.balance).toBeCloseTo(0, 1);

    // Total interest should be reasonable (~$330 for this scenario)
    const interest = totalInterestPaid(rows);
    expect(interest).toBeGreaterThan(300);
    expect(interest).toBeLessThan(400);
  });

  it("handles zero interest rate", () => {
    const rows = calculateAmortizationTable(1200, 0, 12);
    expect(rows).toHaveLength(12);
    expect(rows[0]?.payment).toBeCloseTo(100, 0);
    expect(totalInterestPaid(rows)).toBe(0);
    expect(totalAmountPaid(rows)).toBeCloseTo(1200, 0);
  });

  it("supports variable rates via rateSchedule", () => {
    // 7% for first 6 months, then 9%
    const rows = calculateAmortizationTable(10000, 0.07, 24, {
      rateSchedule: [
        { fromMonth: 1, rate: 0.07 },
        { fromMonth: 7, rate: 0.09 },
      ],
    });

    expect(rows[0]?.rateApplied).toBeCloseTo(0.07, 4);
    expect(rows[6]?.rateApplied).toBeCloseTo(0.09, 4);
  });

  it("rejects invalid input", () => {
    expect(() => calculateAmortizationTable(-100, 0.05, 12)).toThrow();
    expect(() => calculateAmortizationTable(1000, -0.01, 12)).toThrow();
    expect(() => calculateAmortizationTable(1000, 0.05, 0)).toThrow();
  });
});
