// Cycle facts come from the community record the property office edits in
// Cycle setup (CONTRACT.md §2 Community, §4.5) — never from constants here.
//
// v2 renames the fields (`cutoffDate`, `deliveryDate`, `collectionWindow`)
// while v1 shipped `cutoffAt` / `deliveryLabel`. Every accessor below prefers
// the v2 field and falls back to the v1 one, so the app is correct against
// either server.

import type { Community } from '../api/types';

type C = Community | null | undefined;

function validDate(iso: string | undefined | null): Date | null {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** ISO timestamp the current cycle closes, or undefined if the office has not set one. */
export function cutoffIso(c: C): string | undefined {
  return c?.cutoffDate ?? c?.cutoffAt ?? undefined;
}

/** "Tuesday 25 Aug, 6–9pm" — composed from the office's delivery date + window. */
export function deliveryLabel(c: C): string | undefined {
  const d = validDate(c?.deliveryDate);
  if (d) {
    const day = d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' });
    const window = c?.collectionWindow;
    return window ? `${day}, ${window}` : day;
  }
  return c?.deliveryLabel ?? undefined;
}

/** Just the weekday — "Tuesday" — used in "Your Tuesday order" and the sidebar. */
export function deliveryDay(c: C, fallback = 'Tuesday'): string {
  const d = validDate(c?.deliveryDate);
  if (d) return d.toLocaleDateString('en-GB', { weekday: 'long' });
  const label = c?.deliveryLabel;
  if (label) {
    const first = label.split(/[\s,]+/)[0];
    if (first) return first;
  }
  return fallback;
}

/** The collection point the office set, or a neutral phrase. */
export function collectPoint(c: C, fallback = 'your collection point'): string {
  return c?.collectPoint || fallback;
}

/** "6–9pm", when the office has set a window. */
export function collectionWindow(c: C): string | undefined {
  return c?.collectionWindow ?? undefined;
}

/** "Tower 1 guardhouse · Tuesday 25 Aug, 6–9pm" — one line for collection copy. */
export function collectionLine(c: C): string {
  const label = deliveryLabel(c);
  const point = collectPoint(c);
  return label ? `${point} · ${label}` : point;
}

/** "Friday 10pm" — how the cutoff reads next to the countdown. */
export function formatCutoff(c: C): string {
  const d = validDate(cutoffIso(c));
  if (!d) return '—';
  const weekday = d.toLocaleDateString('en-US', { weekday: 'long' });
  let hours = d.getHours();
  const minutes = d.getMinutes();
  const ampm = hours >= 12 ? 'pm' : 'am';
  hours = hours % 12 || 12;
  const time = minutes === 0 ? `${hours}${ampm}` : `${hours}:${String(minutes).padStart(2, '0')}${ampm}`;
  return `${weekday} ${time}`;
}

/** The office contact residents are told to ask about their unit or account. */
export function officeContact(c: C): string | undefined {
  return c?.officeContact ?? undefined;
}
