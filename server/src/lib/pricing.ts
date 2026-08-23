// Tier thresholds for "units joined" -> tier index, per CONTRACT.md:
// Tier index = joined>=100?3:joined>=50?2:joined>=20?1:0
export const TIER_THRESHOLDS = [0, 20, 50, 100];
export const TIER_LABELS = ['Base price', '20+ units', '50+ units', '100+ units'];
export const TIER_SHORT = ['base', '20+', '50+', '100+'];

// The seven v2 categories (project/Gather Back Office.dc.html — CATS).
export const CATEGORIES = [
  'Grocery',
  'Grocery Non-Food',
  'Hardline',
  'Softline',
  'Homeline',
  'Pharmacy',
  'Fresh & Frozen',
];

// Fulfilment stages (design STAGE_LIST).
export const STAGE_LIST = [
  { key: 'open', label: 'Sheet open', when: 'until cutoff' },
  { key: 'confirmed', label: 'Orders confirmed', when: 'Sun 10pm' },
  { key: 'picking', label: 'Picking at DC', when: 'Mon 06:00' },
  { key: 'packed', label: 'Packed per unit', when: 'Mon 18:00' },
  { key: 'dispatched', label: 'Dispatched', when: 'Tue 16:00' },
];
export const STAGE_KEYS = STAGE_LIST.map((s) => s.key);

export const PROMO_MECHANICS = ['tier', 'percent', 'bundle', 'threshold'] as const;
export type PromoMechanic = (typeof PROMO_MECHANICS)[number];

export function tierIndexForJoined(joined: number): number {
  if (joined >= 100) return 3;
  if (joined >= 50) return 2;
  if (joined >= 20) return 1;
  return 0;
}

export interface TieredProduct {
  retailPrice: number;
  price0: number;
  price1: number;
  price2: number;
  price3: number;
}

export function priceForTier(product: TieredProduct, tierIndex: number): number {
  return [product.price0, product.price1, product.price2, product.price3][tierIndex];
}

export function savePctFor(product: TieredProduct, price: number): number {
  if (!product.retailPrice) return 0;
  return Math.round(((product.retailPrice - price) / product.retailPrice) * 100);
}

export function progressFor(joined: number, tierIndex: number): { next: number | null; unitsToNext: number } {
  if (tierIndex >= 3) return { next: null, unitsToNext: 0 };
  const next = TIER_THRESHOLDS[tierIndex + 1];
  return { next, unitsToNext: Math.max(0, next - joined) };
}

// ---------------------------------------------------------------------------
// Promotions
// ---------------------------------------------------------------------------

export interface PromotionLike {
  id: string;
  name: string;
  mechanic: string;
  value: string;
  productId: string | null;
  startsAt: Date;
  endsAt: Date;
  live: boolean;
  uptakeNote?: string;
}

export interface AppliedPromotion {
  id: string;
  name: string;
  mechanic: string;
  value: string;
  productId: string | null;
}

/** A promotion counts for a resident when it is live and today is inside its window. */
export function promotionIsActive(promo: PromotionLike, now = new Date()): boolean {
  if (!promo.live) return false;
  return promo.startsAt.getTime() <= now.getTime() && now.getTime() <= promo.endsAt.getTime();
}

function numbersIn(value: string): number[] {
  return (value.match(/-?\d[\d,.]*/g) || []).map((n) => Number(n.replace(/[,]/g, '')));
}

/**
 * `tier` — "Unlock 50+ at 20": treat the product as if it had reached the 50+ tier
 * once 20 units are on the sheet. First number = the tier being unlocked,
 * second number (optional) = the unit count that qualifies for it.
 */
function tierPromoPrice(product: TieredProduct, promo: PromotionLike, joined: number): number | null {
  const nums = numbersIn(promo.value);
  if (!nums.length) return null;
  const targetIndex = TIER_THRESHOLDS.indexOf(nums[0]);
  if (targetIndex < 0) return null;
  const qualifyingUnits = nums.length > 1 ? nums[1] : 0;
  if (joined < qualifyingUnits) return null;
  return priceForTier(product, targetIndex);
}

/** `percent` — "10%": reduce the effective price by N%. */
function percentPromoPrice(basePrice: number, promo: PromotionLike): number | null {
  const nums = numbersIn(promo.value);
  if (!nums.length) return null;
  const pct = nums[0];
  if (!(pct > 0) || pct >= 100) return null;
  return Math.round(basePrice * (1 - pct / 100));
}

export interface PricedProduct {
  tierIndex: number;
  basePrice: number;
  price: number;
  savePct: number;
  promotion: AppliedPromotion | null;
}

/**
 * Per-line price for one product given the units joined in this community and the
 * promotions live there.
 *
 * - `tier` and `percent` adjust the per-line price (CONTRACT.md §2).
 * - `bundle` / `threshold` are basket-level and are surfaced separately, never applied here.
 * - A promotion may only ever LOWER a price — the result is clamped with Math.min.
 * - If several promotions apply, the cheapest wins and is the one reported.
 */
export function priceProduct(
  product: TieredProduct,
  joined: number,
  promotions: PromotionLike[],
  now = new Date()
): PricedProduct {
  const tierIndex = tierIndexForJoined(joined);
  const basePrice = priceForTier(product, tierIndex);

  let price = basePrice;
  let winner: AppliedPromotion | null = null;

  for (const promo of promotions) {
    if (!promotionIsActive(promo, now)) continue;
    let candidate: number | null = null;
    if (promo.mechanic === 'tier') candidate = tierPromoPrice(product, promo, joined);
    else if (promo.mechanic === 'percent') candidate = percentPromoPrice(basePrice, promo);
    if (candidate === null) continue;
    // Never upward.
    const clamped = Math.min(basePrice, candidate);
    if (clamped < price) {
      price = clamped;
      winner = { id: promo.id, name: promo.name, mechanic: promo.mechanic, value: promo.value, productId: promo.productId };
    }
  }

  return { tierIndex, basePrice, price, savePct: savePctFor(product, price), promotion: winner };
}

/** Basket-level promotions (bundle / threshold): shown as a shop banner + a cart line. */
export function basketPromotions(promotions: PromotionLike[], now = new Date()): AppliedPromotion[] {
  return promotions
    .filter((p) => promotionIsActive(p, now))
    .filter((p) => p.mechanic === 'bundle' || p.mechanic === 'threshold')
    .map((p) => ({ id: p.id, name: p.name, mechanic: p.mechanic, value: p.value, productId: p.productId }));
}

/** Promotions that could apply to a given product line (its own, plus basket-wide per-line ones). */
export function promotionsForProduct(productId: string, promotions: PromotionLike[]): PromotionLike[] {
  return promotions.filter((p) => p.productId === null || p.productId === productId);
}
