-- ════════════════════════════════════════════════════════════════════════════
-- Fix cascading deletes for household ownership
-- ════════════════════════════════════════════════════════════════════════════
-- Without this, deleting a public.users row (via auth.users cascade) fails
-- because households.owner_id still references it. Add ON DELETE CASCADE so
-- deleting a user also drops their owned household and (via existing
-- household cascade) all the household's data.
--
-- Same for transactions.user_id (otherwise the user can never be deleted
-- once they have a transaction).

ALTER TABLE public.households
  DROP CONSTRAINT IF EXISTS households_owner_id_users_id_fk;

ALTER TABLE public.households
  ADD CONSTRAINT households_owner_id_users_id_fk
  FOREIGN KEY (owner_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE public.transactions
  DROP CONSTRAINT IF EXISTS transactions_user_id_users_id_fk;

ALTER TABLE public.transactions
  ADD CONSTRAINT transactions_user_id_users_id_fk
  FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE public.household_invitations
  DROP CONSTRAINT IF EXISTS household_invitations_invited_by_user_id_users_id_fk;

ALTER TABLE public.household_invitations
  ADD CONSTRAINT household_invitations_invited_by_user_id_users_id_fk
  FOREIGN KEY (invited_by_user_id) REFERENCES public.users(id) ON DELETE CASCADE;
