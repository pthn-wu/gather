// Promotion presentation helpers (CONTRACT.md §2 Promotion, §4.4).
//
// Prices arrive already adjusted from the server — the client never applies a
// mechanic itself. All this module does is name the promotion that applied and
// phrase the basket-wide ones, which are surfaced but deliberately *not*
// auto-applied to line prices in this pass.

import type { AppliedPromotion, BasketPromotion, Product } from '../api/types';

/** Short marker shown beside a promoted price — "Rice week · Unlock 50+ at 20". */
export function promoMarker(promo: AppliedPromotion | null | undefined): string | null {
  if (!promo) return null;
  return promo.value ? `${promo.name} · ${promo.value}` : promo.name;
}

/** Just the promotion name, for tight rows (the cart's unit-price column). */
export function promoName(promo: AppliedPromotion | null | undefined): string | null {
  return promo?.name ?? null;
}

/** The pre-promotion tier price, when the server sent one worth striking through. */
export function prePromoPrice(p: Product | undefined | null): number | null {
  if (!p || !p.promotion) return null;
  return p.basePrice != null && p.basePrice > p.price ? p.basePrice : null;
}

export function hasPromo(p: Product | undefined | null): boolean {
  return !!p?.promotion;
}

/** One sentence explaining a basket-wide promotion to a resident. */
export function basketPromoLine(promo: BasketPromotion): string {
  const scope = promo.scope ? ` on ${promo.scope}` : '';
  if (promo.mechanic === 'threshold') {
    return `${promo.value}${scope} — applied by the collection table, not on this screen.`;
  }
  if (promo.mechanic === 'bundle') {
    return `${promo.value}${scope} when bought together — applied at the collection table, not on this screen.`;
  }
  return `${promo.value}${scope}.`;
}

/** Basket-wide mechanics only — `tier`/`percent` promotions are already in the line prices. */
export function isBasketWide(promo: BasketPromotion): boolean {
  return promo.mechanic === 'bundle' || promo.mechanic === 'threshold';
}
