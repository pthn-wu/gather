// Tolerant readers for the v2 payloads.
//
// The backend is migrating to CONTRACT.md v2 while this app is being built, so
// every v2 field is read defensively: a couple of plausible server-side names
// are accepted, anything unrecognised is dropped, and the canonical client
// shape in `types.ts` is what the rest of the app sees.
//
// `cost` and `margin` are stripped here as a second line of defence — the
// server must never send them to a resident token, and if one ever leaks
// through it will not reach a component.

import type {
  Alert,
  AppliedPromotion,
  BasketPromotion,
  Product,
  ProductDetail,
  PromotionMechanic,
} from './types';

const MECHANICS: PromotionMechanic[] = ['tier', 'percent', 'bundle', 'threshold'];

function str(v: unknown): string | undefined {
  return typeof v === 'string' && v.trim() ? v.trim() : undefined;
}

function num(v: unknown): number | undefined {
  return typeof v === 'number' && Number.isFinite(v) ? v : undefined;
}

function mechanicOf(v: unknown): PromotionMechanic {
  const s = String(v ?? '').toLowerCase();
  return (MECHANICS.find((m) => m === s) ?? 'percent') as PromotionMechanic;
}

/** Reads the promotion the server attached to a priced line, if any. */
export function normalizeAppliedPromotion(raw: unknown): AppliedPromotion | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const name = str(r.name) ?? str(r.promotionName) ?? str(r.label);
  if (!name) return null;
  return {
    id: String(r.id ?? r.promotionId ?? name),
    name,
    // the design's demo data calls the field `kind`; the contract calls it `mechanic`
    mechanic: mechanicOf(r.mechanic ?? r.kind),
    value: str(r.value) ?? '',
  };
}

/** Reads a basket-wide (`bundle` / `threshold`) promotion. */
export function normalizeBasketPromotion(raw: unknown): BasketPromotion | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const name = str(r.name);
  if (!name) return null;
  return {
    id: String(r.id ?? name),
    name,
    mechanic: mechanicOf(r.mechanic ?? r.kind),
    value: str(r.value) ?? '',
    scope: str(r.scope) ?? str(r.item) ?? str(r.productName) ?? null,
    startsAt: str(r.startsAt) ?? str(r.from) ?? null,
    endsAt: str(r.endsAt) ?? str(r.to) ?? null,
  };
}

function stringList(v: unknown): string[] | undefined {
  if (!Array.isArray(v)) return undefined;
  const out = v
    .map((entry) => {
      if (typeof entry === 'string') return entry;
      if (entry && typeof entry === 'object') {
        const e = entry as Record<string, unknown>;
        return str(e.communityId) ?? str(e.id);
      }
      return undefined;
    })
    .filter((s): s is string => !!s);
  return out.length ? out : undefined;
}

/**
 * Normalizes one product row. Keeps every v1 field untouched, adds the v2
 * merchandising/promotion fields, and drops `cost`/`margin`.
 */
export function normalizeProduct<T extends Product>(raw: unknown): T {
  const r = { ...(raw as Record<string, unknown>) };

  // Margin confidentiality — never let these reach a component.
  delete r.cost;
  delete r.margin;
  delete r.marginPct;
  delete r.landedCost;

  const promotion =
    normalizeAppliedPromotion(r.promotion) ?? normalizeAppliedPromotion(r.appliedPromotion);

  const basePrice =
    num(r.basePrice) ?? num(r.prePromoPrice) ?? num(r.priceBeforePromotion) ?? undefined;

  const price = num(r.price) ?? 0;

  return {
    ...(r as unknown as T),
    imageUrl: str(r.imageUrl) ?? null,
    brand: str(r.brand) ?? null,
    barcode: str(r.barcode) ?? null,
    size: str(r.size) ?? null,
    grossWeight: str(r.grossWeight) ?? str(r.weight) ?? null,
    details: str(r.details) ?? null,
    sku: str(r.sku),
    promotion,
    // A promotion may only ever lower a price — ignore a "base" below the
    // effective price rather than rendering a nonsensical strike-through.
    basePrice: basePrice != null && basePrice > price ? basePrice : null,
    communityIds: stringList(r.communityIds) ?? stringList(r.communities) ?? undefined,
  } as T;
}

export function normalizeProductDetail(raw: unknown): ProductDetail {
  return normalizeProduct<ProductDetail>(raw);
}

/**
 * Residents see published announcements only. A draft is anything explicitly
 * flagged `isDraft` (or `draft`) — absent means published, so v1 rows still show.
 */
export function isPublishedAlert(raw: Alert & { draft?: boolean }): boolean {
  return raw.isDraft !== true && raw.draft !== true;
}

export function normalizeAlert(raw: unknown): Alert {
  const r = raw as Record<string, unknown>;
  return {
    ...(r as unknown as Alert),
    isDraft: r.isDraft === true || r.draft === true,
    reachCount: num(r.reachCount),
    openedCount: num(r.openedCount),
  };
}
