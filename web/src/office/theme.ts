/**
 * Design tokens lifted verbatim from `project/Gather Back Office.dc.html`.
 * The prototype uses inline styles throughout; we keep the exact hex values so
 * the React build is pixel-identical.
 */

export const C = {
  bg: "#F8F5F1",
  card: "#fff",
  ink: "#1E1926",
  ink2: "#3F3947",
  muted: "#6F6678",
  muted2: "#7B7280",
  faint: "#928892",
  faint2: "#9A9199",
  faint3: "#A79E9E",
  faint4: "#C9C0C0",

  line: "#EFE8E0",
  lineSoft: "#F3ECE4",
  lineNav: "#EDE5DC",
  lineTop: "#E7DFD5",
  border: "#EBE3DA",
  input: "#E5DCD3",
  input2: "#DED5CC",
  check: "#D6CEC6",
  cardHover: "#D8CFC5",
  rowHover: "#FDFBF7",
  navBg: "#FDFBF8",

  purple: "#5B34D9",
  purpleDeep: "#3F1FB0",
  purpleWash: "#F5F1FD",
  indigo: "#4F46E5",
  magenta: "#C026D3",
  violet: "#6D28D9",
  cyan: "#06B6D4",

  green: "#0C7C58",
  red: "#B3253A",
  redSoft: "#D98A96",
  amber: "#946200",
} as const;

export const F = {
  head: "Poppins,sans-serif",
  mono: "'JetBrains Mono',monospace",
  body: "'Plus Jakarta Sans',system-ui,sans-serif",
} as const;

/** Striped placeholder used wherever an item has no photo. */
export const SLOT =
  "repeating-linear-gradient(135deg,#F2EBE3 0 6px,#F8F3ED 6px 12px)";

export const grad = (a: string, b: string) =>
  `linear-gradient(135deg,${a},${b})`;

/** The seven canonical categories (CONTRACT.md §2, design `CATS`). */
export const CATS = [
  "Grocery",
  "Grocery Non-Food",
  "Hardline",
  "Softline",
  "Homeline",
  "Pharmacy",
  "Fresh & Frozen",
] as const;
export type Category = (typeof CATS)[number];

export const TIER_LABELS = ["base", "20+", "50+", "100+"] as const;
