import type { Community } from '../api/types';
import { formatCutoff as formatCutoffFromCommunity } from './cycle';

/**
 * Cutoff formatting. Prefer `formatCutoff(community)` from `utils/cycle` —
 * this overload keeps call sites that only hold the ISO string working.
 */
export function formatCutoff(source: string | Community | null | undefined): string {
  if (typeof source === 'string' || source == null) {
    return formatCutoffFromCommunity(source ? ({ cutoffAt: source } as Community) : null);
  }
  return formatCutoffFromCommunity(source);
}

export function tierNoteForIndex(tierIndex: number): string {
  return tierIndex >= 3 ? 'top tier' : tierIndex === 2 ? 'tier 2' : tierIndex === 1 ? 'tier 1' : 'group price';
}

/**
 * The v2 category set (CONTRACT.md §2 Product) — used only to give the shop's
 * tabs a stable, merchandised order. The tabs themselves are whatever the API
 * reports; anything outside this list is appended alphabetically, so a category
 * the retail console adds later still shows up.
 */
export const PREFERRED_CATEGORY_ORDER = [
  'Fresh & Frozen',
  'Grocery',
  'Grocery Non-Food',
  'Homeline',
  'Hardline',
  'Softline',
  'Pharmacy',
];

export function orderCategories(categories: string[]): string[] {
  const seen = Array.from(new Set(categories.filter((c) => !!c && c !== 'All')));
  const known = PREFERRED_CATEGORY_ORDER.filter((c) => seen.includes(c));
  const rest = seen.filter((c) => !PREFERRED_CATEGORY_ORDER.includes(c)).sort();
  return [...known, ...rest];
}
