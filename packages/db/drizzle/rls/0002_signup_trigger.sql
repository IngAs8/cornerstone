-- ════════════════════════════════════════════════════════════════════════════
-- SIGNUP TRIGGER
-- ════════════════════════════════════════════════════════════════════════════
-- When Supabase Auth creates a row in auth.users, this trigger:
--   1. Inserts a corresponding row in public.users
--   2. Creates a personal household owned by the new user
--   3. Inserts the user as the household owner in household_members
-- This guarantees every authenticated user has a usable account state.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_household_id UUID;
  user_full_name TEXT;
BEGIN
  -- Extract optional full_name from auth metadata
  user_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', '');

  -- 1. Insert public.users row
  INSERT INTO public.users (id, email, full_name, base_currency, locale)
  VALUES (
    NEW.id,
    NEW.email,
    NULLIF(user_full_name, ''),
    'USD',
    'en'
  )
  ON CONFLICT (id) DO NOTHING;

  -- 2. Create personal household
  INSERT INTO public.households (name, owner_id, subscription_plan, max_members, base_currency)
  VALUES (
    COALESCE(NULLIF(user_full_name, ''), 'Personal') || '''s Household',
    NEW.id,
    'free',
    1,
    'USD'
  )
  RETURNING id INTO new_household_id;

  -- 3. Add user as household owner
  INSERT INTO public.household_members (household_id, user_id, role)
  VALUES (new_household_id, NEW.id, 'owner');

  RETURN NEW;
END;
$$;

-- Drop existing trigger if present (idempotent re-runs)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();
