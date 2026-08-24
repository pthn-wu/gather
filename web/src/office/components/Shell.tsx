import type { ReactNode } from "react";
import { API_URL } from "../api/client";
import type { AdminRole } from "../api/types";
import { useAuth } from "../context/AuthContext";
import { useStore } from "../context/store";
import { buildPicks } from "../lib/derive";
import { initials } from "../lib/format";
import { C, F, grad } from "../theme";
import { useImport } from "./ImportModal";

export interface NavItem {
  k: string;
  label: string;
  badge?: number | string;
}

export default function Shell({ children }: { children: ReactNode }) {
  const { admin, role, allowedRoles, setRole, signOut } = useAuth();
  const s = useStore();
  const openImport = useImport();
  const retail = role === "retail";

  const scopeComm = s.communityById(s.scope);
  const fulComm = s.communityById(s.fulComm);
  const shortLines = retail
    ? buildPicks(s.products, fulComm, s.pickedQty).filter((p) => p.picked < p.ordered).length
    : 0;

  const officeOrders = s.orders.filter((o) => o.communityId === s.scope || o.code.startsWith(s.scope));
  const collectList = officeOrders.filter((o) => o.stage !== "placed");

  const nav: NavItem[] = retail
    ? [
        { k: "overview", label: "Overview" },
        { k: "catalog", label: "Catalog & pricing", badge: s.products.filter((p) => p.active).length },
        { k: "promos", label: "Promotions", badge: s.promotions.filter((p) => p.live).length },
        { k: "fulfil", label: "Fulfilment", badge: shortLines || "" },
        { k: "cycles", label: "Cycles & accounts", badge: s.communities.length },
        { k: "demand", label: "Resident demand", badge: s.wishlist.filter((w) => !w.addedToCatalog).length },
      ]
    : [
        { k: "verify", label: "Verification", badge: s.verifications.length },
        { k: "roster", label: "Households", badge: s.households.length },
        { k: "orders", label: "Orders", badge: officeOrders.filter((o) => o.stage !== "collected").length },
        { k: "collect", label: "Collection sheet", badge: collectList.length },
        { k: "pay", label: "Payments", badge: officeOrders.filter((o) => !o.paid).length },
        { k: "setup", label: "Cycle setup" },
        { k: "announce", label: "Announcements" },
      ];

  const active = retail ? s.retailScreen : s.officeScreen;
  const pick = (k: string) => (retail ? s.setRetailScreen(k) : s.setOfficeScreen(k));

  const meName = admin?.displayName ?? (retail ? "Capital Retail" : "Property office");
  const cycleNo = retail ? 34 : scopeComm.cycleNo;

  const roleButtons: { k: AdminRole; label: string }[] = [
    { k: "office", label: "Property office" },
    { k: "retail", label: "Retail console" },
  ].filter((r) => allowedRoles.includes(r.k as AdminRole)) as { k: AdminRole; label: string }[];

  return (
    // The consoles are dense: seven- and eight-column tables beside a detail
    // panel. Below this width the columns cannot all fit, and the honest
    // outcome is a horizontal scrollbar rather than tracks squeezed to a few
    // pixels or rows overflowing across the panel beside them.
    <div style={{ minWidth: 1360 }}>
      <div
        style={{
          position: "sticky", top: 0, zIndex: 12, display: "flex", alignItems: "center",
          // Opaque, like the storefront header: a translucent blurred bar
          // repaints on every scroll frame and the rows passing under it smear
          // through, which reads as the header lagging behind the page.
          gap: 24, padding: "14px 28px", background: C.bg,
          borderBottom: `1px solid ${C.lineTop}`,
        }}
      >
        <img src="/gather-logo.png" alt="Gather" width={262} height={80}
          style={{ width: 88, height: "auto", display: "block" }} />
        <div
          style={{
            fontSize: 11, fontWeight: 800, letterSpacing: ".09em",
            textTransform: "uppercase", color: C.faint,
          }}
        >
          Back office
        </div>

        <div
          style={{
            flex: "none", display: "flex", border: `1px solid ${C.input}`,
            borderRadius: 9, overflow: "hidden", background: "#fff",
          }}
        >
          {roleButtons.map((r) => (
            <button
              key={r.k} type="button" onClick={() => setRole(r.k)}
              style={{
                padding: "9px 16px", border: 0, background: role === r.k ? C.ink : "#fff",
                color: role === r.k ? "#fff" : C.muted, fontFamily: F.body, fontSize: 12.5,
                fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap",
              }}
            >
              {r.label}
            </button>
          ))}
        </div>

        <div
          style={{
            flex: 1, minWidth: 0, fontSize: 12.5, color: C.muted,
            lineHeight: 1.4, maxWidth: 420,
          }}
        >
          {retail
            ? "Capital Retail · listing, tier pricing, promotions and dispatch across every contracted community."
            : `${scopeComm.short ?? scopeComm.name} property office · verifying households, issuing logins and running the collection table.`}
        </div>

        <select
          value={retail ? s.retailScope : s.scope}
          onChange={(e) => (retail ? s.setRetailScope(e.target.value) : s.setScope(e.target.value))}
          /* An office token is pinned to its own community — the picker is
             read-only there because the server scopes every response anyway. */
          disabled={!retail && s.communities.length <= 1}
          style={{
            flex: "none", padding: "9px 12px", border: `1px solid ${C.input}`, borderRadius: 9,
            background: "#fff", fontSize: 12.5, fontWeight: 700, color: C.ink,
          }}
        >
          {retail ? <option value="all">All communities</option> : null}
          {s.communities.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        <div style={{ fontFamily: F.mono, fontSize: 12, color: C.muted, whiteSpace: "nowrap" }}>
          Cycle {cycleNo} · cutoff Sun 10pm
        </div>

        <div style={{ flex: "none", display: "flex", alignItems: "center", gap: 9 }}>
          <div
            style={{
              width: 30, height: 30, borderRadius: "50%",
              background: retail ? grad(C.indigo, C.cyan) : grad(C.magenta, C.violet),
              color: "#fff", fontSize: 11, fontWeight: 800, display: "flex",
              alignItems: "center", justifyContent: "center",
            }}
          >
            {initials(meName)}
          </div>
          <div style={{ fontSize: 12.5, fontWeight: 700, whiteSpace: "nowrap" }}>{meName}</div>
          <button
            type="button" onClick={signOut}
            style={{
              border: 0, background: "transparent", padding: "0 0 0 4px", cursor: "pointer",
              fontFamily: F.body, fontSize: 11.5, fontWeight: 700, color: C.muted,
              whiteSpace: "nowrap",
            }}
          >
            Sign out
          </button>
        </div>
      </div>

      <div style={{ display: "flex", minHeight: "calc(100vh - 60px)" }}>
        <div
          style={{
            width: 212, flex: "none", background: C.navBg, borderRight: `1px solid ${C.lineNav}`,
            padding: "24px 20px", display: "flex", flexDirection: "column",
            position: "sticky", top: 60, height: "calc(100vh - 60px)",
          }}
        >
          <div
            style={{
              fontSize: 11, fontWeight: 800, letterSpacing: ".09em",
              textTransform: "uppercase", color: C.faint,
            }}
          >
            {retail ? "Capital Retail" : "Property office"}
          </div>
          <div style={{ display: "flex", flexDirection: "column", marginTop: 14 }}>
            {nav.map((n) => {
              const on = n.k === active;
              const badge = n.badge === 0 ? "" : (n.badge ?? "");
              return (
                <button
                  key={n.k} type="button" onClick={() => pick(n.k)}
                  style={{
                    display: "flex", alignItems: "baseline", gap: 10, width: "100%",
                    textAlign: "left", padding: "10px 0 10px 13px", border: 0,
                    borderLeft: `2px solid ${on ? C.purple : C.lineNav}`, background: "transparent",
                    color: on ? C.ink : C.muted, fontFamily: F.body, fontSize: 13,
                    fontWeight: on ? 800 : 600, cursor: "pointer",
                  }}
                >
                  <span style={{ flex: 1 }}>{n.label}</span>
                  <span
                    style={{ fontFamily: F.mono, fontSize: 11, color: on ? C.purple : C.faint3 }}
                  >
                    {badge}
                  </span>
                </button>
              );
            })}
          </div>
          <div style={{ flex: 1 }} />
          {s.offline ? (
            <div
              style={{
                marginBottom: 14, padding: 10, borderRadius: 9,
                border: `1px solid ${C.input}`, background: "#fff",
                fontSize: 11, color: C.amber, lineHeight: 1.45,
              }}
            >
              API at {API_URL} is unreachable — showing the design's seed data. Edits stay local
              until the server is up.
            </div>
          ) : null}
          <div style={{ paddingTop: 16, borderTop: `1px solid ${C.lineNav}` }}>
            <div style={{ fontSize: 11.5, color: "#7B7280", lineHeight: 1.5 }}>
              Every table here imports and exports as .xlsx or .csv.
            </div>
            <button
              type="button"
              onClick={() => openImport(retail ? "catalog" : "roster")}
              style={{
                marginTop: 11, width: "100%", padding: 10, border: `1px solid ${C.input}`,
                borderRadius: 9, background: "#fff", color: C.purple, fontFamily: F.body,
                fontSize: 12, fontWeight: 700, cursor: "pointer",
              }}
            >
              Import a spreadsheet
            </button>
          </div>
        </div>

        <div style={{ flex: 1, minWidth: 0, padding: "26px 30px 56px" }}>{children}</div>
      </div>
    </div>
  );
}
