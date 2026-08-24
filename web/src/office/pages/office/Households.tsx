import { useState } from "react";
import { api } from "../../api/client";
import type { AccountState } from "../../api/types";
import { useStore } from "../../context/store";
import { useToast } from "../../context/ToastContext";
import { useImport } from "../../components/ImportModal";
import { writeSheet } from "../../lib/sheet";
import { C, F } from "../../theme";
import {
  DarkBtn, GhostBtn, LinkBtn, PageHead, R, Row, SearchInput, TableHead, Tick,
} from "../../components/ui";

const TPL = "34px 78px minmax(0,1fr) 128px 140px 118px 96px 104px";

const STATE_LABEL: Record<AccountState, string> = {
  none: "No login yet",
  issued: "Slip issued",
  active: "Active",
  suspended: "Suspended",
};
const STATE_TONE: Record<AccountState, string> = {
  none: C.faint,
  issued: C.purple,
  active: C.green,
  suspended: C.red,
};

export default function Households() {
  const s = useStore();
  const flash = useToast();
  const openImport = useImport();

  const [q, setQ] = useState("");
  const [picked, setPicked] = useState<string[]>([]);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState({ unit: "", displayName: "", phone: "" });

  const rows = s.households.filter((h) =>
    !q.trim() ? true : `${h.unit} ${h.displayName} ${h.phone}`.toLowerCase().includes(q.trim().toLowerCase())
  );
  const noAccount = rows.filter((h) => h.accountState === "none");

  const toggle = (id: string) =>
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  const issue = async () => {
    if (!picked.length) {
      flash("Select the households to issue accounts for");
      return;
    }
    const res = await s.push(() => api.office.issueAccounts(picked));
    const slips = res?.data ?? [];
    s.setHouseholds((list) =>
      list.map((h) => {
        const slip = slips.find((x) => x.userId === h.id);
        if (!slip && !picked.includes(h.id)) return h;
        return {
          ...h,
          accountState: "issued" as AccountState,
          tempPassword: slip?.tempPassword ?? h.tempPassword ?? "issued",
        };
      })
    );
    flash(`${picked.length} account${picked.length === 1 ? "" : "s"} issued — print the slips`);
    setPicked([]);
  };

  const exportCreds = () => {
    const withSlips = s.households.filter((h) => h.tempPassword);
    if (!withSlips.length) {
      flash("No temp passwords to export — issue accounts first");
      return;
    }
    writeSheet(
      "gather-credential-slips.csv",
      withSlips.map((h) => ({
        Unit: h.unit, Household: h.displayName,
        Username: (h as { username?: string }).username ?? "", TempPassword: h.tempPassword,
      }))
    ).then((f) => flash(`${f} downloaded`));
  };

  const reset = async (id: string, name: string) => {
    const res = await s.push(() => api.office.resetPassword(id));
    s.setHouseholds((list) =>
      list.map((h) =>
        h.id === id ? { ...h, tempPassword: res?.tempPassword ?? "reset", accountState: "issued" } : h
      )
    );
    flash(res?.tempPassword ? `${name}: new temp password ${res.tempPassword}` : `${name} reset`);
  };

  const add = async () => {
    if (!draft.unit.trim() || !draft.displayName.trim()) {
      flash("A roster row needs a unit and a name");
      return;
    }
    const created = await s.push(() => api.office.createHousehold(draft));
    if (created) s.setHouseholds((list) => [created, ...list]);
    flash(`${draft.displayName} added to the roster`);
    setDraft({ unit: "", displayName: "", phone: "" });
    setAdding(false);
  };

  return (
    <div>
      <PageHead
        title="Households &amp; accounts"
        sub={`${s.households.length} on the roster · ${noAccount.length} without a login`}
      >
        <SearchInput value={q} onChange={setQ} placeholder="Search unit or name" width={220} />
        <GhostBtn tone={C.purple} onClick={() => openImport("roster")}>Import roster</GhostBtn>
        <GhostBtn
          onClick={() =>
            writeSheet(
              "gather-roster.xlsx",
              s.households.map((h) => ({
                Unit: h.unit, Household: h.displayName, Phone: h.phone,
                Account: STATE_LABEL[h.accountState], Orders: h.ordersCount,
              }))
            ).then((f) => flash(`${f} downloaded`))
          }
        >
          Export .xlsx
        </GhostBtn>
      </PageHead>

      {/* Bulk action bar */}
      <div
        style={{
          display: "flex", alignItems: "center", gap: 16, marginTop: 18, padding: "14px 16px",
          background: "#fff", border: `1px solid ${C.border}`, borderRadius: 10,
        }}
      >
        <div style={{ fontSize: 12.5, fontWeight: 700 }}>
          {picked.length ? `${picked.length} selected` : "Select households to issue logins"}
        </div>
        <div style={{ flex: 1 }} />
        <LinkBtn onClick={() => setPicked(noAccount.map((h) => h.id))}>
          Select all without an account
        </LinkBtn>
        <DarkBtn onClick={issue}>Issue accounts &amp; temp passwords</DarkBtn>
        <GhostBtn onClick={exportCreds}>Export credential slips .csv</GhostBtn>
      </div>

      <div style={{ marginTop: 20 }}>
        <TableHead
          template={TPL}
          cols={[
            "", "Unit", "Household", "Phone", "Account", "Temp password",
            <div style={{ textAlign: "right" }}>Orders</div>,
            <LinkBtn onClick={() => setAdding((v) => !v)}>{adding ? "Cancel" : "+ Add"}</LinkBtn>,
          ]}
        />

        {adding && (
          <Row template={TPL} style={{ padding: "13px 12px", background: C.rowHover }}>
            <div />
            <input
              value={draft.unit}
              onChange={(e) => setDraft({ ...draft, unit: e.target.value })}
              placeholder="A #01-01"
              style={miniInput}
            />
            <input
              value={draft.displayName}
              onChange={(e) => setDraft({ ...draft, displayName: e.target.value })}
              placeholder="Household name"
              style={miniInput}
            />
            <input
              value={draft.phone}
              onChange={(e) => setDraft({ ...draft, phone: e.target.value })}
              placeholder="09 …"
              style={miniInput}
            />
            <div style={{ fontSize: 11.5, color: C.faint }}>No login yet</div>
            <div />
            <div />
            <DarkBtn onClick={add} style={{ padding: "8px 6px", fontSize: 11.5 }}>Add</DarkBtn>
          </Row>
        )}

        {rows.map((h) => (
          <Row key={h.id} template={TPL} style={{ padding: "13px 12px", background: "#fff" }}>
            <Tick on={picked.includes(h.id)} onToggle={() => toggle(h.id)} />
            <div style={{ fontFamily: F.mono, fontSize: 12 }}>{h.unit}</div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {h.displayName}
              </div>
              <div style={{ fontSize: 11, color: C.faint, marginTop: 3 }}>{h.note}</div>
            </div>
            <div style={{ fontFamily: F.mono, fontSize: 11.5, color: C.muted }}>{h.phone || "—"}</div>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: STATE_TONE[h.accountState] }}>
              {STATE_LABEL[h.accountState]}
            </div>
            <div style={{ fontFamily: F.mono, fontSize: 11.5, color: C.faint }}>
              {h.tempPassword ?? "—"}
            </div>
            <div style={{ ...R({ textAlign: "right" }), fontFamily: F.mono, fontSize: 12, color: C.muted }}>
              {h.ordersCount}
            </div>
            <button
              type="button"
              onClick={() => reset(h.id, h.displayName)}
              style={{
                padding: "8px 6px", borderRadius: 8, border: `1px solid ${C.input}`,
                background: "#fff", color: C.ink, fontFamily: F.body, fontSize: 11.5,
                fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap",
              }}
            >
              Reset
            </button>
          </Row>
        ))}
      </div>
    </div>
  );
}

const miniInput = {
  width: "100%", padding: "8px 10px", borderRadius: 8,
  border: `1px solid ${C.input}`, fontFamily: F.body, fontSize: 12, color: C.ink,
} as const;
