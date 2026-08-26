import { useLayoutEffect, useRef, type CSSProperties, type ReactNode } from 'react';
import { stickyHeader } from '../styles/shared';

/**
 * The sticky page header, and the single source of truth for how tall it is.
 *
 * Panels further down the page stick *below* this one, and that offset used to
 * be a hardcoded 176 while the header was 112 — so they sat 64px out, overlapping
 * the rows they describe. The height is not a constant: it grows when a title
 * or a filter row wraps, which depends on the window width and on the text.
 *
 * So it is measured, and published as `--gather-header-h` for anything that
 * needs to sit under it:
 *
 *   top: 'calc(var(--gather-header-h, 112px) + 26px)'
 *
 * The fallback matters — it is what applies for the first paint, before the
 * observer has run.
 */
export function PageHeader({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const publish = () =>
      document.documentElement.style.setProperty(
        '--gather-header-h',
        `${Math.round(el.getBoundingClientRect().height)}px`,
      );
    publish();
    const ro = new ResizeObserver(publish);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={ref} style={{ ...stickyHeader, ...style }}>
      {children}
    </div>
  );
}
