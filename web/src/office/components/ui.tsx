import type { CSSProperties, ReactNode } from "react";
import { C, F } from "../theme";

/* ---------------------------------------------------------------- buttons */

const btnBase: CSSProperties = {
  fontFamily: F.body,
  fontSize: 12,
  fontWeight: 700,
  cursor: "pointer",
  borderRadius: 9,
  padding: "9px 14px",
  whiteSpace: "nowrap",
};

export function DarkBtn({
  children, onClick, style, title, disabled,
}: {
  children: ReactNode; onClick?: () => void; style?: CSSProperties; title?: string; disabled?: boolean;
}) {
  return (
    <button
      type="button" onClick={onClick} title={title} disabled={disabled}
      style={{
        ...btnBase, border: 0, background: C.ink, color: "#fff",
        opacity: disabled ? 0.45 : 1, cursor: disabled ? "not-allowed" : "pointer", ...style,
      }}
    >
      {children}
    </button>
  );
}

export function GhostBtn({
  children, onClick, tone = C.ink, style, title,
}: {
  children: ReactNode; onClick?: () => void; tone?: string; style?: CSSProperties; title?: string;
}) {
  return (
    <button
      type="button" onClick={onClick} title={title}
      style={{ ...btnBase, border: `1px solid ${C.input}`, background: "#fff", color: tone, ...style }}
    >
      {children}
    </button>
  );
}

export function LinkBtn({
  children, onClick, tone = C.purple, style,
}: {
  children: ReactNode; onClick?: () => void; tone?: string; style?: CSSProperties;
}) {
  return (
    <button
      type="button" onClick={onClick}
      style={{
        border: 0, background: "transparent", padding: 0, cursor: "pointer",
        fontFamily: F.body, fontSize: 12, fontWeight: 700, color: tone, ...style,
      }}
    >
      {children}
    </button>
  );
}

/* ------------------------------------------------------------ page header */

export function PageHead({
  title, sub, children,
}: {
  title: ReactNode; sub?: ReactNode; children?: ReactNode;
}) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: 20 }}>
      <div style={{ fontFamily: F.head, fontSize: 27, fontWeight: 600, letterSpacing: "-.02em" }}>
        {title}
      </div>
      {sub !== undefined ? (
        <div style={{ fontSize: 12.5, color: C.muted2 }}>{sub}</div>
      ) : null}
      <div style={{ flex: 1 }} />
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ panel */

export function Panel({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <div
      style={{
        background: "#fff", border: `1px solid ${C.border}`, borderRadius: 10,
        padding: 22, ...style,
      }}
    >
      {children}
    </div>
  );
}

export function Eyebrow({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <div
      style={{
        fontSize: 11, fontWeight: 800, letterSpacing: ".09em",
        textTransform: "uppercase", ...style,
      }}
    >
      {children}
    </div>
  );
}

/** Two-column label/value line used in every side panel. */
export function StatLine({
  label, value, tone = C.ink, mono = true,
}: {
  label: ReactNode; value: ReactNode; tone?: string; mono?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex", alignItems: "baseline", justifyContent: "space-between",
        gap: 12, padding: "10px 0", borderBottom: `1px solid ${C.lineSoft}`,
      }}
    >
      <div style={{ fontSize: 12.5, color: C.muted }}>{label}</div>
      <div
        style={{
          fontFamily: mono ? F.mono : F.body, fontSize: 13,
          fontWeight: mono ? 500 : 700, color: tone, textAlign: "right",
        }}
      >
        {value}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ table */

export const colHead: CSSProperties = {
  fontSize: 10.5, fontWeight: 800, letterSpacing: ".05em",
  textTransform: "uppercase", color: C.faint,
};

export function TableHead({ cols, template }: { cols: ReactNode[]; template: string }) {
  return (
    <div
      style={{
        display: "grid", gridTemplateColumns: template, gap: 11,
        padding: "0 12px 11px", borderBottom: `1.5px solid ${C.ink}`, ...colHead,
      }}
    >
      {cols.map((c, i) => (
        <div key={i}>{c}</div>
      ))}
    </div>
  );
}

export function Row({
  template, children, style, onClick, gap = 11,
}: {
  template: string; children: ReactNode; style?: CSSProperties; onClick?: () => void; gap?: number;
}) {
  return (
    <div
      className="row"
      onClick={onClick}
      style={{
        display: "grid", gridTemplateColumns: template, gap, alignItems: "center",
        padding: "13px 12px", borderBottom: `1px solid ${C.line}`, background: "#fff",
        cursor: onClick ? "pointer" : undefined, ...style,
      }}
    >
      {children}
    </div>
  );
}

export const R = (style?: CSSProperties): CSSProperties => ({
  textAlign: "right", fontFamily: F.mono, fontSize: 12.5, ...style,
});

/* ------------------------------------------------------------------ input */

export const inputStyle: CSSProperties = {
  width: "100%", padding: "10px 12px", border: `1px solid ${C.input}`,
  borderRadius: 9, background: "#fff", fontSize: 12.5, fontWeight: 600, color: C.ink,
};

export function FieldLabel({ children }: { children: ReactNode }) {
  return <div style={{ fontSize: 11, fontWeight: 700, color: C.faint }}>{children}</div>;
}

export function Field({
  label, value, onChange, hint, placeholder, mono, type,
}: {
  label: string; value: string; onChange: (v: string) => void; hint?: string;
  placeholder?: string; mono?: boolean; type?: string;
}) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <input
        type={type} value={value} placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        style={{
          ...inputStyle, marginTop: 5,
          ...(mono ? { fontFamily: F.mono, fontWeight: 400 } : {}),
        }}
      />
      {hint ? (
        <div style={{ fontSize: 11, color: C.faint2, marginTop: 4 }}>{hint}</div>
      ) : null}
    </div>
  );
}

/** Square tick box shared by the roster and the collection sheet. */
export function Tick({
  on, onToggle, size = 17,
}: {
  on: boolean; onToggle: () => void; size?: number;
}) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      style={{
        width: size, height: size, flex: "none", borderRadius: 5,
        border: `1.5px solid ${on ? C.purple : C.check}`, background: on ? C.purple : "#fff",
        cursor: "pointer", padding: 0, color: "#fff", fontSize: size > 17 ? 12 : 11,
        fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center",
      }}
    >
      {on ? "✓" : ""}
    </button>
  );
}

/** Rounded community chip used by "Listed at" and promotion scope. */
export function Chip({
  label, on, onToggle,
}: {
  label: string; on: boolean; onToggle: () => void;
}) {
  return (
    <button
      type="button" onClick={onToggle} aria-pressed={on}
      style={{
        padding: "8px 12px", border: `1px solid ${on ? C.purple : C.input}`, borderRadius: 20,
        background: on ? C.purpleWash : "#fff", color: on ? C.purple : C.muted,
        fontFamily: F.body, fontSize: 11.5, fontWeight: 700, cursor: "pointer",
      }}
    >
      {label}
    </button>
  );
}

/** Underlined tab strip (catalog categories, order filters). */
export function Tabs({
  tabs, active, onPick, gap = 18,
}: {
  tabs: { k: string; label: string; count?: number | string }[];
  active: string;
  onPick: (k: string) => void;
  gap?: number;
}) {
  return (
    <div
      style={{
        display: "flex", alignItems: "flex-end", gap, marginTop: 18,
        borderBottom: `1px solid ${C.lineTop}`, overflowX: "auto", scrollbarWidth: "none",
      }}
    >
      {tabs.map((t) => {
        const on = t.k === active;
        return (
          <button
            key={t.k} type="button" onClick={() => onPick(t.k)}
            style={{
              flex: "none", display: "flex", alignItems: "baseline", gap: 6,
              padding: "0 0 11px", border: 0, background: "transparent", cursor: "pointer",
              fontFamily: F.body, fontSize: 12.5, fontWeight: on ? 800 : 600,
              color: on ? C.ink : C.muted2,
              borderBottom: `2px solid ${on ? C.purple : "transparent"}`,
              marginBottom: -1, whiteSpace: "nowrap",
            }}
          >
            {t.label}
            {t.count !== undefined ? (
              <span style={{ fontFamily: F.mono, fontSize: 11, fontWeight: 500, color: C.faint3 }}>
                {t.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

/** Borderless search input with the design's underline treatment. */
export function SearchInput({
  value, onChange, placeholder, width = 240,
}: {
  value: string; onChange: (v: string) => void; placeholder: string; width?: number;
}) {
  return (
    <div
      style={{
        display: "flex", alignItems: "center", gap: 8, width, padding: "7px 0",
        borderBottom: `1.5px solid ${value ? C.purple : C.input2}`,
      }}
    >
      <input
        value={value} placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        style={{
          flex: 1, minWidth: 0, border: 0, background: "transparent",
          fontSize: 13, fontWeight: 600, color: C.ink, padding: 0,
        }}
      />
    </div>
  );
}

/** KPI strip: N equal columns between a heavy top rule and a light bottom one. */
export function KpiStrip({
  items, columns,
}: {
  items: { value: string; label: string; note?: string; tone?: string }[];
  columns: number;
}) {
  return (
    <div
      style={{
        display: "grid", gridTemplateColumns: `repeat(${columns},minmax(0,1fr))`,
        marginTop: 20, borderTop: `1.5px solid ${C.ink}`, borderBottom: `1px solid ${C.line}`,
      }}
    >
      {items.map((k, i) => (
        <div key={i} style={{ padding: k.note ? "18px 22px 18px 0" : "16px 20px 16px 0" }}>
          <div
            style={{
              fontFamily: F.mono, fontSize: k.note ? 21 : 20, fontWeight: 500,
              color: k.tone ?? C.ink,
            }}
          >
            {k.value}
          </div>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 4, lineHeight: 1.45 }}>
            {k.label}
          </div>
          {k.note ? (
            <div style={{ fontSize: 11.5, color: C.faint2, marginTop: 3 }}>{k.note}</div>
          ) : null}
        </div>
      ))}
    </div>
  );
}

/** Two-column page body: main table on the left, sticky panel column right. */
export function Split({
  left, right, leftMin = 700, rightWidth = 372, gap = 24, style,
}: {
  left: ReactNode; right: ReactNode; leftMin?: number; rightWidth?: number;
  gap?: number; style?: CSSProperties;
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `minmax(${leftMin}px,1fr) ${rightWidth}px`,
        gap, alignItems: "start", marginTop: 22, ...style,
      }}
    >
      <div style={{ minWidth: 0 }}>{left}</div>
      <div>{right}</div>
    </div>
  );
}
