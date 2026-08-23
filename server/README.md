# Gather API server

Node.js + TypeScript + Express + Prisma + SQLite backend for Gather, implementing the
endpoints in `../CONTRACT.md`. Auth is JWT (`Authorization: Bearer <token>`) with
bcrypt-hashed passwords. The database is a single SQLite file at `prisma/dev.db` —
no external DB server needed.

## Run instructions

From the `server/` directory:

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# (defaults are fine for local dev: DATABASE_URL, JWT_SECRET, PORT=4000)

# 3. Run the migration (creates prisma/dev.db and applies the schema)
npx prisma migrate dev

# 4. Seed the database (communities, products, residents, admins, orders, etc.)
npm run seed

# 5. Start the dev server (auto-reloads on file changes)
npm run dev
```

The API listens on **http://localhost:4000** by default (`PORT` in `.env`).

Other useful scripts:

```bash
npm run build   # compile TypeScript to dist/
npm run start   # run the compiled server (dist/index.js)
```

Re-running `npm run seed` at any time wipes and re-seeds all tables (idempotent —
safe to run repeatedly during development).

## Demo accounts (seeded)

**Residents** (`POST /api/auth/login`), password `gather123`, already verified,
`mustSetPassword=false`:

| Community | Username     |
|-----------|--------------|
| Gems 1    | `thida.aung` |
| Gems 2    | `moe.thu`    |
| Gems 3    | `aye.chan`   |
| Gems 4    | `htet.aung`  |

Each community also has ~15-20 filler neighbour accounts (password `neighbour123`)
with historical orders, so product tier progress looks realistic on first load.

**Admins** (`POST /api/admin/login`):

| Role                  | Username    | Password       |
|------------------------|-------------|----------------|
| Retailer (all communities) | `retailer`  | `capitalretail` |
| Community admin — Gems 1   | `admin.g1`  | `changeme123`   |
| Community admin — Gems 2   | `admin.g2`  | `changeme123`   |
| Community admin — Gems 3   | `admin.g3`  | `changeme123`   |
| Community admin — Gems 4   | `admin.g4`  | `changeme123`   |

## Quick smoke test

```bash
curl http://localhost:4000/api/communities

TOKEN=$(curl -s -X POST http://localhost:4000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"thida.aung","password":"gather123"}' | python3 -c "import sys,json;print(json.load(sys.stdin)['token'])")

curl http://localhost:4000/api/products -H "Authorization: Bearer $TOKEN"

curl -s -X POST http://localhost:4000/api/admin/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"retailer","password":"capitalretail"}'
```

## Project layout

```
server/
  prisma/
    schema.prisma   -- data model (matches CONTRACT.md exactly)
    seed.ts          -- seed script (communities, products, residents, admins, orders, social data)
    migrations/
  src/
    index.ts          -- Express app entry point
    lib/
      prisma.ts        -- PrismaClient singleton
      jwt.ts           -- sign/verify resident + admin JWTs
      pricing.ts        -- tier index / price / savePct / progress helpers
      serialize.ts       -- strips passwordHash before responses
    middleware/
      auth.ts            -- requireUser, requireAdmin(role?) middleware
    routes/
      public.ts           -- GET /api/communities
      auth.ts             -- resident auth (/api/auth/*)
      products.ts          -- shop (/api/products*)
      orders.ts             -- resident orders (/api/orders*)
      social.ts              -- wishlist/splits/activity/alerts
      adminAuth.ts            -- POST /api/admin/login (shared by both admin roles)
      adminCommunity.ts        -- /api/admin/community/* (role="community")
      adminRetailer.ts          -- /api/admin/retailer/* (role="retailer")
```

## Notes / deviations from CONTRACT.md

- **"Units joined" aggregation is not cycle-scoped.** CONTRACT.md defines "joined" as
  the sum of `OrderLine.qty` "since `Community.cycleNo` last incremented." The schema
  (also per CONTRACT.md) has no field recording *when* the current cycle started, only
  `cutoffAt` (the *next* cutoff) — so there's no stored boundary to filter historical
  orders by cycle. This implementation sums `OrderLine.qty` across **all** orders ever
  placed by the community for that product, which is equivalent to "this cycle" for a
  freshly seeded database (all seed orders belong to the current/only cycle) and stays
  correct in ongoing use as long as `cycleNo` isn't manually incremented mid-dataset.
  If cycle rollover needs to reset tier progress later, the natural fix is adding a
  `cycleNo` (or `cycleStartedAt`) column to `Order` and filtering on it — flagging this
  for whoever owns that follow-up rather than silently guessing at a schema change.
- **Seed scaling constant taken literally from CONTRACT.md.** The seed data section
  specifies the scaling formula `joined * community.households/312`. The prototype's
  own source code actually scales by `households / COMMS[0].households` (i.e. divides
  by 143, Gems 1's household count, not 312 which is Gems 1's *unit* count). This
  implementation follows CONTRACT.md's literal formula (divide by 312) since that's the
  authoritative spec here, not the prototype internals — the result is still
  proportional and produces realistic, gradually-increasing tier progress across the
  four communities.
- **One demo resident per community, not just Gems 1.** CONTRACT.md's example only
  spells out `thida.aung` for Gems 1; per its "one demo resident per community" line,
  equivalent verified/`mustSetPassword=false` demo accounts were added for Gems 2-4
  (`moe.thu`, `aye.chan`, `htet.aung`, all password `gather123`) so every community can
  be reviewed without registering a new account. `thida.aung` remains the one referenced
  in this README's smoke test since it's the account CONTRACT.md names explicitly.
- **`POST /api/admin/login` is a single shared endpoint** for both `community` and
  `retailer` `AdminUser.role`s (CONTRACT.md lists it once, under "Community admin", but
  the retailer section has no separate login endpoint of its own — and the calling
  agent's own verification instructions log into both roles through it). The response's
  `admin.role` tells the client which dashboard to route to.
- **Order codes** are generated as `{communityAbbr}-{sequentialNumber}` (e.g. `G1-2481`),
  matching the prototype's format; CONTRACT.md doesn't specify the exact numbering
  scheme.
- Deleting a retailer product (`DELETE /api/admin/retailer/products/:id`) returns the
  now-deleted product object (CONTRACT.md doesn't specify a delete response shape, and
  "mutations return the updated/created resource" reads naturally as "return what you
  just acted on").
