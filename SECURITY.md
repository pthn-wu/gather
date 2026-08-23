# Gather — security controls

What is enforced, where it is enforced, and what still needs doing before this
goes near real households' data.

---

## 1. Strict input validation

Every endpoint parses its input through a Zod schema before touching the
database. `server/src/lib/validate.ts` holds the primitives,
`server/src/lib/schemas.ts` the per-route shapes.

Three properties make this more than decoration:

- **Unknown keys are rejected, not stripped.** Every object is `.strict()`, so a
  client cannot smuggle `{"verified": true}` or `{"paid": true}` into a PATCH
  body and hope a later spread picks it up. Verified:

  ```
  PATCH /api/auth/profile {"displayName":"x","verified":true,"communityId":"other"}
  → 400 Unrecognized keys: "verified", "accountState", "communityId"
  ```

- **Parsed output replaces the raw input.** Handlers read `req.body` *after*
  validation, so there is no path where an unvalidated value reaches a query.

- **Enums are allowlists.** Category, payment method, order status, promotion
  mechanic, account state and contract status are closed sets — not free text.

Also enforced: password minimum 8 characters (on set, not on sign-in), MMK
amounts as non-negative integers, quantities 1–999, tier prices that must
descend as volume rises, avatar photos restricted to PNG/JPEG/WebP/GIF data URLs
under 2 MB (**SVG is deliberately excluded — it can carry script**), and import
sheets capped at 5000 rows.

Search terms keep their punctuation — product names contain commas, dashes and
ampersands — and only control characters are stripped. Prisma parameterises the
value, so punctuation is inert on the way to the database.

## 2. Parameterized queries

All database access goes through Prisma's query builder, which parameterises
everything it sends. There is no raw SQL in the codebase.

To stop that regressing, `scripts/check-sql-safety.mjs` fails CI on
`$queryRawUnsafe`, `$executeRawUnsafe`, string-concatenated SQL, and SQL
template literals that interpolate outside a `$queryRaw` tag. The safe tagged
form (`` prisma.$queryRaw`... ${id}` ``) is explicitly allowed, since it *does*
parameterise. A genuinely-safe match can be exempted with a `sql-safety-ignore`
comment carrying the reason.

Semgrep enforces the same rule independently (`gather-no-raw-unsafe`).

## 3. Least privilege

**Application layer.** Role separation is enforced twice: `requireAdmin('office')`
and `requireAdmin('retail')` pin each console's router, and the confidentiality
guard (`server/src/lib/confidential.ts`) scrubs `cost`, `margin` and any
profit-shaped key from every response that is not authenticated as a Capital
Retail admin. It wraps `res.json` — the single choke point every response passes
through — so a future careless `include` cannot leak cost by accident. It is
deny-by-default: unauthenticated and resident requests are scrubbed identically.

**Database layer.** `server/prisma/security/01_roles.sql` creates three roles:

| Role | Job | Rights |
|---|---|---|
| `gather_migrator` | migrations, CI only | owns schema, DDL |
| `gather_app` | the API | SELECT/INSERT/UPDATE; DELETE only on join tables; **no DDL, no TRUNCATE** |
| `gather_readonly` | analytics, support | SELECT, minus credentials and minus `Product.cost` |

`PUBLIC` is revoked from the schema first, and `ALTER DEFAULT PRIVILEGES`
ensures a table added by a future migration inherits least privilege rather than
defaulting open. Today the API connects as the database owner; moving it to
`gather_app` means an injection bug or leaked connection string can no longer
drop a table.

**Row Level Security.** `server/prisma/security/02_rls.sql` moves community
scoping and the draft-announcement filter into the database, so they survive a
bug in a route handler. **Read the header before running it** — Gather uses its
own JWTs rather than Supabase Auth, so the policies key on session GUCs that the
API must set per transaction. Until that wrapper exists, enabling RLS denies
every query (the correct failure direction, but a breaking change). Roll it out
on staging first.

## 4. Static analysis before deployment

`.github/workflows/security.yml` runs on every push and PR, and weekly on a
schedule so newly-disclosed CVEs surface without waiting for a commit:

- **gitleaks** — secret scanning across full history
- **Semgrep** — `p/owasp-top-ten`, `p/javascript`, `p/typescript`, `p/react`,
  `p/secrets`, plus `.semgrep.yml` (this project's own invariants)
- **CodeQL** — `security-extended` dataflow analysis
- **Per workspace** (server/web/admin/mobile) — typecheck + `npm audit --audit-level=high`
- **SQL safety guard**
- **Dependency review** — blocks a PR adding a vulnerable or badly-licensed package

`security-gate` aggregates the results and **explicitly checks each job's
result** — `needs` alone does not fail when a dependency is skipped.
`deploy.yml` triggers on that workflow completing and refuses to run unless the
conclusion was `success`.

Run the same checks locally before pushing:

```bash
./scripts/security-scan.sh
```

### The project's own Semgrep rules

Each was verified to fire on a deliberately-vulnerable fixture and to produce no
false positives on the real codebase:

| Rule | Catches |
|---|---|
| `gather-no-raw-unsafe` | unparameterized Prisma raw helpers |
| `gather-no-cost-in-public-serializer` | landed cost leaking into a resident/office payload |
| `gather-no-secret-fallback` | `process.env.X_SECRET \|\| "default"` |
| `gather-no-permissive-cors` | `origin: true` / `origin: "*"` |
| `gather-no-error-message-to-client` | `res.json({error: err.message})` |
| `gather-no-dangerous-html` | `dangerouslySetInnerHTML` in any client |
| `gather-no-eval` | `eval` / `new Function` |
| `gather-mobile-token-storage` | auth token in AsyncStorage instead of SecureStore |

`project/` and `chats/` are excluded via `.semgrepignore` — they hold the
original design prototypes (whose toy framework uses `new Function`), not
shipped code.

## 5. Vulnerable dependencies removed

`npm audit --audit-level=high` gates CI. Two high-severity findings surfaced on
the first run and were fixed, not suppressed:

- **`vite` ≤6.4.2** (web + admin) — path traversal in optimized-deps handling,
  plus two Windows-specific dev-server issues. All three are dev-server-only and
  the production artifact is static files, so live risk was nil; upgraded to
  vite 8 anyway (developer machines are a real attack surface). Both apps build
  and typecheck clean on it.

- **`xlsx` (SheetJS)** (admin) — prototype pollution (GHSA-4r6h-8v6p-xvw6) and
  ReDoS (GHSA-5pgg-2g8v-p4x9), with **no fix available on npm**: SheetJS ships
  patched builds only from its own CDN. This one mattered — that library parses
  operator-uploaded .xlsx files in the import modal, which is exactly the attack
  path those advisories describe. Replaced with **ExcelJS** (maintained, on npm,
  no outstanding advisories), and `xlsx` removed entirely.

  The replacement was verified end-to-end, not assumed: exported the catalog
  from the retail console (9.8 KB, valid xlsx zip, correct headers) and
  re-imported that exact file through the import modal — 16 rows parsed and
  previewed, zero console errors. It is still lazy-loaded, so the 930 KB parser
  stays out of the initial bundle.

  `readSheet()` also hardens the parse independently of the library: 10 MB file
  cap, 5000-row cap, and rows rebuilt onto null-prototype objects so a crafted
  `__proto__` header cannot reach `Object.prototype`.

Remaining moderate findings (2 web, 2 admin, 10 mobile) are below the gate and
are transitive dev-tooling issues; they are reported in CI but do not block.

## 6. Hardening fixed in this pass

Four real vulnerabilities found during the audit:

| Issue | Was | Now |
|---|---|---|
| **CORS** | `callback(null, true)` for *every* origin, with `credentials: true` — any site could make authenticated requests on a signed-in user's behalf | allowlist from `CORS_ORIGINS`; localhost only outside production |
| **JWT secret** | fell back to a hard-coded string, so any deployment that forgot to set it shared a signing key with the source | fails to boot in production without a ≥32-char non-placeholder secret; random per-process secret in dev |
| **Error handler** | returned `err.message` to the client, leaking Prisma constraint text and file paths | logs detail with a correlation id, returns `{error, ref}` |
| **No rate limiting** | unlimited login attempts | 10 sign-ins / 15 min, 120 writes / min, 600 reads / min |

Plus: `helmet` security headers with a locked-down CSP, `x-powered-by` removed,
`trust proxy` set explicitly so `req.ip` cannot be spoofed via `X-Forwarded-For`,
body limit reduced 5 MB → 3 MB, and the 404 handler no longer reflects the
attacker-controlled path.

One note on rate limiting: the custom `keyGenerator` first written here was
**less** safe than the library default — keying on raw `req.ip` lets an IPv6
client rotate addresses within its /64 to bypass the limit. `express-rate-limit`
caught it; the default normalises the prefix and is what's now used.

---

## 7. Still outstanding

Honest list. None of these are done:

1. **Temp passwords are stored in plaintext** (`User.tempPassword`). This is
   deliberate — the office prints them on credential slips — but it means a
   database read exposes working credentials for any account that has not yet
   completed first-run setup. Options: store a hash and show the plaintext only
   once at generation time, or set a short expiry after which the slip is void.
   **This is the highest-value remaining fix.**
2. **RLS is written but not enabled** — needs the per-transaction session
   context wrapper first (see §3).
3. **The API still connects as the database owner.** Applying `01_roles.sql` and
   repointing `DATABASE_URL` at `gather_app` is a config change, not a code one.
4. **No audit log.** Who approved a verification, changed a tier price, or marked
   an order paid is not recorded anywhere queryable.
5. **No CSRF defence**, because auth is a `Authorization: Bearer` header rather
   than a cookie. If sessions ever move to cookies, this becomes required.
6. **Refresh tokens / revocation.** JWTs live 30 days with no way to revoke one
   early; a stolen token is valid until it expires.
7. **Dependency pinning.** `npm ci` uses the lockfile, but there is no
   provenance/signature verification.
8. **The mobile app has never run on a device** — the security posture of
   SecureStore usage is verified by reading, not by exercising it on hardware.

## 8. Environment variables

```bash
JWT_SECRET=            # REQUIRED in production, ≥32 chars: openssl rand -base64 48
DATABASE_URL=          # point at gather_app, NOT the owner
CORS_ORIGINS=          # comma-separated, e.g. https://gather.mm,https://office.gather.mm
NODE_ENV=production
TRUST_PROXY_HOPS=1     # 1 behind Vercel/one load balancer
RATE_LIMIT_AUTH=10
RATE_LIMIT_WRITE=120
RATE_LIMIT_GENERAL=600
```

Never commit a real value for any of these. gitleaks runs in CI to catch it if
someone does.
