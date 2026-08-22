# Avatar updates with username

_Started 2026-08-21 06:40 UTC_

---

## User

Continuing from "Gather group ordering app".

## Assistant

We've been building Gather, a mobile-first group-buying app for condo communities in Myanmar. The core mission: residents pool orders to unlock tiered pricing (drops at 20/50/100 units), with automatic price calculation and collection at the lobby/guardhouse.

**Decisions made:**

- Dropped SMS verification entirely — accounts created by property admin, residents set their own password on first login and get a verified badge. No friction, no codes.
- Removed organiser tab; replaced with Community (splits/shares, wishlist, activity feed, collection buddy). Pricing stays fully automatic per SKU — no manual admin in-app.
- All pricing and copy localized to Myanmar Kyat and Yangon context (Paw San rice, Shan tomatoes, KBZPay/Wave Pay).
- Two builds: `Gather.dc.html` (web responsive), `Gather Phone.dc.html` (iPhone frame for app preview).
- Avatars on every account — 8 gradient options from the logo palette; used throughout (neighbours, comments, splits, activity).

**Current state:**

Four live communities (Gems 1–4, Towers 1–4), each with unit count, organiser roster, collection point, and cycle number. Home screen → sign in → pick community → catalog with live cutoff countdown → product detail with tier ladder → cart → payment (KBZPay QR or pay-on-collection) → collection slip. Account screen with avatar picker, password change, verified badge. Community tab shows savings, splits board, wishlist, activity feed. All pricing recalculated to realistic MMK levels.

**Open:**

Real product images (currently striped placeholders). Confirm whether catalog should vary by community or stay identical across all towers. Real street addresses for each tower.

**Files:** `Gather.dc.html`, `Gather Phone.dc.html`, `assets/gather-logo-alpha.png`.

## User

The avatar has to update once the username is changed. (it'll that the initials of the username). I also want the option of adding picture in the avatar.

## Assistant

_[tool: grep]_

_[tool: read_file]_

_[tool: read_file]_

_[tool: grep]_

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: dc_html_str_replace]_

_[tool: dc_html_str_replace]_

_[tool: ready_for_verification]_

Avatar initials now derive live from the username (`thida.aung` → TA, dots/underscores/hyphens all split), and the display name follows it too. Added a 9th tile in both avatar grids — dashed camera tile that opens a file picker and fills the circle with the uploaded photo; the photo then shows everywhere the avatar appears (header, account, comments you post). Picking a gradient clears the photo, and a "Remove photo" link appears while one is set.

## User

In the payment, I just want either pay with MMQR or pay on collection. MMQR is backed by CTZPay. one qr for all different payments. It should prompt a QR on the screen as attached.

## Assistant

_[tool: grep]_

_[tool: read_file]_

_[tool: copy_files]_

_[tool: grep]_

_[tool: read_file]_

Now the logic and template edits.

_[tool: dc_js_str_replace]_

_[tool: read_file]_

_[tool: read_file]_

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

Now the QR sheet in the checkout template.

_[tool: dc_html_str_replace]_

_[tool: grep]_

_[tool: dc_html_str_replace]_

_[tool: ready_for_verification]_

Payment is now two options only: **MMQR** (one QR for every bank and wallet, acquired by CTZPay) and **Pay on collection**. Tapping "Pay K … with MMQR" slides up a QR sheet with your attached code, amount, and order ref; "I've paid" completes the order and the slip reads *Paid via MMQR · CTZPay*.

## User

Found issues — fixing…

## Assistant

_[tool: run_script]_

_[tool: ready_for_verification]_

Sheet now scrolls and caps at the shell height, and the QR renders at its native 133px so it stays crisp. If you have a higher-res MMQR export, drop it in and I'll show it larger.

## User

Found issues — fixing…

## Assistant

_[tool: dc_html_str_replace]_

_[tool: ready_for_verification]_

QR now renders at its true aspect (133 × 144).

## User

Save as standalone HTML: `Gather.dc.html`

## Assistant

_[tool: grep]_

_[tool: run_script]_

_[tool: super_inline_html]_

_[tool: show_html]_

_[tool: get_webview_logs]_

_[tool: show_html]_

Renders offline with fonts, logo, and QR inlined.

_[tool: present_fs_item_for_download]_

Single 897 KB file — works fully offline, no internet needed.

