import {
  pgTable,
  uuid,
  timestamp,
  varchar,
  numeric,
  date,
  unique,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { budgetMethodologyEnum } from "./enums";
import { households } from "./users";
import { categories } from "./transactions";

/**
 * Monthly budgets per household.
 * `month` is the first day of the month (e.g., 2026-05-01).
 */
export const budgets = pgTable(
  "budgets",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    householdId: uuid("household_id").notNull().references(() => households.id, { onDelete: "cascade" }),
    month: date("month").notNull(),
    methodology: budgetMethodologyEnum("methodology").notNull().default("custom"),
    totalIncomeExpected: numeric("total_income_expected", { precision: 19, scale: 4 }).notNull(),
    currency: varchar("currency", { length: 3 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().default(sql`now()`),
  },
  (t) => ({
    householdMonthUnique: unique("uniq_budget_household_month").on(t.householdId, t.month),
  })
);

/**
 * Allocations per category within a budget.
 */
export const budgetItems = pgTable("budget_items", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  budgetId: uuid("budget_id").notNull().references(() => budgets.id, { onDelete: "cascade" }),
  categoryId: uuid("category_id").notNull().references(() => categories.id),
  allocatedAmount: numeric("allocated_amount", { precision: 19, scale: 4 }).notNull(),
});
