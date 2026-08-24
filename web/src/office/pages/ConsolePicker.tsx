import { COMMUNITIES, PRODUCTS } from "../api/fixtures";
import type { AdminRole } from "../api/types";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { C, F } from "../theme";

const PORTALS: {
  k: AdminRole;
  title: string;
  who: string;
  rule: string;
  blurb: string;
  tags: string[];
  cta: string;
  note: string;
}[] = [
  {
    k: "office",
    title: "Property office",
    who: "one login per community",
    rule: C.magenta,
    blurb:
      "Verify households against your unit roster, issue logins, run the collection table and cash-up, and post notices to residents.",
    tags: ["Verification queue", "Household roster", "Collection sheet", "Cash-up"],
    cta: "Sign in to an office console",
    note: "Issued by Capital Retail to the property manager",
  },
  {
    k: "retail",
    title: "Capital Retail console",
    who: "staff accounts",
    rule: C.indigo,
    blurb:
      "List items, set volume tiers and promotions across every tower, then pick, pack and dispatch each drop with margin visible line by line.",
    tags: ["Catalog & tiers", "Promotions", "Fulfilment", "Margin reporting"],
    cta: "Sign in as Capital Retail",
    note: "SSO in production; password here for the demo",
  },
];

export default function ConsolePicker() {
  const { pickConsole } = useAuth();
  const flash = useToast();

  const stats = [
    { value: String(COMMUNITIES.length), label: "communities contracted" },
    {
      value: String(COMMUNITIES.reduce((a, c) => a + c.households, 0)),
      label: "households on the sheets",
    },
    { value: String(PRODUCTS.filter((p) => p.active).length), label: "lines live this cycle" },
  ];

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(0,1fr) minmax(0,760px)",
        gap: 64, padding: "72px 80px", alignItems: "start", minHeight: "100vh",
      }}
    >
      <div style={{ position: "sticky", top: 72 }}>
        <img src="/gather-logo.png" alt="Gather" width={262} height={80}
          style={{ width: 132, height: "auto", display: "block" }} />
        <div
          style={{
            fontFamily: F.head, fontSize: 38, fontWeight: 600, letterSpacing: "-.025em",
            lineHeight: 1.15, marginTop: 32,
          }}
        >
          The back office
          <br />
          behind every drop
        </div>
        <div
          style={{
            fontSize: 14, color: "#5B5364", lineHeight: 1.7, marginTop: 18,
            maxWidth: 460, textWrap: "pretty",
          }}
        >
          Two consoles, one sheet. The property office verifies households and runs the collection
          table; Capital Retail lists the items, sets the volume tiers and dispatches the drop.
          Everything either side touches imports and exports as a spreadsheet.
        </div>
        <div
          style={{
            display: "flex", gap: 36, marginTop: 32, paddingTop: 24,
            borderTop: `1.5px solid ${C.ink}`,
          }}
        >
          {stats.map((h) => (
            <div key={h.label}>
              <div style={{ fontFamily: F.mono, fontSize: 22 }}>{h.value}</div>
              <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>{h.label}</div>
            </div>
          ))}
        </div>
        <div
          style={{
            fontSize: 12, color: C.faint2, lineHeight: 1.6, marginTop: 32, maxWidth: 420,
          }}
        >
          Residents don't sign in here — they use{" "}
          <a href="/" style={{ fontWeight: 700 }}>
            the Gather storefront
          </a>
          . Lost your console password? The Capital Retail account team resets both sides.
        </div>
      </div>

      <div>
        <div
          style={{
            fontSize: 11, fontWeight: 800, letterSpacing: ".09em",
            textTransform: "uppercase", color: C.faint,
          }}
        >
          Choose your console
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 16 }}>
          {PORTALS.map((p) => (
            <div
              key={p.k}
              className="card"
              onClick={() => pickConsole(p.k)}
              style={{
                background: "#fff", border: `1px solid ${C.border}`, borderRadius: 11,
                padding: 26, cursor: "pointer", boxShadow: `inset 3px 0 0 ${p.rule}`,
              }}
            >
              <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
                <div
                  style={{
                    fontFamily: F.head, fontSize: 22, fontWeight: 600, letterSpacing: "-.02em",
                  }}
                >
                  {p.title}
                </div>
                <div style={{ flex: 1 }} />
                <div style={{ fontFamily: F.mono, fontSize: 11.5, color: C.faint }}>{p.who}</div>
              </div>
              <div
                style={{
                  fontSize: 13.5, color: C.ink2, lineHeight: 1.6, marginTop: 8,
                  maxWidth: 600, textWrap: "pretty",
                }}
              >
                {p.blurb}
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 16 }}>
                {p.tags.map((t) => (
                  <div
                    key={t}
                    style={{
                      padding: "7px 11px", border: "1px solid #EFE8E0", borderRadius: 20,
                      background: "#FBF8F4", fontSize: 11.5, fontWeight: 600,
                      color: C.muted, whiteSpace: "nowrap",
                    }}
                  >
                    {t}
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 20 }}>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    pickConsole(p.k);
                  }}
                  style={{
                    padding: "12px 18px", border: 0, borderRadius: 9, background: C.ink,
                    color: "#fff", fontFamily: F.body, fontSize: 13, fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  {p.cta}
                </button>
                <div style={{ fontSize: 12, color: C.faint2 }}>{p.note}</div>
              </div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 26, paddingTop: 20, borderTop: `1px solid ${C.lineTop}` }}>
          <div style={{ fontSize: 13.5, fontWeight: 800 }}>New community joining Gather?</div>
          <div
            style={{
              fontSize: 12.5, color: C.muted, lineHeight: 1.6, marginTop: 5, maxWidth: 560,
            }}
          >
            Capital Retail opens a tower once 40 households register interest, then issues one office
            console login to the property manager.
          </div>
          <button
            type="button"
            onClick={() =>
              flash("Request sent — the Capital Retail account team will call the property manager")
            }
            style={{
              marginTop: 14, padding: "11px 16px", border: `1px solid ${C.input}`,
              borderRadius: 9, background: "#fff", color: C.purple, fontFamily: F.body,
              fontSize: 12.5, fontWeight: 700, cursor: "pointer",
            }}
          >
            Request an office console
          </button>
        </div>
      </div>
    </div>
  );
}
