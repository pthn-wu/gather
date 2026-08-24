# The back office

Two consoles behind one sign-in, mounted by the site at `/office`.

- **Capital Retail** — the catalogue and its volume tiers, promotions, the
  fulfilment run across every property, cycle dates and demand. Sees landed cost
  and margin.
- **Property office** — one community only: verifying households, the roster,
  that community's orders, the collection table, payments, cycle setup and
  announcements. **Never sees cost or margin**, and the API enforces that rather
  than trusting this code (`server/src/lib/confidential.ts`).

## How it is mounted

This used to be a separate Vite app in `admin/`, deployed to its own domain. It
is now part of the site: one build, one deployment, `/` for residents and
`/office` for staff.

`web/src/App.tsx` lazily imports `OfficeApp` from `./office/App`, so the office
bundle is fetched only when someone opens `/office` — a shopper never downloads
it. The resident providers (cart, products, orders) deliberately do **not** wrap
this subtree; the office has its own `AuthProvider` and `StoreProvider`.

There is no router in here. `AuthContext` holds a `phase`
(`picker` → `auth` → `app`) and `store.tsx` holds the current screen key, so the
whole console is state-driven under the single `/office` route. That is why the
URL does not change as you move between screens.

## Sessions

Office credentials are stored under `gather_admin_token` / `gather_admin_user`,
distinct from the resident app's `gather_token`. Both can be signed in at once in
the same browser without either disturbing the other — worth keeping in mind when
testing, since signing out of one does not sign out of the other.

## Styles

`styles.css` is imported from `App.tsx` and is global once loaded. It shares the
palette with the storefront but owns the console-specific classes (`.sidebar`,
`.data-table`, `.btn`, `.card`, …). The storefront's `.card` hover was renamed to
`.res-card` when the two apps merged, because `.card` here paints a real panel.

## Spreadsheets

Import and export are client-side, via ExcelJS (`lib/sheet.ts`), lazily loaded so
its ~930 KB only arrives when an operator actually opens an import or export.
Seven import targets are defined in `lib/importTargets.ts`.
