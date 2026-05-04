import {
  pgTable,
  uuid,
  text,
  timestamp,
  varchar,
  numeric,
  date,
  index,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { transactionTypeEnum, transactionSourceEnum, categoryTypeEnum } from "./enums.js";
import { households, users } from "./users.js";

/**
 * Categories — both system-default and household-custom.
 * If householdId is null → global system category (everyone sees).
 */
export const categories = pgTable("categories", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  householdId: uuid("household_id").references(() => households.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  icon: text("icon"), // Lucide icon name
  color: varchar("color", { length: 7 }), // hex
  type: categoryTypeEnum("type").notNull(),
  bucket: text("bucket"), // 'needs', 'wants', 'savings' for 50/30/20
  parentId: uuid("parent_id"),
  sortOrder: text("sort_order"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
});

/**
 * Transactions — income, expenses, transfers.
 * Always has BOTH the original currency/amount AND amount converted to base currency.
 */
export const transactions = pgTable(
  "transactions",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    householdId: uuid("household_id").notNull().references(() => households.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull().references(() => users.id),
    type: transactionTypeEnum("type").notNull(),
    amount: numeric("amount", { precision: 19, scale: 4 }).notNull(),
    currency: varchar("currency", { length: 3 }).notNull(),
    amountBase: numeric("amount_base", { precision: 19, scale: 4 }).notNull(),
    baseCurrency: varchar("base_currency", { length: 3 }).notNull(),
    exchangeRate: numeric("exchange_rate", { precision: 20, scale: 8 }),
    categoryId: uuid("category_id").references(() => categories.id),
    description: text("description"),
    date: date("date").notNull(),
    source: transactionSourceEnum("source").notNull().default("manual"),
    metadata: text("metadata"), // JSON for extras (whatsapp message id, etc.)
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().default(sql`now()`),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => ({
    householdDateIdx: index("idx_tx_household_date").on(t.householdId, t.date),
    householdCategoryIdx: index("idx_tx_household_category").on(t.householdId, t.categoryId),
    userIdx: index("idx_tx_user").on(t.userId),
  })
);
