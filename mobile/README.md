# Gather — mobile app (React Native + Expo)

The resident-facing native app. Same backend, same logic and same features as the
desktop website in `../web` — see `../CONTRACT.md` §4 for the behaviours both clients
must implement.

Built from the phone design in `../project/Gather.dc.html`. **That design deliberately
keeps its own violet/gradient identity — it is not the desktop site's warm-paper
palette.** The desktop was restyled after review; the phone was explicitly left alone.
Don't "harmonise" the two.

## Run it

```bash
cd mobile
npm install
cp .env.example .env      # then edit EXPO_PUBLIC_API_URL if needed
npx expo start            # press i for iOS, a for Android, w for web
```

The backend must be running (`cd ../server && npm run dev`, port 4000).

**Physical device:** `localhost` on a phone means the phone, not your Mac. Set the API
URL to your machine's LAN IP:

```bash
EXPO_PUBLIC_API_URL=http://192.168.1.23:4000 npx expo start
```

Demo logins are the same as the web app — `thida.aung` / `gather123` for Gems 1
(`moe.thu`, `aye.chan`, `htet.aung` for Gems 2–4).

## What's in it

Community picker → sign-in → first-run account setup (avatar grid, photo upload,
username, password) → the tabbed app:

- **Shop** — gradient cutoff hero with a live countdown, basket-promotion banner,
  API-driven category chips with counts, product cards with real photos, brand/size,
  promotion-adjusted pricing and tier progress
- **Product** — full merchandising record (brand, size, gross weight, the
  resident-facing details the retail console writes), tier ladder with unlock state,
  quantity stepper, neighbour Q&A, offer-to-split
- **Your order** — line steppers, retail-vs-group saving, collection details
- **Checkout** — collection block, MMQR vs pay-on-collection, MMQR QR in a native
  sheet, note to the table
- **Orders** — search, filter chips, four-stage timeline driven by the real stages the
  back office advances, pay-now for unpaid orders
- **Updates** — published announcements only; office drafts never appear
- **Community** — splits, wishlist voting, live activity
- **Account** — avatar/photo, username, password, verified unit, sign out

Auth token is kept in `expo-secure-store` (localStorage on web); a 401 anywhere
returns to sign-in. Cart is client-side until checkout, exactly as the web build.

`cost` and margin are never requested or displayed — the server strips them for
resident tokens (CONTRACT.md §1).

## What was verified, and what wasn't

This container has no iOS simulator or Android emulator, so the app has **not** been
run on a real device. What was verified:

- `npx tsc --noEmit` — clean
- `npx expo export --platform web` — bundles clean (catches import/config/native-module errors)
- The exported web bundle was served and driven in Chromium at 402×874 against the
  **live** backend: community picker → sign-in → catalog → product → cart → checkout →
  MMQR sheet → "I've paid" → order placed, with zero console or page errors. The
  resulting order (`G1-2121`, paid, MMQR) was confirmed present in the database.

Run `npx expo start` and press `i`/`a` to exercise it on a real device — that's the
one gap.

> `expo install` and `expo export` need `EXPO_OFFLINE=1` in this sandbox, since the
> proxy blocks Expo's version-check endpoint. On a normal machine, drop the flag.

## Native follow-ons (deliberately not built)

The design notes these as what native unlocks. Neither is built — there's no push
infrastructure, and each is a project of its own:

- **Push notifications** for tier unlocks and cutoff reminders
- **Wallet pass** for the collection slip
