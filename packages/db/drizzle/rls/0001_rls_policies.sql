-- ════════════════════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ════════════════════════════════════════════════════════════════════════════
-- Strategy: Every table with household_id is restricted so only members of
-- that household can read/write their data. Personal-only tables (AI chats,
-- WhatsApp sessions) are restricted to the owning user. Reference tables
-- (asset_prices, exchange_rates) are publicly readable.

-- ── Helper: fetch the household IDs the current user belongs to ─────────────
CREATE OR REPLACE FUNCTION public.user_household_ids()
RETURNS SETOF UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT household_id
  FROM public.household_members
  WHERE user_id = auth.uid()
$$;

GRANT EXECUTE ON FUNCTION public.user_household_ids() TO authenticated;

-- ── Helper: fetch the household ID the current user owns ────────────────────
CREATE OR REPLACE FUNCTION public.user_owned_household_id()
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.households WHERE owner_id = auth.uid() LIMIT 1
$$;

GRANT EXECUTE ON FUNCTION public.user_owned_household_id() TO authenticated;

-- ════════════════════════════════════════════════════════════════════════════
-- ENABLE RLS ON ALL TABLES
-- ════════════════════════════════════════════════════════════════════════════
ALTER TABLE public.users                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.households             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.household_members      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.household_invitations  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budgets                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_items           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.debts                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.debt_payments          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investments            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investment_assets      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_conversations       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_sessions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_prices           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exchange_rates         ENABLE ROW LEVEL SECURITY;

-- ════════════════════════════════════════════════════════════════════════════
-- USERS — each user can only see/update their own profile
-- ════════════════════════════════════════════════════════════════════════════
CREATE POLICY "users_self_select" ON public.users
  FOR SELECT TO authenticated
  USING (id = auth.uid());

CREATE POLICY "users_self_update" ON public.users
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- INSERT happens via trigger on auth.users (handled separately)
-- DELETE not allowed via RLS (cascade from auth.users)

-- ════════════════════════════════════════════════════════════════════════════
-- HOUSEHOLDS — members can read; only owner can update
-- ════════════════════════════════════════════════════════════════════════════
CREATE POLICY "households_member_select" ON public.households
  FOR SELECT TO authenticated
  USING (id IN (SELECT public.user_household_ids()));

CREATE POLICY "households_owner_update" ON public.households
  FOR UPDATE TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "households_owner_insert" ON public.households
  FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "households_owner_delete" ON public.households
  FOR DELETE TO authenticated
  USING (owner_id = auth.uid());

-- ════════════════════════════════════════════════════════════════════════════
-- HOUSEHOLD MEMBERS — members can see all members in their household
-- ════════════════════════════════════════════════════════════════════════════
CREATE POLICY "household_members_select" ON public.household_members
  FOR SELECT TO authenticated
  USING (household_id IN (SELECT public.user_household_ids()));

-- Insert: only household owner can add members
CREATE POLICY "household_members_owner_insert" ON public.household_members
  FOR INSERT TO authenticated
  WITH CHECK (
    household_id IN (
      SELECT id FROM public.households WHERE owner_id = auth.uid()
    )
    OR user_id = auth.uid()  -- self-add via accepted invitation flow
  );

-- Delete: owner can remove anyone; members can remove themselves
CREATE POLICY "household_members_delete" ON public.household_members
  FOR DELETE TO authenticated
  USING (
    user_id = auth.uid()
    OR household_id IN (
      SELECT id FROM public.households WHERE owner_id = auth.uid()
    )
  );

-- ════════════════════════════════════════════════════════════════════════════
-- HOUSEHOLD INVITATIONS — only owner can create/view; invited user can update
-- ════════════════════════════════════════════════════════════════════════════
CREATE POLICY "invitations_owner_all" ON public.household_invitations
  FOR ALL TO authenticated
  USING (
    household_id IN (
      SELECT id FROM public.households WHERE owner_id = auth.uid()
    )
  )
  WITH CHECK (
    household_id IN (
      SELECT id FROM public.households WHERE owner_id = auth.uid()
    )
  );

-- ════════════════════════════════════════════════════════════════════════════
-- CATEGORIES — household-scoped; system categories (household_id NULL) public
-- ════════════════════════════════════════════════════════════════════════════
CREATE POLICY "categories_select" ON public.categories
  FOR SELECT TO authenticated
  USING (
    household_id IS NULL
    OR household_id IN (SELECT public.user_household_ids())
  );

CREATE POLICY "categories_member_write" ON public.categories
  FOR ALL TO authenticated
  USING (household_id IN (SELECT public.user_household_ids()))
  WITH CHECK (household_id IN (SELECT public.user_household_ids()));

-- ════════════════════════════════════════════════════════════════════════════
-- TRANSACTIONS — household members can read/write all
-- ════════════════════════════════════════════════════════════════════════════
CREATE POLICY "transactions_member_all" ON public.transactions
  FOR ALL TO authenticated
  USING (household_id IN (SELECT public.user_household_ids()))
  WITH CHECK (household_id IN (SELECT public.user_household_ids()));

-- ════════════════════════════════════════════════════════════════════════════
-- BUDGETS & BUDGET_ITEMS
-- ════════════════════════════════════════════════════════════════════════════
CREATE POLICY "budgets_member_all" ON public.budgets
  FOR ALL TO authenticated
  USING (household_id IN (SELECT public.user_household_ids()))
  WITH CHECK (household_id IN (SELECT public.user_household_ids()));

CREATE POLICY "budget_items_member_all" ON public.budget_items
  FOR ALL TO authenticated
  USING (
    budget_id IN (
      SELECT id FROM public.budgets
      WHERE household_id IN (SELECT public.user_household_ids())
    )
  )
  WITH CHECK (
    budget_id IN (
      SELECT id FROM public.budgets
      WHERE household_id IN (SELECT public.user_household_ids())
    )
  );

-- ════════════════════════════════════════════════════════════════════════════
-- DEBTS & DEBT_PAYMENTS
-- ════════════════════════════════════════════════════════════════════════════
CREATE POLICY "debts_member_all" ON public.debts
  FOR ALL TO authenticated
  USING (household_id IN (SELECT public.user_household_ids()))
  WITH CHECK (household_id IN (SELECT public.user_household_ids()));

CREATE POLICY "debt_payments_member_all" ON public.debt_payments
  FOR ALL TO authenticated
  USING (
    debt_id IN (
      SELECT id FROM public.debts
      WHERE household_id IN (SELECT public.user_household_ids())
    )
  )
  WITH CHECK (
    debt_id IN (
      SELECT id FROM public.debts
      WHERE household_id IN (SELECT public.user_household_ids())
    )
  );

-- ════════════════════════════════════════════════════════════════════════════
-- INVESTMENTS & ASSETS
-- ════════════════════════════════════════════════════════════════════════════
CREATE POLICY "investments_member_all" ON public.investments
  FOR ALL TO authenticated
  USING (household_id IN (SELECT public.user_household_ids()))
  WITH CHECK (household_id IN (SELECT public.user_household_ids()));

CREATE POLICY "investment_assets_member_all" ON public.investment_assets
  FOR ALL TO authenticated
  USING (
    investment_id IN (
      SELECT id FROM public.investments
      WHERE household_id IN (SELECT public.user_household_ids())
    )
  )
  WITH CHECK (
    investment_id IN (
      SELECT id FROM public.investments
      WHERE household_id IN (SELECT public.user_household_ids())
    )
  );

-- ════════════════════════════════════════════════════════════════════════════
-- SUBSCRIPTIONS — read-only for members; only service role writes
-- ════════════════════════════════════════════════════════════════════════════
CREATE POLICY "subscriptions_member_select" ON public.subscriptions
  FOR SELECT TO authenticated
  USING (household_id IN (SELECT public.user_household_ids()));

-- INSERT/UPDATE/DELETE only via service_role (Stripe webhook)

-- ════════════════════════════════════════════════════════════════════════════
-- AI CONVERSATIONS — strictly per-user, never shared across household
-- ════════════════════════════════════════════════════════════════════════════
CREATE POLICY "ai_conversations_self_all" ON public.ai_conversations
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ════════════════════════════════════════════════════════════════════════════
-- WHATSAPP SESSIONS — strictly per-user
-- ════════════════════════════════════════════════════════════════════════════
CREATE POLICY "whatsapp_sessions_self_all" ON public.whatsapp_sessions
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ════════════════════════════════════════════════════════════════════════════
-- REFERENCE TABLES — publicly readable for all authenticated users
-- ════════════════════════════════════════════════════════════════════════════
CREATE POLICY "asset_prices_public_select" ON public.asset_prices
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "exchange_rates_public_select" ON public.exchange_rates
  FOR SELECT TO authenticated
  USING (true);

-- INSERT/UPDATE/DELETE on reference tables only via service_role (cron jobs)
