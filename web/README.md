# Gather — customer web app

The resident-facing web app for Gather: browse this cycle's group-buy sheet, add items to your
order, check out, and track orders/community activity for your condo community. React +
TypeScript + Vite, calling the `server/` API described in `/CONTRACT.md` at the repo root.

Desktop only (1440px layout) — this is not a responsive/mobile build.

## Run it

```bash
npm install
cp .env.example .env   # then edit VITE_API_URL if your server isn't on localhost:4000
npm run dev            # http://localhost:5173
```

The backend (`server/`) needs to be running at `VITE_API_URL` (default
`http://localhost:4000`) for anything past the Home screen to load real data. Without it,
screens render their empty/error states instead of crashing (Home shows "Could not reach the
Gather server", etc).

```bash
npm run build    # type-check + production build to dist/
npm run preview  # serve the production build locally
```

## Structure

```
src/
  api/            fetch client (JWT header, 401 handling) + typed endpoint calls per CONTRACT.md
  context/        AuthContext, CartContext (client-side until checkout), ProductsContext,
                  OrdersContext, ToastContext
  components/     Shell (sidebar + nav), Avatar, Stepper, CartLineList, Toast
  pages/          Home, Auth/SignIn, Auth/AccountSetup, Shop, Product, Cart, Checkout,
                  OrderPlaced, Orders, Updates, Community, Account
  styles/         shared inline-style fragments (colors, cards, buttons, inputs) + global.css
  utils/          money/avatar/tier formatting, date + relative-time helpers, order view-model
```

Routing is React Router: `/` (community picker) and `/signin` / `/setup` are outside the app
shell; everything else (`/shop`, `/shop/:id`, `/cart`, `/checkout`, `/checkout/done`, `/orders`,
`/updates`, `/community`, `/account`) is nested under an authenticated `Shell` layout route with
the sticky sidebar.

Auth: JWT from `POST /api/auth/login` is stored in `localStorage` and sent as
`Authorization: Bearer <token>` on every request; a `401` clears it and bounces back to `/`.

Cart is client-side only (a `{productId: qty}` map in `localStorage`) until checkout, which
calls `POST /api/orders` to create the real order — matching CONTRACT.md's non-goals section.

## Known gaps / assumptions (backend wasn't running while this was built)

This was built against `/CONTRACT.md` with the server not yet available, so a few things are
best-effort assumptions the backend team should confirm:

- **Order line → product name/retail price.** The contract's `OrderLine` model only lists
  `productId`, not an embedded product. The UI needs the item name (and, for the "retail would
  have been" figure, its retail price) to render order rows/receipts, so it expects
  `GET /api/orders*` to embed `line.product`. If the server only returns `productId`, order rows
  will fall back to `Item {productId}` instead of a real name.
- **Comment author info.** Similarly, `GET /api/products/:id`'s `comments` are expected to carry
  `authorName`/`authorUnit`/`authorAvatarIndex` for the "Neighbours on this item" list. If not
  present, the UI falls back to a generic "Neighbour" label and a hashed avatar colour.
- **"Default payment"** on the Account screen has no field in the `User` model in CONTRACT.md, so
  it's stored client-side only (`localStorage`), pre-filling the radio at checkout. It is not
  synced to the server.
- **Home screen stats.** The prototype showed "towers live / households ordering / saved last
  cycle". `GET /api/communities` gives us the first two for real; there's no endpoint for
  cycle-over-cycle savings, so that third stat was dropped rather than faked.
- **Community screen stats** ("units on the sheet so far", "saved together this cycle") are
  computed client-side from the live product catalogue (`sum(joined)`,
  `sum((retailPrice - price) * joined)`) rather than fabricated — real numbers, just derived
  in the browser instead of by a dedicated endpoint.
- **"Since you joined" account stats** dropped the prototype's "Member since" line — `User` has
  no `createdAt` in CONTRACT.md — and "Collected on time" became "Collected so far" (an "on time"
  flag isn't in the `Order` model either).
- A few actions have no corresponding endpoint in CONTRACT.md and stay UI-only flourishes, exactly
  as they were in the prototype: "Register interest" on Home, "Collection pass"/"Edit order" on
  in-flight orders, "Receipt" download, and "Ask a neighbour" (collection buddy).
- "Reorder" on a received order adds its lines back into the current cart client-side (a genuine
  action, not just a toast) but only for products still present in the current catalogue.

## Not yet verified against a live server

The backend wasn't running while this was built, so integration was checked against a small
throwaway mock server implementing CONTRACT.md's shapes (not part of this repo) — sign-in →
first-run setup → shop → product detail → cart → checkout → order-placed → orders (with the
real `/pay` call) → updates → community → account, all with no console errors. Once `server/` is
up, worth a real pass for: exact error-message shapes on 4xx responses, and the two embedding
assumptions above.
