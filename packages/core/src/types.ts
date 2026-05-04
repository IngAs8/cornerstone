/**
 * Shared types for financial calculations.
 * Pure types — no runtime code.
 */

export type Currency = string; // ISO 4217 (USD, EUR, COP, etc.)

export type RateType = "fixed" | "variable" | "mixed";

export type DebtType =
  | "credit_card"
  | "personal_loan"
  | "mortgage"
  | "auto_loan"
  | "student_loan"
  | "short_term"
  | "long_term"
  | "other";

export type PaymentFrequency = "monthly" | "biweekly" | "weekly";

export type AssetType =
  | "crypto"
  | "stock"
  | "etf"
  | "bond"
  | "real_estate"
  | "cash"
  | "other";

export type TransactionType = "income" | "expense" | "transfer";

export type BudgetMethodology = "custom" | "50_30_20" | "70_20_10";

export interface RateScheduleEntry {
  fromMonth: number; // months from start
  rate: number;     // annual rate (e.g., 0.075 = 7.5%)
}

export interface Debt {
  id: string;
  name: string;
  type: DebtType;
  currentBalance: number;
  currency: Currency;
  annualRate: number;
  rateType: RateType;
  rateSchedule?: RateScheduleEntry[];
  minimumPayment: number;
  paymentFrequency: PaymentFrequency;
  termMonths?: number;
}

export interface PaymentRow {
  month: number;
  date?: Date;
  payment: number;
  principal: number;
  interest: number;
  balance: number;
  rateApplied: number;
}

export interface CategoryExpense {
  categoryId: string;
  categoryName: string;
  type: "needs" | "wants" | "savings";
  amount: number;
}

export interface Asset {
  id: string;
  symbol: string;
  type: AssetType;
  quantity: number;
  averageCost: number;
  currency: Currency;
}

export interface PriceData {
  symbol: string;
  price: number;
  currency: Currency;
  change24h?: number;
}

export interface ExchangeRate {
  base: Currency;
  target: Currency;
  rate: number;
  date: Date;
}
