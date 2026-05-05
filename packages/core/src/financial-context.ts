import type { Currency, Debt } from "./types";

/**
 * Aggregated financial state of a user — used as context for the AI advisor.
 *
 * IMPORTANT: This module defines the SHAPE of the context. The data is
 * gathered by the application layer (web app) since this package has no
 * database access. The web app builds this object then passes it here
 * for formatting into a Claude-ready prompt string.
 */

export interface FinancialContext {
  baseCurrency: Currency;
  monthlyIncome: number;
  monthlyExpenses: number;
  monthlyExpensesByCategory: Array<{ category: string; amount: number; percent: number }>;
  budgetMethodology?: "50_30_20" | "70_20_10" | "custom";
  budgetRemainingByCategory?: Array<{ category: string; allocated: number; spent: number; remaining: number }>;
  activeDebts: Array<{
    name: string;
    balance: number;
    annualRate: number;
    minimumPayment: number;
    monthsToPayoff?: number;
  }>;
  totalDebt: number;
  debtToIncomeRatio: number; // 0–1+
  emergencyFundMonths?: number;
  portfolioValue?: number;
  portfolioPnLPercent?: number;
  netWorth: number;
  last3MonthsAvgExpenses?: number;
  userLocale: string;
}

/**
 * Format a FinancialContext into a markdown summary that can be embedded in
 * Claude's system prompt. Designed for prompt caching efficiency.
 */
export function formatContextForAI(ctx: FinancialContext): string {
  const lines: string[] = [];
  const c = (n: number) => `${ctx.baseCurrency} ${n.toFixed(2)}`;
  const pct = (n: number) => `${(n * 100).toFixed(1)}%`;

  lines.push(`# User Financial Context`);
  lines.push(``);
  lines.push(`Base currency: ${ctx.baseCurrency}`);
  lines.push(`Locale: ${ctx.userLocale}`);
  lines.push(``);
  lines.push(`## Income & Expenses (current month)`);
  lines.push(`- Monthly income: ${c(ctx.monthlyIncome)}`);
  lines.push(`- Monthly expenses: ${c(ctx.monthlyExpenses)}`);
  lines.push(`- Net monthly: ${c(ctx.monthlyIncome - ctx.monthlyExpenses)}`);
  if (ctx.last3MonthsAvgExpenses != null) {
    lines.push(`- 3-month average expenses: ${c(ctx.last3MonthsAvgExpenses)}`);
  }

  if (ctx.monthlyExpensesByCategory.length > 0) {
    lines.push(``);
    lines.push(`### Top spending categories this month`);
    for (const cat of ctx.monthlyExpensesByCategory.slice(0, 8)) {
      lines.push(`- ${cat.category}: ${c(cat.amount)} (${cat.percent.toFixed(1)}% of expenses)`);
    }
  }

  if (ctx.budgetRemainingByCategory && ctx.budgetRemainingByCategory.length > 0) {
    lines.push(``);
    lines.push(`### Budget status`);
    if (ctx.budgetMethodology) lines.push(`Methodology: ${ctx.budgetMethodology}`);
    for (const b of ctx.budgetRemainingByCategory) {
      const overUnder = b.remaining < 0 ? "OVER BUDGET" : "remaining";
      lines.push(`- ${b.category}: ${c(b.spent)} spent / ${c(b.allocated)} allocated (${c(Math.abs(b.remaining))} ${overUnder})`);
    }
  }

  lines.push(``);
  lines.push(`## Debts`);
  if (ctx.activeDebts.length === 0) {
    lines.push(`No active debts.`);
  } else {
    lines.push(`Total debt: ${c(ctx.totalDebt)}`);
    lines.push(`Debt-to-income ratio: ${pct(ctx.debtToIncomeRatio)}`);
    for (const debt of ctx.activeDebts) {
      const payoff = debt.monthsToPayoff ? ` — payoff in ${debt.monthsToPayoff} months` : "";
      lines.push(`- ${debt.name}: ${c(debt.balance)} @ ${(debt.annualRate * 100).toFixed(2)}% APR, min ${c(debt.minimumPayment)}/mo${payoff}`);
    }
  }

  lines.push(``);
  lines.push(`## Investments`);
  if (ctx.portfolioValue != null) {
    const pnl = ctx.portfolioPnLPercent != null ? ` (${ctx.portfolioPnLPercent >= 0 ? "+" : ""}${ctx.portfolioPnLPercent.toFixed(2)}%)` : "";
    lines.push(`- Portfolio value: ${c(ctx.portfolioValue)}${pnl}`);
  } else {
    lines.push(`No investment portfolio.`);
  }

  if (ctx.emergencyFundMonths != null) {
    lines.push(`- Emergency fund: ${ctx.emergencyFundMonths.toFixed(1)} months of expenses`);
  }

  lines.push(``);
  lines.push(`## Net Worth`);
  lines.push(`- Estimated net worth: ${c(ctx.netWorth)}`);

  return lines.join("\n");
}
