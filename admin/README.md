# Gather Admin

Admin dashboard for Gather (group-buying app for condo communities in Yangon).
React + TypeScript + Vite, talking to the `server/` API described in `../CONTRACT.md`.

Two roles, one app — routed automatically after login based on the admin's `role`:

- **Community admin** — manages residents (create accounts, verify units, reset
  passwords) and views their own community's orders (fulfillment + payment status).
- **Retailer admin** (Capital Retail) — manages the product catalog and 4-tier
  pricing, advances order fulfillment status across all communities, and gets a
  read-only overview of each community's stats.

## Run it

```bash
npm install
cp .env.example .env   # defaults to http://localhost:4000, edit if your API runs elsewhere
npm run dev
```

Open the printed local URL (default `http://localhost:5174`). The backend
(`server/`) must be running for login and data to work — see its own README.

Seeded accounts (from `CONTRACT.md`'s seed plan), useful for manual testing:

- Retailer admin: `retailer` / `capitalretail`
- Community admin (Gems 1): `admin.g1` / `changeme123`

## Build

```bash
npm run build   # type-checks (tsc -b) then builds to dist/
npm run preview # serve the production build locally
```

## Configuration

Set `VITE_API_URL` (in `.env`, or the environment) to point at the API. Defaults
to `http://localhost:4000` if unset. See `.env.example`.

## Structure

```
src/
  api/
    client.ts       fetch wrapper (auth header, error handling), one function per endpoint
    types.ts        TS types mirroring CONTRACT.md's Prisma models
    normalize.ts     defensive readers for order fields whose exact join shape
                     (e.g. resident info embedded on an order) isn't pinned
                     down by the contract — tweak here if the backend's shape differs
  context/
    AuthContext.tsx  session state (token + admin) backed by localStorage
  components/
    Shell.tsx        sidebar + page header layout shared by both dashboards
    Badges.tsx       verified/paid/status/active pill components
  pages/
    Login.tsx
    CommunityDashboard.tsx   residents tab + orders tab
    RetailerDashboard.tsx    products tab + fulfillment tab + communities tab
```

## Notes / things guessed without a design reference

There was no existing design file for the admin surface (the Claude Design
prototype only covers the resident-facing app), so the visual language here is
a fresh, data-dense admin UI built to match the resident app's brand tokens
(paper background, ink text, violet accent, green/red status colors, Poppins +
Plus Jakarta Sans + JetBrains Mono) rather than a specific mockup. Specifics
guessed:

- **Layout**: a fixed left sidebar (role, name, nav) + content area, instead of
  the resident app's centered/marketing layout — standard for a dashboard doing
  daily admin work.
- **Inline-editable price table** for products (edit the 4 tier prices + retail
  price + category/unit directly in the row, a "Save" button appears once a row
  is dirty) rather than a separate edit modal — kept it fast for editing many
  SKUs.
- **Reset password** is modeled as an inline "set a new temporary password"
  action (matching `POST .../reset-password {tempPassword}`), not a "generate
  and email" flow, since there's no email/SMS channel in this app at all.
- **Order → resident/community join shape**: the contract doesn't specify
  whether `GET /admin/community/orders` or `GET /admin/retailer/orders` embed
  resident/community info directly on the order object, and under what key
  (`user` vs `resident`, `lines` vs `orderLines`). `src/api/normalize.ts`
  reads through several likely shapes defensively; if the backend lands on
  something different, that's the one file to adjust.
- **Status advance** is a single "Mark <next>" button (placed→packing→ready→
  collected) rather than a dropdown, since the contract states fulfillment is
  strictly linear.
- No pagination/search on any table yet — fine at seed-data scale (a few dozen
  residents/products, order lists per cycle); would add if real data volumes
  turn out larger.
