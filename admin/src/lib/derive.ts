/**
 * Derived figures. These mirror the arithmetic in the design prototype so the
 * console reads identically when the API has not answered yet; wherever the v2
 * API returns the same numbers, the fetched payload wins.
 */
import type { Community, Order, Product } from "../api/types";
import { marginPct, num, tierOf } from "./format";

export interface Pick {
  product: Product;
  sku: string;
  name: string;
  unit: string;
  ordered: number;
  picked: number;
  tierIdx: number;
  cases: number;
  value: number;
  variance: number;
}

const TIERS = ["base", "20+", "50+", "100+"] as const;
export const tierLabel = (i: number) => TIERS[i];

export function buildPicks(
  products: Product[],
  comm: Community,
  pickedQty: Record<string, string>
): Pick[] {
  const f = comm.weightFactor ?? 1;
  return products
    .filter((p) => p.active && p.communityIds.includes(comm.id))
    .map((p) => {
      const ordered = Math.max(1, Math.round(p.unitsThisCycle * f));
      const key = `${comm.id}-${p.id}`;
      const raw = pickedQty[key];
      const picked = raw === undefined ? ordered : num(raw);
      const tierIdx = tierOf(ordered);
      return {
        product: p, sku: p.sku, name: p.name, unit: p.unit,
        ordered, picked, tierIdx,
        cases: Math.ceil(ordered / 12),
        value: p.prices[tierIdx] * ordered,
        variance: picked - ordered,
      };
    });
}

export interface BoardRow {
  community: Community;
  orders: number;
  units: number;
  value: number;
  margin: number;
  marginPct: number;
}

export function boardRow(c: Community, products: Product[], orders: Order[]): BoardRow {
  const f = c.weightFactor ?? 1;
  const priced = products.map((p) => {
    const t = tierOf(p.unitsThisCycle);
    return { price: p.prices[t], cost: p.cost ?? 0, units: p.unitsThisCycle };
  });
  const mine = orders.filter((o) => o.code.startsWith(c.id));
  const value = Math.round(priced.reduce((a, i) => a + i.price * i.units * f, 0) / 9);
  const margin = Math.round(priced.reduce((a, i) => a + (i.price - i.cost) * i.units * f, 0) / 9);
  return {
    community: c,
    orders: Math.max(mine.length, Math.round(c.households * 0.42)),
    units: Math.round((c.units ?? c.households * 2) * 0.72),
    value,
    margin,
    marginPct: value ? Math.round((margin / value) * 100) : 0,
  };
}

/** Live price + margin of a product at the tier its unit count has unlocked. */
export function livePrice(p: Product) {
  const t = tierOf(p.unitsThisCycle);
  return { tierIdx: t, price: p.prices[t], margin: marginPct(p.prices[t], p.cost ?? 0) };
}
