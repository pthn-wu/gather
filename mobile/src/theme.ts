/**
 * Design tokens lifted from `project/Gather.dc.html` — the phone design.
 *
 * NOTE: the phone deliberately keeps its own violet/gradient identity. It is NOT
 * the desktop site's warm-paper palette, and that was a product decision (the
 * desktop was restyled after review; the phone was explicitly left alone). Do not
 * "harmonise" these values with `web/`.
 */

export const C = {
  /** App ground behind the white surface. */
  wash: "#EFECF6",
  washTop: "#E4DEF6",
  surface: "#FFFFFF",

  ink: "#1B2136",
  muted: "#6B7189",
  faint: "#8B90A5",

  line: "#F1EFF7",
  line2: "#EDEBF5",
  line3: "#E8E6F0",
  tint: "#FAF9FD",
  tintDeep: "#F1EBFE",

  magenta: "#C026D3",
  violet: "#6D28D9",
  indigo: "#4F46E5",
  cyan: "#06B6D4",
  coral: "#F4485F",
  amber: "#FB9C3C",
  green: "#0F9268",

  focus: "#C4B5FD",
} as const;

/** The signature button/hero gradient, in the design's own order. */
/** Tuple-typed for expo-linear-gradient, which requires at least two stops. */
export const GRADIENT: readonly [string, string, ...string[]] = ["#C026D3", "#6D28D9", "#4F46E5"];
export const GRADIENT_LOCS: readonly [number, number, ...number[]] = [0, 0.55, 1];

/** The eight avatar gradients, matching the web build so an account looks the same everywhere. */
export const AVATARS: readonly (readonly [string, string])[] = [
  ["#C026D3", "#6D28D9"],
  ["#F4485F", "#C026D3"],
  ["#FB9C3C", "#F4485F"],
  ["#4F46E5", "#06B6D4"],
  ["#0F9268", "#4F46E5"],
  ["#6D28D9", "#4F46E5"],
  ["#A855B8", "#F4485F"],
  ["#1B2136", "#4F46E5"],
];

export const F = {
  head: "Poppins_600SemiBold",
  body: "PlusJakartaSans_400Regular",
  semi: "PlusJakartaSans_600SemiBold",
  bold: "PlusJakartaSans_700Bold",
  extra: "PlusJakartaSans_800ExtraBold",
  mono: "JetBrainsMono_400Regular",
} as const;

export const RADIUS = { card: 20, tile: 15, chip: 13, pill: 999 } as const;

export const money = (n: number) => "K " + Math.round(n || 0).toLocaleString("en-US");

/** "thida.aung" -> "TA"; dots, underscores, hyphens and spaces all split. */
export const initialsOf = (name: string) => {
  const parts = (name || "").split(/[.\-_\s]+/).filter(Boolean);
  if (!parts.length) return "YOU";
  return parts.map((p) => p[0]).join("").slice(0, 2).toUpperCase();
};
