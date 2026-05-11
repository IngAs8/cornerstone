-- ─── Banks ────────────────────────────────────────────────────────────────────
CREATE TABLE "banks" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "household_id" uuid NOT NULL REFERENCES "households"("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "color" varchar(7),
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- ─── Accounts ─────────────────────────────────────────────────────────────────
CREATE TYPE "account_type" AS ENUM (
  'checking', 'savings', 'credit_card', 'cash', 'other'
);

CREATE TABLE "accounts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "household_id" uuid NOT NULL REFERENCES "households"("id") ON DELETE CASCADE,
  "bank_id" uuid REFERENCES "banks"("id") ON DELETE SET NULL,
  "name" text NOT NULL,
  "type" "account_type" NOT NULL DEFAULT 'checking',
  "currency" varchar(3) NOT NULL DEFAULT 'USD',
  "current_balance" numeric(14, 2) NOT NULL DEFAULT 0,
  -- Credit card specific
  "credit_limit" numeric(14, 2),
  "payment_due_day" smallint,        -- day of month (1-31)
  "minimum_payment" numeric(14, 2),
  -- State
  "is_active" boolean NOT NULL DEFAULT true,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- ─── Add account_id to transactions ───────────────────────────────────────────
ALTER TABLE "transactions"
  ADD COLUMN "account_id" uuid REFERENCES "accounts"("id") ON DELETE SET NULL;

-- ─── Recurring payments ───────────────────────────────────────────────────────
CREATE TYPE "recurrence_frequency" AS ENUM (
  'weekly', 'biweekly', 'monthly', 'quarterly', 'yearly'
);

CREATE TABLE "recurring_payments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "household_id" uuid NOT NULL REFERENCES "households"("id") ON DELETE CASCADE,
  "account_id" uuid REFERENCES "accounts"("id") ON DELETE SET NULL,
  "category_id" uuid REFERENCES "categories"("id") ON DELETE SET NULL,
  "name" text NOT NULL,
  "amount" numeric(14, 2) NOT NULL,
  "currency" varchar(3) NOT NULL DEFAULT 'USD',
  "frequency" "recurrence_frequency" NOT NULL DEFAULT 'monthly',
  "next_date" date NOT NULL,
  "is_active" boolean NOT NULL DEFAULT true,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- ─── Indexes ──────────────────────────────────────────────────────────────────
CREATE INDEX "idx_accounts_household" ON "accounts"("household_id");
CREATE INDEX "idx_accounts_bank" ON "accounts"("bank_id");
CREATE INDEX "idx_recurring_household" ON "recurring_payments"("household_id");
CREATE INDEX "idx_recurring_next_date" ON "recurring_payments"("next_date");

-- ─── RLS ──────────────────────────────────────────────────────────────────────
ALTER TABLE "banks" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "accounts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "recurring_payments" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "banks_select" ON "banks" FOR SELECT
  USING (household_id IN (SELECT public.user_household_ids()));

CREATE POLICY "banks_insert" ON "banks" FOR INSERT
  WITH CHECK (household_id IN (SELECT public.user_household_ids()));

CREATE POLICY "banks_update" ON "banks" FOR UPDATE
  USING (household_id IN (SELECT public.user_household_ids()));

CREATE POLICY "banks_delete" ON "banks" FOR DELETE
  USING (household_id IN (SELECT public.user_household_ids()));

CREATE POLICY "accounts_select" ON "accounts" FOR SELECT
  USING (household_id IN (SELECT public.user_household_ids()));

CREATE POLICY "accounts_insert" ON "accounts" FOR INSERT
  WITH CHECK (household_id IN (SELECT public.user_household_ids()));

CREATE POLICY "accounts_update" ON "accounts" FOR UPDATE
  USING (household_id IN (SELECT public.user_household_ids()));

CREATE POLICY "accounts_delete" ON "accounts" FOR DELETE
  USING (household_id IN (SELECT public.user_household_ids()));

CREATE POLICY "recurring_select" ON "recurring_payments" FOR SELECT
  USING (household_id IN (SELECT public.user_household_ids()));

CREATE POLICY "recurring_insert" ON "recurring_payments" FOR INSERT
  WITH CHECK (household_id IN (SELECT public.user_household_ids()));

CREATE POLICY "recurring_update" ON "recurring_payments" FOR UPDATE
  USING (household_id IN (SELECT public.user_household_ids()));

CREATE POLICY "recurring_delete" ON "recurring_payments" FOR DELETE
  USING (household_id IN (SELECT public.user_household_ids()));
