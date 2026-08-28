import type { CSSProperties } from 'react';

/**
 * The sort control for a list.
 *
 * It used to be a link that cycled — you clicked "Most joined" to get "Lowest
 * price", clicked again for "Biggest saving", and had no way to see what the
 * options were or to go back one without going forward twice. A select shows
 * the whole set, jumps straight to any of them, and gets keyboard and screen
 * reader behaviour from the platform rather than from us.
 *
 * It lives at the end of the tab row rather than up beside the search, which
 * keeps every control that narrows the list on one line and leaves the top
 * right corner to the order button.
 */
export function SortSelect<T extends string>({
  value,
  options,
  onChange,
  label = 'Sort',
  style,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  label?: string;
  style?: CSSProperties;
}) {
  return (
    <div
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 7,
        height: 32,
        padding: '0 30px 0 11px',
        border: '1px solid #E5DCD3',
        borderRadius: 8,
        background: '#fff',
        flex: 'none',
        ...style,
      }}
    >
      <span style={{ fontSize: 11.5, fontWeight: 700, color: '#928892', whiteSpace: 'nowrap' }}>
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        aria-label={label}
        style={{
          // The native control is transparent and stretched across the pill, so
          // the whole thing is the hit target while the border, chevron and
          // label above are ours to style.
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          opacity: 0,
          cursor: 'pointer',
          fontFamily: 'inherit',
          fontSize: 13,
        }}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <span
        aria-hidden
        style={{ fontSize: 12.5, fontWeight: 700, color: '#1E1926', whiteSpace: 'nowrap' }}
      >
        {options.find((o) => o.value === value)?.label ?? ''}
      </span>
      <svg
        aria-hidden
        width="10"
        height="10"
        viewBox="0 0 10 10"
        fill="none"
        style={{ position: 'absolute', right: 11, top: '50%', marginTop: -3 }}
      >
        <path d="M1 3l4 4 4-4" stroke="#928892" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}
