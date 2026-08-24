# Deploying Gather

Two Vercel projects off one repo, plus the Supabase database that is already
provisioned and seeded.

| Project | Root directory | What it serves |
|---|---|---|
| `gather-api` | `server` | the Express API, as a serverless function |
| `gather-web` | `web` | the whole site |

One site, two audiences. `/` is the resident storefront and `/office` is the
back office (retail and community consoles), from the same build and the same
domain. The office code is a lazy chunk, so shoppers never download it.

The mobile app (`mobile/`) is not deployed here — it builds through EAS and
points at the same API.

## 1. Database

Supabase project `gather` (`slqlqftiuwdsiqeoikzs`, ap-southeast-1, Postgres 17)
is live: schema pushed, demo data seeded, least-privilege roles created, and the
public schema locked away from PostgREST (see `SECURITY.md` §3).

The API connects as `gather_app_user`, **not** as the owner. Take the connection
string from the Supabase dashboard → **Connect** → **Transaction pooler**, then
swap in the application role:

```
postgresql://gather_app_user.<PROJECT_REF>:<DB_PASSWORD>@<POOLER_HOST>:6543/postgres?pgbouncer=true&connection_limit=1
```

Copy `<POOLER_HOST>` from that dialog rather than guessing it — the regional
prefix has changed between Supabase generations, and it is the one value here
that cannot be derived.

Both query parameters matter. Serverless functions open a pool per instance, and
a pooled connection cannot use prepared statements; without them the API
exhausts Postgres connections under trivial load. Do not point `DATABASE_URL` at
port 5432 — that is the direct connection, one session per function instance.

## 2. Environment variables — `gather-api`

```bash
DATABASE_URL=            # transaction pooler string from §1, as gather_app_user
JWT_SECRET=              # ≥32 chars: openssl rand -base64 48
CORS_ORIGINS=            # every hostname the site answers on, comma-separated,
                         # no spaces, no trailing slash
NODE_ENV=production
TRUST_PROXY_HOPS=1
```

An origin that is not on the list is refused, which is the intended behaviour and
also the first thing to check when the site loads but every request fails.

`JWT_SECRET` fails closed: in production the server refuses to boot without it,
and refuses a value that looks like a placeholder.

## 3. Environment variables — `gather-web`

```bash
VITE_API_URL=       # the API's URL, no trailing slash
```

This is baked in at build time, so changing it needs a redeploy, not just a
restart.

`CORS_ORIGINS` on the API must list every hostname the site is reachable on.
Vercel gives each project two production aliases (a short random one and a
`-<team-slug>` one) and CORS matches the `Origin` header exactly, so list both or
a link shared later will fail in a way that looks like the app is broken.

## 4. Order of operations

The site needs the API's URL and the API needs the site's, so the first pass is
circular. Deploy the API first, deploy the site against it, then come back and
fix `CORS_ORIGINS` with the hostname Vercel actually assigned.

1. Import the repo twice, once per project, setting **Root Directory** per the
   table above. The picker offers to descend into `src` and `public`; don't —
   the root is the folder holding `package.json`.
2. `gather-api`: add §2's variables, deploy. `server/vercel.json` routes
   everything to `api/index.ts`; there is no build step to configure.
3. `gather-web`: add §3's variable, deploy. Vite SPA — framework preset
   **Vite**, output `dist`. `web/vercel.json` rewrites all paths to
   `index.html` so `/office` and deep links survive a refresh.
4. Turn **Vercel Authentication** off on both (Settings → Deployment
   Protection). It is on by default and redirects every visitor, including the
   browser's API calls, to a Vercel login page.
5. Correct `CORS_ORIGINS` on `gather-api` to the hostnames Vercel actually
   assigned, and redeploy it. Don't predict them from project names.

## 5. After deploying, before trusting it

The API has only ever run against SQLite. This is its first execution against
Postgres, so walk the round trip by hand rather than assuming it works:

- `GET /health` returns `{"ok":true}` — proves the function boots and
  `JWT_SECRET` passed its check. It does not touch the database.
- `GET /api/communities` returns the four towers — this is the first query that
  proves `DATABASE_URL`, the pooler and the `gather_app_user` grants all work. It
  needs no auth, so it is the cheapest thing to curl.
- Resident login, then the product sheet renders with tier pricing.
- Search a product with a comma, a hyphen or an ampersand in the name. SQLite
  matched case-insensitively and Postgres does not; the `contains:` filters were
  corrected for this by reading, not by running.
- Retail console: log in, delist a product from one tower, confirm it vanishes
  from that tower's resident sheet and stays on the others.
- Office console at `/office`: log in as a community, publish an announcement,
  confirm it appears on the resident site — and confirm a *draft* does not.
- Sign in as a resident and as an office user in the same browser. The two
  sessions use different `localStorage` keys and must not disturb each other.
- Anywhere the office console shows money, confirm no cost or margin is present.
  Check the network response, not only the rendered page.

Anything that fails here is a Postgres-vs-SQLite difference, not a design
change; `git log` for the case-sensitivity fix shows the shape they take.
