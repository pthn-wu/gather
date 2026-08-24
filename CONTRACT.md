# Gather — API contract v2 (backend ⇄ customer web ⇄ back office)

Shared reference for two codebases: `server/` (API) and `web/` (the site). The site serves
both audiences from one build — the resident storefront at `/`, and the **back office** (two
consoles) at `/office`, whose source lives in `web/src/office/`. Supersedes v1. Where v2 differs from what is
already built, **v2 wins** and the existing code must be migrated to it.

v2 exists because the product owner supplied a back-office design
(`project/Gather Back Office.dc.html` — read it, it is the authority on layout, copy and flow).
The v1 admin was a thin two-role CRUD dashboard; v2 is the real operational back office.

Stack unchanged: Node + TypeScript + Express + Prisma + SQLite, JWT + bcrypt, React + Vite
front ends. Money is an integer number of MMK; format `K 41,000` client-side only.
List endpoints return `{ data: [...] }`; single resources return the object; errors
`{ error: string }`.

---

## 1. The two consoles (this is the core of v2)

The back office is **one app** with a role switch in the top bar and a **console picker →
sign-in** gate in front of it. Residents never sign in here.

| | **Retail console** (Capital Retail) | **Property office console** |
|---|---|---|
| Role value | `retail` | `office` |
| Scope | every contracted community | exactly one community |
| Sees cost & margin | **yes** | **never** |
| Screens | Overview · Catalog & pricing · Promotions · Fulfilment · Cycles & accounts · Resident demand | Verification · Households · Orders · Collection sheet · Payments & cash-up · Cycle setup · Announcements |

**Margin confidentiality is a hard rule.** `cost`, `margin`, and any derived
profit figure must never appear in a response to an `office` token or a resident token.
Enforce it server-side in the serializer, not in the UI.

Demo logins to seed: office `gems1.office` / `office-2026` (one per community:
`gems2.office`, `gems3.office`, `gems4.office`), retail `ye.naing@capitalretail.mm` /
`retail-2026`.

---

## 2. Data model changes (Prisma)

### Changed: `AdminUser`
`role` becomes `"office" | "retail"` (was `"community" | "retailer"` — migrate existing rows).
Add `email`, keep `communityId` non-null iff `role="office"`.

### Changed: `Community`
Add: `cutoffDate` (Date), `deliveryDate` (Date), `collectionWindow` (String, e.g. `"6–9pm"`),
`contractStatus` (`"Signed" | "Pilot" | "Lapsed"`), `blocksCovered` (String, e.g. `"A, B, C"`),
`officeContact` (String), `weightFactor` (Float — demand scaling vs the largest tower).

### Changed: `Product` — now a real merchandising record
Add: `sku` (unique), `brand`, `barcode`, `size`, `grossWeight`, `details` (long text shown to
residents), `cost` (landed cost, **retail-only**), `imageUrl` (nullable; data URL or uploaded path).
`category` now one of exactly: `Grocery`, `Grocery Non-Food`, `Hardline`, `Softline`,
`Homeline`, `Pharmacy`, `Fresh & Frozen`. (The old category strings are gone — migrate the 12
seeded products onto the new set; see the design file's `ITEMS` array for the exact mapping,
brand, barcode, size, weight, details and cost of all 16 products, and seed all 16.)

### New: `ProductCommunity` (listing scope)
`productId`, `communityId` — a product is only orderable in the communities it is listed at.
The resident catalog **must** filter on this.

### New: `Promotion`
`id, name, mechanic ("tier"|"percent"|"bundle"|"threshold"), value (String — the design keeps
this human-readable, e.g. "Unlock 50+ at 20", "10%", "K 2,500 off"), productId (nullable — null
means basket-wide), startsAt, endsAt, live (bool), uptakeNote (String)`
plus `PromotionCommunity` join (`promotionId`, `communityId`).

Promotion application rules (server-side, in the price computation):
- `tier` — treat the product as if it had reached the named tier, for the listed communities.
- `percent` — reduce the effective price by N%.
- `bundle` / `threshold` — surfaced to residents as a banner on the shop and a line on the
  cart; not auto-applied to per-line prices in this pass. Say so in the UI copy.
- **A promotion may only ever lower a price, never raise it.**

### Changed: `User` (resident/household)
Add: `phone`, `accountState` (`"none" | "issued" | "active" | "suspended"`),
`tempPassword` (nullable, cleared when the resident sets their own),
`memberSince` (Date, nullable), `blockUnit` — keep existing `block`/`unit`.
`accountState="none"` means a roster row with no login yet (the office has not issued one).

### New: `VerificationRequest`
`id, communityId, name, unit, phone, kind ("New unit claim"|"Tenant change"|"Second login"),
rosterMatch (String), proof (String), requestedVia (String), note (String),
status ("pending"|"approved"|"held"|"rejected"), createdAt, resolvedAt, resolutionNote`.
Approving one creates the `User` (accountState `issued` + generated temp password).

### New: `FulfilmentRun`
`id, communityId, cycleNo, stage ("open"|"confirmed"|"picking"|"packed"|"dispatched"),
updatedAt`. One per community per cycle.

### New: `PickLine`
`id, fulfilmentRunId, productId, orderedQty, pickedQty (nullable — null = not counted yet)`.
Variance = `pickedQty - orderedQty`.

### New: `CashUp`
`id, communityId, cycleNo, expectedAmount, countedAmount, variance, submittedAt, submittedBy`.

### Changed: `Order`
Add: `collectedBy` (String, nullable — who actually picked it up),
`collectedAt` already exists. Payment state is the existing `paid` bool + `paymentMethod`.

### Changed: `Alert` → announcements
Add: `isDraft` (bool), `authorAdminId`, `reachCount`, `openedCount`.
Office publishes these; they are what residents see in **Updates**.

### Changed: `Wishlist`
Add: `addedToCatalog` (bool), `householdCount` (Int, derived/stored).

---

## 3. Endpoints

Existing resident endpoints (`/api/auth/*`, `/api/products`, `/api/orders`, `/api/wishlist`,
`/api/splits`, `/api/activity`, `/api/alerts`) keep their paths and shapes, **extended** with
the new product fields (minus `cost`) and promotion-adjusted prices.

### Back-office auth
- `POST /api/admin/login` `{username, password, communityId?}` → `{token, admin}`.
  `admin` = `{id, role, communityId, communityLabel, displayName, username, email}`.

### Retail console — `/api/admin/retail/*` (role `retail`, all communities)
- `GET /overview?scope=all|<communityId>` → `{kpis[], board[], todos[], movers[]}`
  (board row: community, orders, units, value, margin, marginPct, stage)
- `GET /products?q=&category=` · `POST /products` · `PATCH /products/:id` · `DELETE /products/:id`
  (full record incl. cost/margin; `PATCH` accepts `communityIds` to set the listing scope)
- `POST /products/bulk` `{rows: [...]}` — upsert matched on `sku`; unknown SKUs created
  inactive as drafts. Column names per the design's import template.
- `GET /promotions` · `POST /promotions` · `PATCH /promotions/:id` (incl. `live` toggle) ·
  `POST /promotions/bulk`
- `GET /fulfilment/:communityId` → `{run, stage, stages[], lines[], summary}`
- `PATCH /fulfilment/:communityId/lines` `{lines:[{productId, pickedQty}]}` (also the
  "import counts" path)
- `POST /fulfilment/:communityId/advance` → moves to the next stage
- `GET /cycles` · `PATCH /cycles/:communityId` `{cutoffDate?, deliveryDate?, collectPoint?}` ·
  `POST /cycles/:communityId/publish` (publishes the sheet → residents see the new cycle)
- `GET /demand` → wishlist aggregated across communities · `POST /demand/:id/add-to-catalog`

### Office console — `/api/admin/office/*` (role `office`, scoped to own community)
- `GET /verifications` · `POST /verifications/:id/approve` (creates the account, returns the
  temp password) · `POST /verifications/:id/hold` · `POST /verifications/:id/reject`
- `GET /verifications/log` — handled today
- `GET /roster?q=` · `POST /roster` · `PATCH /roster/:id` · `POST /roster/bulk`
- `POST /roster/issue-accounts` `{userIds:[]}` → issues logins + temp passwords, returns the
  credential slips
- `POST /roster/:id/reset-password` · `POST /roster/:id/suspend`
- `GET /orders?filter=all|open|due|collected`
- `GET /collection` → `{stats, rows}` (rows = orders at stage ≥ packing) ·
  `POST /collection/tick` `{orderIds:[], collected:bool, collectedBy?}` ·
  `POST /collection/close`
- `GET /payments` → ledger · `POST /payments/:orderId/mark-paid` ·
  `POST /payments/bulk-reconcile` `{rows:[{orderCode, amount, method}]}` ·
  `GET /cashup` · `POST /cashup` `{countedAmount}` → stores + returns variance
- `GET /setup` · `PATCH /setup` `{collectPoint?, collectionWindow?, cutoffDate?,
  deliveryDate?, blocksCovered?, officeContact?}` → **notifies residents**
- `GET /announcements` · `POST /announcements` `{title, body, isDraft}` ·
  `PATCH /announcements/:id`

### Import / export
Spreadsheet parsing happens **client-side in `web/src/office/`** using ExcelJS, exactly as the
design does: read the file → show the preview modal → POST the parsed rows to the relevant
`/bulk` or batch endpoint above. Exports are generated client-side from already-fetched data.
Seven import targets, with the blank-template columns given in the design file's `T` object:
`catalog`, `roster`, `picked`, `collect`, `payments`, `cycles`, `promos`.

---

## 4. What must change in `web/` (the resident app)

The whole point of v2 is that back-office edits show up for residents. Concretely:

1. **Product detail** — show `brand`, `size`, `grossWeight`, and the `details` paragraph the
   retail console writes. Show the real `imageUrl` when set; keep the striped placeholder only
   as the fallback. Never show `cost`.
2. **Categories** — the shop's category tabs come from the new 7-category set, driven by the
   API, not a hardcoded list.
3. **Listing scope** — the catalog only shows products listed at the resident's community
   (`ProductCommunity`). A delisted item disappears from their sheet.
4. **Promotions** — promo-adjusted prices on the shop grid, product page and cart, with a
   visible marker of which promotion applied; basket-wide promos (`bundle`, `threshold`) shown
   as a banner/cart line.
5. **Cycle data** — sidebar countdown, cutoff, delivery day, collection point and window all
   come from the community record the office edits in Cycle setup, not from constants.
6. **Updates feed** — renders published announcements (never drafts).
7. **Orders** — the 4-stage resident timeline stays, but is driven by the real order stage the
   office/retail consoles advance; payment state reflects `mark-paid` / reconciliation done in
   the office console.
8. **Account** — `phone` and verified state reflect the roster/verification record.

`Gather Phone.dc.html` / `Gather.dc.html` (mobile) are still **not** being built — desktop web
only, per the agreed scope. If a change would obviously also belong in the phone build, note it
in the README rather than building it.

---

## 5. Non-goals (unchanged)

No real MMQR/CTZPay gateway — checkout shows the QR asset and an "I've paid" action.
No SSO for the retail console (password auth for now; the design says SSO in production).
No mobile build.
