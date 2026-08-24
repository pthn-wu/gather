import { api } from "../../api/client";
import { useStore } from "../../context/store";
import { useToast } from "../../context/ToastContext";
import { useImport } from "../../components/ImportModal";
import { writeSheet } from "../../lib/sheet";
import { C, F } from "../../theme";
import { Eyebrow, GhostBtn, LinkBtn, PageHead, Panel, R, Row, TableHead } from "../../components/ui";

const TPL = "minmax(180px,1fr) 96px 140px 140px 168px 110px 108px";

/** ISO datetime -> the `yyyy-mm-dd` an <input type="date"> needs. */
const dateInput = (v: string | undefined) => (v ? String(v).slice(0, 10) : "");

export default function Cycles() {
  const s = useStore();
  const flash = useToast();
  const openImport = useImport();

  const patch = async (id: string, input: Record<string, string>) => {
    s.setCommunities((rows) => rows.map((c) => (c.id === id ? { ...c, ...input } : c)));
    await s.push(() => api.retail.updateCycle(id, input));
  };

  const publish = async (id: string) => {
    await s.push(() => api.retail.publishCycle(id));
    const c = s.communityById(id);
    flash(`${c.short ?? c.name} sheet published — residents see the new cycle`);
  };

  return (
    <div>
      <PageHead
        title="Cycles, cutoffs &amp; accounts"
        sub="Delivery days and cutoffs per community. Publishing pushes the sheet to residents."
      >
        <GhostBtn
          onClick={() =>
            writeSheet(
              "gather-cycles.xlsx",
              s.communities.map((c) => ({
                Community: c.name, Cycle: c.cycleNo,
                Cutoff: dateInput(c.cutoffDate), Delivery: dateInput(c.deliveryDate),
                Point: c.collectPoint, Window: c.collectionWindow, Contract: c.contractStatus,
              }))
            ).then((f) => flash(`${f} downloaded`))
          }
        >
          Export .xlsx
        </GhostBtn>
        <GhostBtn tone={C.purple} onClick={() => openImport("cycles")}>
          Import calendar
        </GhostBtn>
      </PageHead>

      <div style={{ marginTop: 22 }}>
        <TableHead
          template={TPL}
          cols={[
            "Community",
            <div style={{ textAlign: "right" }}>Cycle</div>,
            "Cutoff", "Delivery", "Collection point", "Contract", "",
          ]}
        />
        {s.communities.map((c) => (
          <Row key={c.id} template={TPL} gap={12} style={{ padding: "14px 12px", background: "#fff" }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700 }}>{c.name}</div>
              <div style={{ fontSize: 11.5, color: C.faint, marginTop: 3 }}>
                {c.households} households · {c.collectionWindow}
              </div>
            </div>
            <div style={{ ...R({ textAlign: "right" }), fontFamily: F.mono, fontSize: 12.5 }}>{c.cycleNo}</div>
            <input
              type="date"
              value={dateInput(c.cutoffDate)}
              onChange={(e) => patch(c.id, { cutoffDate: e.target.value })}
              style={cellInput}
            />
            <input
              type="date"
              value={dateInput(c.deliveryDate)}
              onChange={(e) => patch(c.id, { deliveryDate: e.target.value })}
              style={cellInput}
            />
            <input
              value={c.collectPoint}
              onChange={(e) => patch(c.id, { collectPoint: e.target.value })}
              style={cellInput}
            />
            <div style={{ fontSize: 11.5, fontWeight: 700, color: c.contractStatus === "Signed" ? C.green : C.red }}>
              {c.contractStatus}
            </div>
            <button
              type="button"
              onClick={() => publish(c.id)}
              style={{
                padding: "8px 6px", borderRadius: 8, cursor: "pointer", fontFamily: F.body,
                fontSize: 11.5, fontWeight: 700, border: `1px solid ${C.ink}`,
                background: C.ink, color: "#fff", whiteSpace: "nowrap",
              }}
            >
              Publish
            </button>
          </Row>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 20, marginTop: 30 }}>
        <Panel>
          <Eyebrow>Cutoff discipline</Eyebrow>
          <div style={{ fontSize: 12.5, color: C.ink2, lineHeight: 1.6, marginTop: 9 }}>
            Orders after cutoff roll into the next drop rather than the current one. Residents can
            edit freely until then, and the price they pay is whatever the block unlocks by cutoff.
          </div>
          <LinkBtn onClick={() => flash("Cutoff policy is per community, set above")} style={{ marginTop: 11 }}>
            How cutoffs work
          </LinkBtn>
        </Panel>
        <Panel>
          <Eyebrow>Opening a new tower</Eyebrow>
          <div style={{ fontSize: 12.5, color: C.ink2, lineHeight: 1.6, marginTop: 9 }}>
            Capital Retail opens a property once 40 households register interest, then issues one
            office console login to the property manager.
          </div>
          <LinkBtn onClick={() => flash("Request sent to the account team")} style={{ marginTop: 11 }}>
            Request a new contract
          </LinkBtn>
        </Panel>
        <Panel>
          <Eyebrow>Console accounts</Eyebrow>
          <div style={{ fontSize: 12.5, color: C.ink2, lineHeight: 1.6, marginTop: 9 }}>
            Each property office gets one console login. Resident accounts are never created here —
            the office issues those from its own Households screen.
          </div>
          <LinkBtn onClick={() => flash("Account team notified")} style={{ marginTop: 11 }}>
            Reset an office password
          </LinkBtn>
        </Panel>
      </div>
    </div>
  );
}

const cellInput = {
  width: "100%", padding: "9px 10px", borderRadius: 8,
  border: `1px solid ${C.input}`, fontFamily: F.body, fontSize: 11.5,
  fontWeight: 600, color: C.ink,
} as const;
