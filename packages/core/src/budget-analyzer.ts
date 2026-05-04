import type { CategoryExpense } from "./types.js";

export interface BudgetHealth {
  needs: BucketStatus;
  wants: BucketStatus;
  savings: BucketStatus;
  totalIncome: number;
  totalExpenses: number;
  remaining: number;
  health: "good" | "warning" | "critical";
  healthScore: number; // 0-100
}

export interface BucketStatus {
  allocated: number;
  actual: number;
  percentOfIncome: number;
  difference: number; // negative = over budget
}

export interface BudgetSuggestion {
  needs: SuggestedCategory[];
  wants: SuggestedCategory[];
  savings: SuggestedCategory[];
  totalAllocated: number;
}

export interface SuggestedCategory {
  name: string;
  amount: number;
  percentOfIncome: number;
}

/**
 * Analyze budget against the 50/30/20 rule.
 * 50% needs, 30% wants, 20% savings.
 */
export function analyze503020(
  monthlyIncome: number,
  expenses: CategoryExpense[]
): BudgetHealth {
  if (monthlyIncome <= 0) {
    throw new Error("Monthly income must be positive");
  }

  const needs = expenses.filter((e) => e.type === "needs");
  const wants = expenses.filter((e) => e.type === "wants");
  const savings = expenses.filter((e) => e.type === "savings");

  const needsActual = sumAmounts(needs);
  const wantsActual = sumAmounts(wants);
  const savingsActual = sumAmounts(savings);
  const totalExpenses = needsActual + wantsActual + savingsActual;

  const needsAllocated = monthlyIncome * 0.5;
  const wantsAllocated = monthlyIncome * 0.3;
  const savingsAllocated = monthlyIncome * 0.2;

  const status = (allocated: number, actual: number): BucketStatus => ({
    allocated: round2(allocated),
    actual: round2(actual),
    percentOfIncome: round2((actual / monthlyIncome) * 100),
    difference: round2(allocated - actual),
  });

  // Health score: 100 if perfectly balanced, deduct for overruns
  let healthScore = 100;
  if (needsActual > needsAllocated) healthScore -= 20;
  if (wantsActual > wantsAllocated) healthScore -= 15;
  if (savingsActual < savingsAllocated * 0.5) healthScore -= 20;
  if (totalExpenses > monthlyIncome) healthScore -= 30;
  healthScore = Math.max(0, healthScore);

  const health: BudgetHealth["health"] =
    healthScore >= 80 ? "good" : healthScore >= 50 ? "warning" : "critical";

  return {
    needs: status(needsAllocated, needsActual),
    wants: status(wantsAllocated, wantsActual),
    savings: status(savingsAllocated, savingsActual),
    totalIncome: round2(monthlyIncome),
    totalExpenses: round2(totalExpenses),
    remaining: round2(monthlyIncome - totalExpenses),
    health,
    healthScore,
  };
}

/**
 * Suggest a budget breakdown using the 50/30/20 method.
 * Returns common categories with suggested amounts.
 */
export function suggestBudget503020(monthlyIncome: number): BudgetSuggestion {
  if (monthlyIncome <= 0) throw new Error("Income must be positive");

  const needs: SuggestedCategory[] = [
    { name: "Housing / Rent", amount: monthlyIncome * 0.25, percentOfIncome: 25 },
    { name: "Utilities", amount: monthlyIncome * 0.05, percentOfIncome: 5 },
    { name: "Groceries", amount: monthlyIncome * 0.10, percentOfIncome: 10 },
    { name: "Transportation", amount: monthlyIncome * 0.07, percentOfIncome: 7 },
    { name: "Insurance", amount: monthlyIncome * 0.03, percentOfIncome: 3 },
  ];

  const wants: SuggestedCategory[] = [
    { name: "Dining Out", amount: monthlyIncome * 0.08, percentOfIncome: 8 },
    { name: "Entertainment", amount: monthlyIncome * 0.07, percentOfIncome: 7 },
    { name: "Shopping", amount: monthlyIncome * 0.10, percentOfIncome: 10 },
    { name: "Hobbies", amount: monthlyIncome * 0.05, percentOfIncome: 5 },
  ];

  const savings: SuggestedCategory[] = [
    { name: "Emergency Fund", amount: monthlyIncome * 0.10, percentOfIncome: 10 },
    { name: "Investments", amount: monthlyIncome * 0.07, percentOfIncome: 7 },
    { name: "Long-term Goals", amount: monthlyIncome * 0.03, percentOfIncome: 3 },
  ];

  const round = (cats: SuggestedCategory[]) =>
    cats.map((c) => ({ ...c, amount: round2(c.amount) }));

  const all = [...needs, ...wants, ...savings];
  const totalAllocated = round2(all.reduce((sum, c) => sum + c.amount, 0));

  return {
    needs: round(needs),
    wants: round(wants),
    savings: round(savings),
    totalAllocated,
  };
}

function sumAmounts(items: CategoryExpense[]): number {
  return items.reduce((sum, item) => sum + item.amount, 0);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
