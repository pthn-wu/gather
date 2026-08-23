/**
 * Spreadsheet column matching for the /bulk endpoints.
 *
 * The admin app parses .xlsx/.csv client-side with SheetJS and POSTs the raw rows,
 * so the server has to recognise the same loose column names the design's importer
 * does: case, spacing and punctuation are ignored (`Tier 20`, `tier20`, `T20`).
 * Mirrors the `get()` helper and the `T` template object in
 * project/Gather Back Office.dc.html.
 */

export type Row = Record<string, unknown>;

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

/** First non-empty value in `row` whose column name matches one of `keys`. */
export function get(row: Row, keys: string[]): unknown {
  for (const key of keys) {
    const hit = Object.keys(row).find((col) => norm(col) === key);
    if (hit !== undefined && row[hit] !== '' && row[hit] !== null && row[hit] !== undefined) return row[hit];
  }
  return undefined;
}

export function str(row: Row, keys: string[], fallback: string): string {
  const v = get(row, keys);
  return v === undefined ? fallback : String(v).trim();
}

export function num(value: unknown): number {
  const n = parseFloat(String(value).replace(/[^0-9.\-]/g, ''));
  return Number.isFinite(n) ? n : 0;
}

export function intOr(row: Row, keys: string[], fallback: number): number {
  const v = get(row, keys);
  return v === undefined ? fallback : Math.round(num(v));
}

export function boolish(value: unknown): boolean {
  const v = String(value ?? '').trim().toLowerCase();
  return v === 'yes' || v === 'y' || v === '1' || v === 'true' || v === 'collected';
}

export function splitList(value: string): string[] {
  return value
    .split(/[,;]/)
    .map((x) => x.trim())
    .filter(Boolean);
}

/** Column aliases, one place, shared by the catalog importer and the seed. */
export const COLS = {
  sku: ['sku', 'skucode', 'itemcode'],
  name: ['item', 'name', 'itemname', 'description'],
  brand: ['brand', 'supplier'],
  barcode: ['barcode', 'ean', 'upc'],
  category: ['category', 'cat', 'department'],
  pack: ['pack', 'packsize', 'unit', 'uom'],
  size: ['size', 'volume', 'netcontent'],
  weight: ['weight', 'grossweight', 'kg'],
  details: ['details', 'itemdetails', 'notes', 'longdescription'],
  image: ['imageurl', 'image', 'photo', 'photourl'],
  cost: ['cost', 'landedcost', 'unitcost'],
  retail: ['retail', 'shelfretail', 'rrp'],
  base: ['base', 'baseprice', 'groupprice'],
  tier20: ['tier20', 't20', '20units'],
  tier50: ['tier50', 't50', '50units'],
  tier100: ['tier100', 't100', '100units'],
  communities: ['communities', 'towers', 'where'],
  unit: ['unit'],
  household: ['household', 'name', 'resident'],
  phone: ['phone', 'mobile'],
  picked: ['picked', 'count', 'qty'],
  order: ['order', 'code'],
  collected: ['collected', 'tick', 'done'],
  amount: ['amount', 'total', 'value'],
  method: ['method'],
  community: ['community', 'name'],
  cutoff: ['cutoff'],
  delivery: ['delivery'],
  point: ['point', 'collectionpoint'],
  promoName: ['name'],
  mechanic: ['mechanic', 'kind'],
  value: ['value'],
  from: ['from'],
  to: ['to'],
};
