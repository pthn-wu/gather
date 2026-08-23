/** Money is an integer number of MMK; formatted `K 41,000` client-side only. */
export const money = (n: number) => "K " + Math.round(n || 0).toLocaleString("en-US");

/** Loose numeric parse used on every free-text price/qty field in the design. */
export const num = (v: unknown): number => {
  const n = parseFloat(String(v ?? "").replace(/[^0-9.\-]/g, ""));
  return isFinite(n) ? n : 0;
};

/** Which volume tier a unit count has unlocked: 0 base, 1 = 20+, 2 = 50+, 3 = 100+. */
export const tierOf = (units: number) => (units >= 100 ? 3 : units >= 50 ? 2 : units >= 20 ? 1 : 0);

export const marginPct = (price: number, cost: number) =>
  price ? Math.round((1 - cost / price) * 100) : 0;

export const initials = (name: string) =>
  name
    .replace(/·.*$/, "")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
