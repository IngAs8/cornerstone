import {
  pgTable,
  uuid,
  text,
  timestamp,
  varchar,
  numeric,
  date,
  boolean,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { debtTypeEnum, rateTypeEnum, paymentFrequencyEnum } from "./enums";
import { households } from "./users";

/**
 * Debts — short or long term liabilities.
 * Supports fixed and variable interest rates via `rateSchedule` JSONB.
 */
export const debts = pgTable(
  "debts",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    householdId: uuid("household_id").notNull().references(() => households.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    type: debtTypeEnum("type").notNull(),
    originalAmount: numeric("original_amount", { precision: 19, scale: 4 }).notNull(),
    currentBalance: numeric("current_balance", { precision: 19, scale: 4 }).notNull(),
    currency: varchar("currency", { length: 3 }).notNull(),
    annualRate: numeric("annual_rate", { precision: 8, scale: 6 }).notNull(),
    rateType: rateTypeEnum("rate_type").notNull().default("fixed"),
    rateSchedule: jsonb("rate_schedule"), // [{fromMonth: number, rate: number}]
    minimumPayment: numeric("minimum_payment", { precision: 19, scale: 4 }).notNull(),
    paymentFrequency: paymentFrequencyEnum("payment_frequency").notNull().default("monthly"),
    startDate: date("start_date").notNull(),
    endDate: date("end_date"),
    termMonths: numeric("term_months", { precision: 5, scale: 0 }),
    lender: text("lender"),
    notes: text("notes"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().default(sql`now()`),
  },
  (t) => ({
    householdActiveIdx: index("idx_debts_household_active").on(t.householdId, t.isActive),
  })
);

/**
 * Payment history for a debt.
 */
export const debtPayments = pgTable("debt_payments", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  debtId: uuid("debt_id").notNull().references(() => debts.id, { onDelete: "cascade" }),
  amount: numeric("amount", { precision: 19, scale: 4 }).notNull(),
  date: date("date").notNull(),
  principalPortion: numeric("principal_portion", { precision: 19, scale: 4 }),
  interestPortion: numeric("interest_portion", { precision: 19, scale: 4 }),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
});
