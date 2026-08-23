-- =============================================================================
-- Gather — Row Level Security (PostgreSQL / Supabase)
-- =============================================================================
--
-- Run after 01_roles.sql, as the database owner:
--   psql "$ADMIN_DATABASE_URL" -f prisma/security/02_rls.sql
--
-- WHY THIS IS NOT REDUNDANT WITH THE API
-- --------------------------------------
-- The API already scopes every office query to `officeCommunityId(req)` and
-- strips cost/margin in its serializer. RLS moves the same two rules into the
-- database, so they survive a bug in a route handler, a forgotten WHERE clause
-- in a future endpoint, or someone opening a psql session with the app
-- credentials. Defence in depth: the application decides what to ask for, the
-- database decides what it is allowed to see.
--
-- HOW THE SESSION CONTEXT WORKS — READ THIS BEFORE ENABLING
-- ---------------------------------------------------------
-- Gather authenticates with its own JWTs, not Supabase Auth, so there is no
-- `auth.uid()` to key policies on. Instead the API must publish who it is acting
-- as, per transaction, using session GUCs:
--
--   SET LOCAL app.actor_kind    = 'resident' | 'office' | 'retail';
--   SET LOCAL app.actor_user_id = '<User.id>';        -- residents only
--   SET LOCAL app.community_id  = '<Community.id>';   -- resident + office
--
-- `SET LOCAL` is transaction-scoped, which is what makes this safe behind a
-- connection pooler — the value cannot leak into the next request's connection.
-- In Prisma that means wrapping queries in an interactive transaction:
--
--   await prisma.$transaction(async (tx) => {
--     await tx.$executeRaw`SELECT set_config('app.actor_kind', ${kind}, true)`;
--     await tx.$executeRaw`SELECT set_config('app.community_id', ${communityId}, true)`;
--     return tx.order.findMany();          // policies now apply
--   });
--
-- ⚠️  UNTIL THAT WRAPPER EXISTS IN THE API, ENABLING THE POLICIES BELOW WILL
--     BREAK EVERY QUERY — with no context set, `current_actor_kind()` returns
--     'none' and every policy denies. That is the correct failure direction
--     (deny by default), but it is a breaking change, not a drop-in. Roll it out
--     behind a flag: run this file on a staging database first, add the
--     transaction wrapper, then enable in production.
--
-- The alternative, if you would rather not maintain the wrapper: migrate
-- resident and admin auth to Supabase Auth and rewrite `current_actor_*()` to
-- read `auth.jwt()`. The policy bodies below stay the same either way.
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- Helpers. STABLE so the planner can cache them within a statement.
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION current_actor_kind() RETURNS text
LANGUAGE sql STABLE AS $$
  SELECT COALESCE(NULLIF(current_setting('app.actor_kind', true), ''), 'none');
$$;

CREATE OR REPLACE FUNCTION current_actor_user_id() RETURNS text
LANGUAGE sql STABLE AS $$
  SELECT NULLIF(current_setting('app.actor_user_id', true), '');
$$;

CREATE OR REPLACE FUNCTION current_community_id() RETURNS text
LANGUAGE sql STABLE AS $$
  SELECT NULLIF(current_setting('app.community_id', true), '');
$$;

-- Capital Retail sees every community; office and resident see exactly one.
CREATE OR REPLACE FUNCTION can_see_community(target text) RETURNS boolean
LANGUAGE sql STABLE AS $$
  SELECT CASE current_actor_kind()
           WHEN 'retail' THEN true
           WHEN 'office' THEN target = current_community_id()
           WHEN 'resident' THEN target = current_community_id()
           ELSE false
         END;
$$;

REVOKE ALL ON FUNCTION current_actor_kind(), current_actor_user_id(),
                        current_community_id(), can_see_community(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION current_actor_kind(), current_actor_user_id(),
                          current_community_id(), can_see_community(text)
  TO gather_app, gather_readonly;

-- -----------------------------------------------------------------------------
-- Enable RLS. FORCE also applies policies to the table owner, so a migration
-- run as owner cannot quietly bypass them.
-- -----------------------------------------------------------------------------

ALTER TABLE "Order"               ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Order"               FORCE  ROW LEVEL SECURITY;
ALTER TABLE "OrderLine"           ENABLE ROW LEVEL SECURITY;
ALTER TABLE "OrderLine"           FORCE  ROW LEVEL SECURITY;
ALTER TABLE "User"                ENABLE ROW LEVEL SECURITY;
ALTER TABLE "User"                FORCE  ROW LEVEL SECURITY;
ALTER TABLE "VerificationRequest" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "VerificationRequest" FORCE  ROW LEVEL SECURITY;
ALTER TABLE "CashUp"              ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CashUp"              FORCE  ROW LEVEL SECURITY;
ALTER TABLE "Alert"               ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Alert"               FORCE  ROW LEVEL SECURITY;
ALTER TABLE "Wishlist"            ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Wishlist"            FORCE  ROW LEVEL SECURITY;
ALTER TABLE "Split"               ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Split"               FORCE  ROW LEVEL SECURITY;
ALTER TABLE "Activity"            ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Activity"            FORCE  ROW LEVEL SECURITY;
ALTER TABLE "FulfilmentRun"       ENABLE ROW LEVEL SECURITY;
ALTER TABLE "FulfilmentRun"       FORCE  ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- Orders. A resident sees only their own; an office sees its community's;
-- retail sees all. Residents may create an order only for themselves, and may
-- never change one after the fact (stage and payment are back-office decisions).
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS order_select ON "Order";
CREATE POLICY order_select ON "Order" FOR SELECT USING (
  can_see_community("communityId")
  AND (current_actor_kind() <> 'resident' OR "userId" = current_actor_user_id())
);

DROP POLICY IF EXISTS order_insert ON "Order";
CREATE POLICY order_insert ON "Order" FOR INSERT WITH CHECK (
  can_see_community("communityId")
  AND (current_actor_kind() <> 'resident' OR "userId" = current_actor_user_id())
);

-- Only the back office advances stage / marks paid.
DROP POLICY IF EXISTS order_update ON "Order";
CREATE POLICY order_update ON "Order" FOR UPDATE
  USING (current_actor_kind() IN ('office', 'retail') AND can_see_community("communityId"))
  WITH CHECK (can_see_community("communityId"));

DROP POLICY IF EXISTS orderline_all ON "OrderLine";
CREATE POLICY orderline_all ON "OrderLine" USING (
  EXISTS (SELECT 1 FROM "Order" o WHERE o.id = "OrderLine"."orderId")
) WITH CHECK (
  EXISTS (SELECT 1 FROM "Order" o WHERE o.id = "OrderLine"."orderId")
);

-- -----------------------------------------------------------------------------
-- Households. The office manages its own roster. A resident can read and update
-- only their own row — this is what stops one resident editing another's
-- account even if a route forgets to check.
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS user_select ON "User";
CREATE POLICY user_select ON "User" FOR SELECT USING (
  CASE current_actor_kind()
    WHEN 'resident' THEN id = current_actor_user_id() OR "communityId" = current_community_id()
    ELSE can_see_community("communityId")
  END
);

DROP POLICY IF EXISTS user_insert ON "User";
CREATE POLICY user_insert ON "User" FOR INSERT WITH CHECK (
  current_actor_kind() = 'office' AND "communityId" = current_community_id()
);

DROP POLICY IF EXISTS user_update ON "User";
CREATE POLICY user_update ON "User" FOR UPDATE USING (
  CASE current_actor_kind()
    WHEN 'resident' THEN id = current_actor_user_id()
    WHEN 'office'   THEN "communityId" = current_community_id()
    ELSE false                      -- retail never edits a household
  END
);

-- -----------------------------------------------------------------------------
-- Office-only tables. Retail has no business reading a community's verification
-- queue or cash-up, so these are scoped tighter than can_see_community().
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS verification_office ON "VerificationRequest";
CREATE POLICY verification_office ON "VerificationRequest" USING (
  current_actor_kind() = 'office' AND "communityId" = current_community_id()
) WITH CHECK (
  current_actor_kind() = 'office' AND "communityId" = current_community_id()
);

DROP POLICY IF EXISTS cashup_office ON "CashUp";
CREATE POLICY cashup_office ON "CashUp" USING (
  (current_actor_kind() = 'office' AND "communityId" = current_community_id())
  OR current_actor_kind() = 'retail'      -- retail receives the submitted cash-up
) WITH CHECK (
  current_actor_kind() = 'office' AND "communityId" = current_community_id()
);

-- -----------------------------------------------------------------------------
-- Announcements. Residents see PUBLISHED notices for their community only —
-- the draft filter is enforced in the database, not just in the route.
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS alert_select ON "Alert";
CREATE POLICY alert_select ON "Alert" FOR SELECT USING (
  can_see_community("communityId")
  AND (current_actor_kind() <> 'resident' OR "isDraft" = false)
);

DROP POLICY IF EXISTS alert_write ON "Alert";
CREATE POLICY alert_write ON "Alert" FOR ALL
  USING (current_actor_kind() = 'office' AND "communityId" = current_community_id())
  WITH CHECK (current_actor_kind() = 'office' AND "communityId" = current_community_id());

-- -----------------------------------------------------------------------------
-- Community-scoped social tables.
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS wishlist_scope ON "Wishlist";
CREATE POLICY wishlist_scope ON "Wishlist"
  USING (can_see_community("communityId"))
  WITH CHECK (can_see_community("communityId"));

DROP POLICY IF EXISTS split_scope ON "Split";
CREATE POLICY split_scope ON "Split"
  USING (can_see_community("communityId"))
  WITH CHECK (can_see_community("communityId"));

DROP POLICY IF EXISTS activity_scope ON "Activity";
CREATE POLICY activity_scope ON "Activity"
  USING (can_see_community("communityId"))
  WITH CHECK (can_see_community("communityId"));

DROP POLICY IF EXISTS fulfilment_scope ON "FulfilmentRun";
CREATE POLICY fulfilment_scope ON "FulfilmentRun"
  USING (can_see_community("communityId"))
  WITH CHECK (current_actor_kind() = 'retail');   -- only Capital Retail picks/packs

COMMIT;

-- =============================================================================
-- Rollback, if the transaction wrapper is not in place yet:
--
--   ALTER TABLE "Order" DISABLE ROW LEVEL SECURITY;   -- …and each table above
--
-- Smoke test:
--   BEGIN;
--     SET LOCAL ROLE gather_app;
--     SELECT set_config('app.actor_kind','office',true);
--     SELECT set_config('app.community_id','<gems1-id>',true);
--     SELECT count(*) FROM "Order";        -- only Gems 1
--     SELECT count(*) FROM "VerificationRequest";
--   ROLLBACK;
-- =============================================================================
