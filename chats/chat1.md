# Gather group ordering app

_Started 2026-08-21 04:45 UTC_

---

## User

Design a mobile friendly web app for online group ordering for a property or a community. The app name is called "Gather". The fulfilling merchant (Capital Retail) will list their products offering at the group buy pricing, with delivery every Tuesday and Friday. Let's start with Gems 1 (condo). Use the attached logo for the app and fonts as well as the colors in the logo for the full brand kit.

## User

Design a mobile friendly web app for online group ordering for a property or a community. The app name is called "Gather". The fulfilling merchant (Capital Retail) will list their products offering at the group buy pricing, with delivery every Tuesday and Friday. Let's start with Gems 1 (condo). Use the attached logo for the app and fonts as well as the colors in the logo for the full brand kit.

## Assistant

_[tool: ask_user]_

Form's up — waiting on your answers, mainly the screens to cover, pricing model, and fulfilment.

## User

Answered — screens: Catalog / this week's group buy, Product detail + quantity tiers, Cart & checkout, Order confirmation + pickup slip, My orders / history, Group progress ('X neighbours joined'), Onboarding + unit ver…; categories: Fresh produce, Meat & seafood, Rice, oil, pantry staples, Household & cleaning, Snacks & drinks, Baby & personal care, Bulk cases (paper, water), Frozen; pricing_model: Tiered: price drops as the block hits 20/50/100 units; fulfilment: Collect at lobby / guardhouse; cutoff: Countdown to cutoff (e.g. 'Sun 10pm — 2 days left'); payment: PayNow / QR, Pay on collecti…

## Assistant

_[tool: copy_files]_

_[tool: dc_write]_

_[tool: ready_for_verification]_

Gather is live as one interactive prototype — unit verification → catalog with live cutoff countdown → product detail with 20/50/100 tier ladder → cart → PayNow/pay-on-collection checkout → collection slip, plus orders, updates feed, and the organiser view (tier board, roster, broadcast).

Four explorations are wired as tweaks rather than separate screens: catalog layout (deals / grid / list), group-progress treatment (bar / pips), brand loudness (loud gradient / quiet), and community layer on/off. Product imagery is striped placeholders — send real shots and I'll drop them in.

## User

Found issues — fixing…

## Assistant

_[tool: dc_html_str_replace]_

_[tool: read_file]_

Now the home screen, standalone logo, and real nav icons.

_[tool: dc_html_str_replace]_

_[tool: dc_html_str_replace]_

_[tool: str_replace_edit]_

_[tool: ready_for_verification]_

Three changes:

- **Logo stands alone** — dropped the white card; it now sits on white ground on both the home and verify screens, with the gradient reserved for buttons and the catalog hero.
- **New home screen** — search + community list (Gems 1 open; Gems 2, Riverbend, Parc Aurora on waitlist/coming soon), then unit verification, with a "Change" link back. Only Gems 1 proceeds; the others log interest.
- **Nav icons redrawn** — storefront, receipt, bell with badge, and two-figure organiser mark, replacing the placeholder squares.

Also fixed the sticky header/tab bar (real inner scroller) and made product comments per-item.

## User

Found issues — fixing…

## User

Let's do Gems 1, Gems 2, Gems 3, Gems 4 to begin with. This is Gems condo for your reference (https://maps.app.goo.gl/hW2PubScfuBsmtyNA). I want you to show me in mobile screen as well, in case I also want it as an app.

## User

Let's do Gems 1, Gems 2, Gems 3, Gems 4 to begin with. This is Gems condo for your reference (https://maps.app.goo.gl/hW2PubScfuBsmtyNA). I want you to show me in mobile screen as well, in case I also want it as an app.

## Assistant

_[tool: copy_starter_component]_

_[tool: grep]_

_[tool: read_file]_

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

_[tool: dc_html_str_replace]_

Now the phone-frame view.

_[tool: dc_write]_

_[tool: ready_for_verification]_

Gems 1–4 are all live communities now (Towers 1–4), each with its own household count, tier progress, collection point, cycle number, order-code prefix and organiser roster — picking one on the home screen re-prices the whole catalog.

`Gather Phone.dc.html` shows the same build inside an iPhone frame, fully interactive, with safe-area padding handled. `Gather.dc.html` remains the web version.

One thing I guessed: addresses read "Gems Residences · Tower N · N units". Send me the real street and unit counts and I'll swap them in.

## User

Found issues — fixing…

## Assistant

_[tool: run_script]_

_[tool: run_script]_

_[tool: view_image]_

Clean cut-out. Swapping it in everywhere.

_[tool: run_script]_

_[tool: ready_for_verification]_

Cut the white ground out of the logo — `assets/gather-logo-alpha.png` is now a true transparent lockup (cropped to the mark), used on both files, so it sits on any background.

## User

I do not want the organiser tab, as prices will automatically lower per SKU as there are more people purchasing. That will be set by administrator in the back end. Instead replace with something fun like community social area.

## User

I do not want the organiser tab, as prices will automatically lower per SKU as there are more people purchasing. That will be set by administrator in the back end. Instead replace with something fun like community social area.

## User

I want everything in MMK (Myanmar Kyat). I want and account and verification will be linked to the account, I don't want constant SMS. Account will be created for you by the administrator. You can change the password and username. Verification will be done by the property owner. I also want avatars for the accounts

## Assistant

_[tool: read_file]_

_[tool: str_replace_edit]_

_[tool: read_file]_

_[tool: str_replace_edit]_

_[tool: read_file]_

_[tool: grep]_

_[tool: run_script]_

_[tool: str_replace_edit]_

_[tool: grep]_

_[tool: ready_for_verification]_

Done:

- **All prices in MMK** — formatted `K 41,000`, tiers and totals recalculated to realistic Yangon grocery levels; payment is now KBZPay QR / Wave Pay / pay on collection.
- **Account-based access, no SMS** — pick community → sign in with the username + temporary password the property office issues → first-run setup where you set your own username and password. Verification is a green badge on the account ("#14-07 verified by the property owner"), never a code.
- **Account screen** — tap your avatar in the header: unit + verified badge, avatar picker, username and password change, sign out. Unit/community are read-only, owned by the office.
- **Avatars everywhere** — 8 gradient avatars from the logo palette; neighbours, comments, splits, activity feed and the community hero all use them.

Product names and neighbours are now Myanmar-appropriate (Paw San rice, Shan tomatoes, etc.) — tell me if the catalog should differ.

## User

Found issues — fixing…

## Assistant

_[tool: str_replace_edit]_

_[tool: ready_for_verification]_

All four fixed: slip keeps the real item count, the setup step has its own title and copy, singular "1 tier unlocked", and the home screen now says to sign in with the office-issued account.

