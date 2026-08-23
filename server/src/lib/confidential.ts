import type { NextFunction, Request, Response } from 'express';

/**
 * Margin confidentiality (CONTRACT.md §1).
 *
 * `cost`, `margin` and every derived profit figure belong to Capital Retail alone.
 * They must never reach a property-office token or a resident token — and it must not
 * be possible to leak one by forgetting a field in a route, by adding a Prisma
 * `include` that drags a Product along, or by writing a new endpoint that returns a
 * raw row.
 *
 * So the rule is enforced at the single choke point every response passes through:
 * `res.json`. `confidentialityGuard` wraps it, and for any request that is NOT
 * authenticated as a `retail` admin, the payload is deep-scrubbed of confidential
 * keys before it is serialised. It is deny-by-default: an unauthenticated or
 * resident request is scrubbed exactly like an office one, so a new public route
 * cannot leak either.
 */

// Names that are confidential outright.
const CONFIDENTIAL_KEYS = new Set([
  'cost',
  'costs',
  'margin',
  'margins',
  'profit',
  'landedcost',
  'unitcost',
  'costprice',
  'contribution',
]);

// Structural patterns: anything cost-ish, margin-ish or profit-ish, whatever it is called.
// e.g. `cost`, `costPrice`, `landedCost`, `marginPct`, `marginAmount`, `blendedMargin`,
// `grossProfit`, `profitMmk`, `totalCost`, `costOfGoods`.
function isConfidentialKey(key: string): boolean {
  const k = key.toLowerCase().replace(/[^a-z]/g, '');
  if (CONFIDENTIAL_KEYS.has(k)) return true;
  if (k.includes('margin')) return true;
  if (k.includes('profit')) return true;
  if (k.startsWith('cost') || k.endsWith('cost')) return true;
  return false;
}

/** Deep copy of `value` with every confidential key removed, at any depth. */
export function stripConfidential<T>(value: T, seen = new WeakSet<object>()): T {
  if (value === null || typeof value !== 'object') return value;
  if (value instanceof Date) return value;
  if (seen.has(value as unknown as object)) return value; // cycle guard
  seen.add(value as unknown as object);

  if (Array.isArray(value)) {
    return value.map((item) => stripConfidential(item, seen)) as unknown as T;
  }

  const out: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    if (isConfidentialKey(key)) continue;
    out[key] = stripConfidential(entry, seen);
  }
  return out as unknown as T;
}

/** True when the request is authenticated as a Capital Retail admin. */
export function maySeeMargin(req: Request): boolean {
  return req.admin?.role === 'retail';
}

/**
 * Express middleware. Install it once, before the routers, and every response
 * is filtered on the way out. Routes stay free to select `cost` from Prisma —
 * the guard is what decides whether it survives to the wire.
 */
export function confidentialityGuard(req: Request, res: Response, next: NextFunction) {
  const originalJson = res.json.bind(res);
  res.json = ((body: unknown) => {
    // req.admin is populated by requireAdmin() which runs after this middleware but
    // before the route handler calls res.json — so it is read here at call time.
    if (maySeeMargin(req)) return originalJson(body);
    return originalJson(stripConfidential(body));
  }) as Response['json'];
  next();
}

/** Exported for tests / assertions. */
export const __confidential = { isConfidentialKey, CONFIDENTIAL_KEYS };
