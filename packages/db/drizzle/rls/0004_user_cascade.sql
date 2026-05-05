-- ════════════════════════════════════════════════════════════════════════════
-- USER CASCADE: link public.users.id → auth.users.id
-- ════════════════════════════════════════════════════════════════════════════
-- Without this constraint, deleting an auth.users row leaves orphan rows in
-- public.users (and downstream households via the trigger). Adding ON DELETE
-- CASCADE ensures cleanup is automatic and complete.

-- Drop existing FK if present (idempotent)
ALTER TABLE public.users
  DROP CONSTRAINT IF EXISTS users_id_fkey;

ALTER TABLE public.users
  ADD CONSTRAINT users_id_fkey
  FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
