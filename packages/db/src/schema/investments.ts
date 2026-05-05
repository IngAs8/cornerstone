import {
  pgTable,
  uuid,
  text,
  timestamp,
  varchar,
  numeric,
  index,
  date,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { investmentTypeEnum } from "./enums";
import { households } from "./users";

/**
 * A logical grouping of assets (e.g., "Crypto Portfolio", "Retirement").
 */
export const investments = pgTable("investments", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  householdId: uuid("household_id").notNull().references(() => households.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().default(sql`now()`),
});

/**
 * Individual assets held within an investment.
 */
export const investmentAssets = pgTable(
  "investment_assets",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    investmentId: uuid("investment_id").notNull().references(() => investments.id, { onDelete: "cascade" }),
    symbol: text("symbol").notNull(), // BTC, AAPL, VOO, etc.
    type: investmentTypeEnum("type").notNull(),
    quantity: numeric("quantity", { precision: 28, scale: 8 }).notNull(),
    averageCost: numeric("average_cost", { precision: 19, scale: 4 }).notNull(),
    currency: varchar("currency", { length: 3 }).notNull(),
    exchange: text("exchange"), // Binance, NYSE, NASDAQ, etc.
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().default(sql`now()`),
  },
  (t) => ({
    symbolIdx: index("idx_investment_assets_symbol").on(t.symbol),
    investmentIdx: index("idx_investment_assets_investment").on(t.investmentId),
  })
);

/**
 * Cache of asset prices, refreshed periodically by edge functions.
 * Key by symbol — global cache shared across all users.
 */
export const assetPrices = pgTable("asset_prices", {
  symbol: text("symbol").primaryKey(),
  type: investmentTypeEnum("type").notNull(),
  priceUsd: numeric("price_usd", { precision: 28, scale: 8 }).notNull(),
  change24hPercent: numeric("change_24h_percent", { precision: 10, scale: 4 }),
  marketCap: numeric("market_cap", { precision: 24, scale: 2 }),
  lastUpdatedAt: timestamp("last_updated_at", { withTimezone: true }).notNull().default(sql`now()`),
});

/**
 * Historical exchange rates between fiat currencies.
 */
export const exchangeRates = pgTable(
  "exchange_rates",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    baseCurrency: varchar("base_currency", { length: 3 }).notNull(),
    targetCurrency: varchar("target_currency", { length: 3 }).notNull(),
    rate: numeric("rate", { precision: 24, scale: 8 }).notNull(),
    date: date("date").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
  },
  (t) => ({
    pairDateIdx: index("idx_exchange_rates_pair_date").on(t.baseCurrency, t.targetCurrency, t.date),
  })
);
