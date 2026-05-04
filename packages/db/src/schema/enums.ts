import { pgEnum } from "drizzle-orm/pg-core";

export const subscriptionPlanEnum = pgEnum("subscription_plan", [
  "free",
  "personal",
  "family_s",
  "family_m",
]);

export const subscriptionStatusEnum = pgEnum("subscription_status", [
  "active",
  "canceled",
  "past_due",
  "trialing",
  "unpaid",
]);

export const householdRoleEnum = pgEnum("household_role", ["owner", "member"]);

export const invitationChannelEnum = pgEnum("invitation_channel", ["email", "whatsapp"]);

export const invitationStatusEnum = pgEnum("invitation_status", [
  "pending",
  "accepted",
  "expired",
  "revoked",
]);

export const transactionTypeEnum = pgEnum("transaction_type", ["income", "expense", "transfer"]);

export const transactionSourceEnum = pgEnum("transaction_source", [
  "manual",
  "whatsapp",
  "import",
  "api",
]);

export const categoryTypeEnum = pgEnum("category_type", ["income", "expense"]);

export const budgetMethodologyEnum = pgEnum("budget_methodology", [
  "custom",
  "50_30_20",
  "70_20_10",
]);

export const debtTypeEnum = pgEnum("debt_type", [
  "credit_card",
  "personal_loan",
  "mortgage",
  "auto_loan",
  "student_loan",
  "short_term",
  "long_term",
  "other",
]);

export const rateTypeEnum = pgEnum("rate_type", ["fixed", "variable", "mixed"]);

export const paymentFrequencyEnum = pgEnum("payment_frequency", [
  "monthly",
  "biweekly",
  "weekly",
]);

export const investmentTypeEnum = pgEnum("investment_type", [
  "crypto",
  "stock",
  "etf",
  "bond",
  "real_estate",
  "cash",
  "other",
]);

export const localeEnum = pgEnum("locale", [
  "es",
  "en",
  "pt",
  "fr",
  "de",
  "it",
  "pl",
  "ru",
  "ja",
  "zh",
  "ko",
]);
