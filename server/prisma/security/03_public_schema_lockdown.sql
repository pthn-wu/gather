-- =============================================================================
-- Gather — Lock the public schema away from PostgREST (PostgreSQL / Supabase)
-- =============================================================================
--
-- APPLIED to the `gather` Supabase project on 2026-08-23 as migration
-- `lock_down_public_schema_rls`. Unlike 02_rls.sql, this file is live.
--
-- Run after 01_roles.sql, as the database owner:
--   psql "$ADMIN_DATABASE_URL" -f prisma/security/03_public_schema_lockdown.sql
--
-- WHAT THIS FIXES
-- ---------------
-- Supabase does not only hand you a database. It also runs PostgREST in front
-- of it, and grants the two web-facing roles it authenticates as — `anon` and
-- `authenticated` — full DML on everything in `public`, including new tables.
-- After `prisma db push` that meant all 20 Gather tables were readable, and
-- writable, and TRUNCATE-able, by anyone holding the project URL and the
-- publishable anon key. Both are, by design, public values that ship in client
-- bundles.
--
-- Two of Gather's rules died there. `Product.cost` and every margin the API is
-- careful never to show a community office were a single GET away, and the
-- per-community scoping that adminOffice.ts enforces on every query meant
-- nothing to a caller who never went through the API at all.
--
-- Gather does not use PostgREST. The API holds its own JWTs and connects
-- directly as `gather_app_user`, a role with table privileges (see
-- 01_roles.sql). So `anon` and `authenticated` have no legitimate use here and
-- the fix is to take everything away from them rather than to write policies
-- that let them in narrowly.
--
-- WHY RLS AS WELL, WHEN THE GRANTS ARE GONE
-- -----------------------------------------
-- The grants are gone *today*. Supabase's own tooling puts them back: a table
-- created through Studio, a future `db push`, an extension install. RLS is the
-- backstop that survives that — with no policy for `anon`, restored privileges
-- still return zero rows.
--
-- The catch is that RLS applies to `gather_app_user` too. It is not the table
-- owner (postgres is) and does not have BYPASSRLS, so enabling RLS with no
-- policies at all would deny the API every row. Hence the permissive policy
-- granted TO `gather_app`. It is deliberately wide open: this file's job is to
-- draw the boundary between "the application" and "the internet", not between
-- one community and another. 02_rls.sql is what narrows it further, once the
-- API sets the session GUCs it needs.
-- =============================================================================

-- 1. Remove the PostgREST-facing grants.
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM anon, authenticated;
REVOKE USAGE ON SCHEMA public FROM anon, authenticated;

-- Note: `anon` retains USAGE on the schema itself, because PUBLIC holds it via
-- pg_database_owner and Supabase's internals rely on that. Schema USAGE without
-- any object privilege grants nothing but the ability to name a table it cannot
-- read, so this is left alone rather than broken.

-- 2. Stop future objects from re-granting them.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL ON TABLES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL ON SEQUENCES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL ON FUNCTIONS FROM anon, authenticated;

-- 3. Enable RLS everywhere, with one policy that lets the application through.
DO $$
DECLARE t text;
BEGIN
  FOR t IN
    SELECT c.relname FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'r'
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS gather_app_all ON public.%I', t);
    EXECUTE format(
      'CREATE POLICY gather_app_all ON public.%I AS PERMISSIVE FOR ALL TO gather_app USING (true) WITH CHECK (true)',
      t);
  END LOOP;
END $$;

-- =============================================================================
-- VERIFY
-- =============================================================================
--
-- Nothing left for the web roles (expect zero rows):
--   SELECT grantee, table_name, privilege_type
--     FROM information_schema.role_table_grants
--    WHERE table_schema = 'public' AND grantee IN ('anon', 'authenticated');
--
-- RLS on, one policy per table (expect 20 / 20):
--   SELECT count(*) FILTER (WHERE relrowsecurity) AS rls_enabled,
--          (SELECT count(*) FROM pg_policies WHERE schemaname = 'public') AS policies
--     FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
--    WHERE n.nspname = 'public' AND c.relkind = 'r';
--
-- The application still sees its data. Run this as gather_app_user, or from an
-- owner session that can SET ROLE to it — reading as postgres proves nothing,
-- because postgres has BYPASSRLS:
--   SET LOCAL ROLE gather_app_user;
--   SELECT count(*) FROM "Product";     -- rows, not zero
--   UPDATE "Community" SET "id" = "id"; -- exercises USING and WITH CHECK
--
-- Writes the role is not supposed to have are still refused (expect f, t):
--   SELECT has_table_privilege('gather_app_user', 'public."Order"', 'DELETE'),
--          has_table_privilege('gather_app_user', 'public."Comment"', 'DELETE');
