-- =============================================================================
-- Gather — least-privilege database roles (PostgreSQL / Supabase)
-- =============================================================================
--
-- Run ONCE per environment, as the database owner, AFTER `prisma migrate deploy`
-- has created the tables. Then point the running API at gather_app, and keep the
-- owner/migrator credentials out of the application environment entirely.
--
--   psql "$ADMIN_DATABASE_URL" -f prisma/security/01_roles.sql
--
-- The principle being applied: the credential the API runs with should be able to
-- do exactly what the API needs and nothing else. Today the API connects as the
-- database owner, which means an SQL-injection bug or a leaked connection string
-- is a full database compromise — DROP TABLE included. After this, the worst an
-- app-role compromise can do is read and write rows it already had reason to
-- touch. No DDL, no truncation, no privilege grants, no access to other schemas.
--
-- Three roles, three jobs:
--   gather_migrator  — owns the schema, runs migrations. Used by CI only.
--   gather_app       — the API. DML on application tables. No DDL, no DELETE
--                      except where the product genuinely deletes.
--   gather_readonly  — analytics/BI/support. SELECT only, and NEVER on the
--                      columns that carry landed cost or credentials.
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 0. Roles. NOLOGIN group roles + login roles, so passwords can be rotated
--    without re-granting anything.
-- -----------------------------------------------------------------------------

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'gather_migrator') THEN
    CREATE ROLE gather_migrator NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'gather_app') THEN
    CREATE ROLE gather_app NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'gather_readonly') THEN
    CREATE ROLE gather_readonly NOLOGIN;
  END IF;
END
$$;

-- -----------------------------------------------------------------------------
-- 1. Revoke the permissive defaults.
--    Postgres grants CREATE and USAGE on `public` to PUBLIC by default, which
--    means any role that can connect can create objects. Take that away first.
-- -----------------------------------------------------------------------------

REVOKE ALL   ON SCHEMA public FROM PUBLIC;
REVOKE ALL   ON ALL TABLES    IN SCHEMA public FROM PUBLIC;
REVOKE ALL   ON ALL SEQUENCES IN SCHEMA public FROM PUBLIC;
REVOKE ALL   ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC;
REVOKE CREATE ON SCHEMA public FROM PUBLIC;

-- Nobody but the migrator creates objects.
GRANT USAGE  ON SCHEMA public TO gather_app, gather_readonly;
GRANT USAGE, CREATE ON SCHEMA public TO gather_migrator;

-- -----------------------------------------------------------------------------
-- 2. gather_app — the API's role.
--    DML only. Note what is NOT granted: no CREATE, no ALTER, no DROP, no
--    TRUNCATE, no REFERENCES, no role administration.
-- -----------------------------------------------------------------------------

GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO gather_app;

-- DELETE only where the product actually deletes rows. Everything else is
-- soft-state (an order is never deleted, a household is suspended not removed),
-- so withholding DELETE turns a whole class of bug into a failed query.
GRANT DELETE ON
  "WishlistVote",
  "SplitParticipant",
  "ProductCommunity",
  "PromotionCommunity",
  "Comment"
TO gather_app;

-- cuid()s are generated in the application, but keep sequence access correct for
-- any future serial column.
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO gather_app;

-- -----------------------------------------------------------------------------
-- 3. gather_readonly — analytics and support.
--    SELECT on everything EXCEPT the two tables that carry secrets, and only the
--    non-confidential columns of Product (no landed cost).
-- -----------------------------------------------------------------------------

GRANT SELECT ON ALL TABLES IN SCHEMA public TO gather_readonly;

-- Credentials are never readable by a reporting role.
REVOKE ALL ON "User"      FROM gather_readonly;
REVOKE ALL ON "AdminUser" FROM gather_readonly;

-- Re-grant the User columns a support person legitimately needs — excluding
-- passwordHash and tempPassword.
GRANT SELECT ("id", "communityId", "username", "displayName", "block", "unit",
              "blockUnit", "verified", "accountState", "memberSince", "phone")
  ON "User" TO gather_readonly;

-- Landed cost is Capital Retail's commercial secret (CONTRACT.md §1). The API
-- enforces this in its serializer; enforce it again at the column level so a
-- direct SQL client cannot read it either.
REVOKE ALL ON "Product" FROM gather_readonly;
GRANT SELECT ("id", "sku", "name", "brand", "barcode", "unit", "size",
              "grossWeight", "category", "details", "retailPrice",
              "price0", "price1", "price2", "price3",
              "imageSlot", "imageUrl", "active")
  ON "Product" TO gather_readonly;

-- -----------------------------------------------------------------------------
-- 4. Future tables inherit the same defaults, so a new migration cannot
--    accidentally ship a table that is world-readable.
-- -----------------------------------------------------------------------------

ALTER DEFAULT PRIVILEGES FOR ROLE gather_migrator IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE ON TABLES TO gather_app;
ALTER DEFAULT PRIVILEGES FOR ROLE gather_migrator IN SCHEMA public
  GRANT SELECT ON TABLES TO gather_readonly;
ALTER DEFAULT PRIVILEGES FOR ROLE gather_migrator IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO gather_app;

-- -----------------------------------------------------------------------------
-- 5. Login roles. Replace the passwords before running — these are placeholders
--    and the script intentionally does not invent secrets for you.
-- -----------------------------------------------------------------------------

-- CREATE ROLE gather_app_user      LOGIN PASSWORD '<from your secret manager>';
-- CREATE ROLE gather_migrator_user LOGIN PASSWORD '<from your secret manager>';
-- CREATE ROLE gather_readonly_user LOGIN PASSWORD '<from your secret manager>';
-- GRANT gather_app      TO gather_app_user;
-- GRANT gather_migrator TO gather_migrator_user;
-- GRANT gather_readonly TO gather_readonly_user;

-- Cap the blast radius of a runaway or hostile connection.
-- ALTER ROLE gather_app_user      CONNECTION LIMIT 40;
-- ALTER ROLE gather_readonly_user CONNECTION LIMIT 5;
-- ALTER ROLE gather_app_user      SET statement_timeout = '15s';
-- ALTER ROLE gather_readonly_user SET statement_timeout = '60s';
-- ALTER ROLE gather_app_user      SET idle_in_transaction_session_timeout = '30s';

COMMIT;

-- -----------------------------------------------------------------------------
-- Verify (expect gather_app to have no DDL and no DELETE on Order):
--
--   SELECT grantee, privilege_type
--     FROM information_schema.role_table_grants
--    WHERE table_name = 'Order' AND grantee LIKE 'gather%';
--
--   -- should fail:
--   SET ROLE gather_app; DROP TABLE "Order";
--   SET ROLE gather_app; DELETE FROM "Order";
-- -----------------------------------------------------------------------------
