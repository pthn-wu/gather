import type { CSSProperties } from 'react';

// Reusable inline-style fragments transcribed from the prototype's exact
// values, so every screen stays pixel-consistent without re-typing colors
// and spacing everywhere.

export const colors = {
  bg: '#F8F5F1',
  ink: '#1E1926',
  violet: '#5B34D9',
  violetHover: '#3F1FB0',
  green: '#0C7C58',
  red: '#B3253A',
  borderCard: '#EBE3DA',
  borderRow: '#EFE8E0',
  borderMuted2: '#E5DCD3',
  borderMuted3: '#E7DFD5',
  borderFaint: '#F3ECE4',
  textMuted1: '#6F6678',
  textMuted2: '#928892',
  textMuted3: '#7B7280',
  textMuted4: '#9A9199',
  textMuted5: '#A79E9E',
  textBody: '#3F3947',
  textSub: '#5B5364',
};

export const card: CSSProperties = {
  background: '#fff',
  border: '1px solid #EBE3DA',
  borderRadius: 10,
  padding: 24,
};

export const sectionLabel: CSSProperties = {
  fontSize: 11,
  fontWeight: 800,
  letterSpacing: '.09em',
  textTransform: 'uppercase',
};

export const pageTitle: CSSProperties = {
  fontFamily: 'Poppins, sans-serif',
  fontSize: 27,
  fontWeight: 600,
  letterSpacing: '-.02em',
};

export const mono: CSSProperties = {
  fontFamily: "'JetBrains Mono', monospace",
};

export const textInput: CSSProperties = {
  width: '100%',
  padding: '12px 14px',
  border: '1px solid #E5DCD3',
  borderRadius: 9,
  background: '#fff',
  fontSize: 13.5,
  fontWeight: 600,
  color: '#1E1926',
  outline: 'none',
};

export const fieldLabel: CSSProperties = {
  fontSize: 12,
  fontWeight: 700,
  color: '#928892',
};

export const primaryButton: CSSProperties = {
  border: 0,
  borderRadius: 9,
  background: '#1E1926',
  color: '#fff',
  fontWeight: 700,
  cursor: 'pointer',
};

export const outlineButton: CSSProperties = {
  border: '1px solid #E5DCD3',
  borderRadius: 9,
  background: '#fff',
  color: '#6F6678',
  fontWeight: 700,
  cursor: 'pointer',
};

export const linkButton: CSSProperties = {
  border: 0,
  background: 'transparent',
  padding: 0,
  cursor: 'pointer',
  fontWeight: 700,
  color: '#5B34D9',
};

/**
 * Height of `stickyHeader` at every width the app supports. Anything else that
 * sticks below it offsets by this, so the two cannot drift apart — they did,
 * and the side panels sat 64px too low, overlapping the rows they belong to.
 */
export const HEADER_HEIGHT = 112;

/** Vertical gap between the header and the panels that stick beneath it. */
export const STICKY_BELOW_HEADER = HEADER_HEIGHT + 26;

export const stickyHeader: CSSProperties = {
  position: 'sticky',
  top: 0,
  zIndex: 6,
  // Opaque, and no backdrop-filter. A translucent blurred header repaints the
  // whole strip on every scroll frame; the compositor lands that a frame late,
  // so rows passing underneath smear through it and the header looks like it is
  // dragging behind the page. Flat colour costs nothing and never ghosts.
  background: '#F8F5F1',
  borderBottom: '1px solid #E7DFD5',
  padding: '28px 36px 0',
};
