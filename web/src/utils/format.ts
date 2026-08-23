// Formatting helpers ported 1:1 from the prototype's client-side logic
// (money formatting itself is client-only per CONTRACT.md — the server
// only ever sends integer MMK).

export const money = (n: number): string => 'K ' + Math.round(n).toLocaleString('en-US');

export const AVATARS: [string, string][] = [
  ['#C026D3', '#6D28D9'],
  ['#F4485F', '#C026D3'],
  ['#FB9C3C', '#F4485F'],
  ['#4F46E5', '#06B6D4'],
  ['#0F9268', '#4F46E5'],
  ['#6D28D9', '#4F46E5'],
  ['#A855B8', '#F4485F'],
  ['#1E1926', '#4F46E5'],
];

export const gradientCss = (a: string, b: string): string => `linear-gradient(135deg, ${a}, ${b})`;

export const avatarGradient = (index: number): string => {
  const pair = AVATARS[index % AVATARS.length];
  return gradientCss(pair[0], pair[1]);
};

/** "Thida Aung" -> "TA", "thida.aung" -> "TA", falls back to "YOU". */
export const initialsFromName = (name: string): string => {
  const parts = (name || '').split(/[.\-_\s]+/).filter(Boolean);
  if (!parts.length) return 'YOU';
  return parts
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
};

const TIER_MARKS = [20, 50, 100];

export const tierIndexForJoined = (joined: number): number =>
  joined >= 100 ? 3 : joined >= 50 ? 2 : joined >= 20 ? 1 : 0;

export const nextTierMark = (joined: number): number | undefined => TIER_MARKS.find((m) => joined < m);

/** Deterministic fallback avatar index for entities the API doesn't attach one to. */
export const hashToAvatarIndex = (seed: string): number => {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return h % AVATARS.length;
};

export const tierNoteForJoined = (joined: number): string =>
  joined >= 100 ? 'top tier' : joined >= 50 ? 'tier 2' : joined >= 20 ? 'tier 1' : 'group price';
