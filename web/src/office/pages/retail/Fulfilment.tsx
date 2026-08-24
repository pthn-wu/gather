import { api } from "../../api/client";
import { STAGE_LIST } from "../../api/fixtures";
import { useStore } from "../../context/store";
import { useToast } from "../../context/ToastContext";
import { useImport } from "../../components/ImportModal";
import { buildPicks, tierLabel } from "../../lib/derive";
import { money } from "../../lib/format";
import { writeSheet } from "../../lib/sheet";
import { C, F } from "../../theme";
import {
  DarkBtn, Eyebrow, GhostBtn, PageHead, Panel, R, Row, Split, StatLine, TableHead,
} from "../../components/ui";

const TPL = "minmax(190px,1fr) 84px 92px 78px 92px 108px 96px";

export default function Fulfilment() {
  const s = useStore();
  const flash = useToast();
  const openImport = useImport();

  const comm = s.communityById(s.fulComm);
  const picks = buildPicks(s.products, comm, s.pickedQty);
  const stage = s.fulStage[s.fulComm] ?? "open";
  const stageIdx = STAGE_LIST.findIndex((x) => x.k === stage);

  const shortLines = picks.filter((p) => p.picked < p.ordered).length;
  const totalUnits = picks.reduce((a, p) => a + p.ordered, 0);
  const totalValue = picks.reduce((a, p) => a + p.value, 0);
  const cases = picks.reduce((a, p) => a + p.cases, 0);

  const advance = async () => {
    const next = STAGE_LIST[Math.min(STAGE_LIST.length - 1, stageIdx + 1)];
    s.setFulStage((m) => ({ ...m, [s.fulComm]: next.k as never }));
    await s.push(() => api.retail.advanceStage(s.fulComm));
    flash(`${comm.short ?? comm.name} · ${next.label.toLowerCase()}`);
  };

  const savePicked = async () => {
    const lines = picks.map((p) => ({ productId: p.product.id, pickedQty: p.picked }));
    await s.push(() => api.retail.updatePickLines(s.fulComm, lines));
    flash("Picked counts saved");
  };

  return (
    <div>
      <PageHead
        title={`Fulfilment · ${comm.short ?? comm.name}`}
        sub={`${picks.length} lines · ${totalUnits} units · ${shortLines ? `${shortLines} short` : "no variances"}`}
      >
        <GhostBtn
          onClick={() =>
            writeSheet(
              `gather-pick-${s.fulComm}.xlsx`,
              picks.map((p) => ({
                SKU: p.sku, Item: p.name, Pack: p.unit, Ordered: p.ordered,
                Cases: p.cases, Picked: p.picked,
                Variance: p.picked - p.ordered,
              }))
            ).then((f) => flash(`${f} downloaded`))
          }
        >
          Pick sheet .xlsx
        </GhostBtn>
        <GhostBtn
          onClick={() =>
            writeSheet(
              `gather-dispatch-${s.fulComm}.csv`,
              picks.map((p) => ({
                SKU: p.sku, Item: p.name, Units: p.ordered,
                Destination: comm.collectPoint, Delivery: comm.deliveryDate,
              }))
            ).then((f) => flash(`${f} downloaded`))
          }
        >
          Dispatch note .csv
        </GhostBtn>
        <GhostBtn tone={C.purple} onClick={() => openImport("picked")}>
          Import counts
        </GhostBtn>
      </PageHead>

      {/* Stage pipeline */}
      <div
        style={{
          display: "flex", alignItems: "center", marginTop: 20, background: "#fff",
          border: `1px solid ${C.border}`, borderRadius: 10, overflow: "hidden",
        }}
      >
        {STAGE_LIST.map((st, i) => {
          const done = i <= stageIdx;
          const current = i === stageIdx;
          return (
            <button
              key={st.k}
              type="button"
              onClick={() => {
                s.setFulStage((m) => ({ ...m, [s.fulComm]: st.k as never }));
                flash(`Stage set to ${st.label.toLowerCase()}`);
              }}
              style={{
                flex: 1, padding: "15px 12px", border: 0, borderRight: `1px solid ${C.line}`,
                background: current ? C.rowHover : "#fff", cursor: "pointer",
                textAlign: "left", fontFamily: F.body,
              }}
            >
              <div style={{ fontFamily: F.mono, fontSize: 11, color: done ? C.purple : C.faint3 }}>
                {String(i + 1).padStart(2, "0")}
              </div>
              <div style={{ fontSize: 12.5, fontWeight: current ? 800 : 600, color: done ? C.ink : C.faint2, marginTop: 5 }}>
                {st.label}
              </div>
              <div style={{ fontSize: 11, color: C.faint2, marginTop: 3 }}>{st.when}</div>
            </button>
          );
        })}
      </div>

      <Split
        style={{ marginTop: 24 }}
        leftMin={720}
        left={
          <div style={{ minWidth: 0 }}>
            <TableHead
              template={TPL}
              cols={[
                "Line",
                <div style={{ textAlign: "right" }}>Ordered</div>,
                <div style={{ textAlign: "right" }}>Tier hit</div>,
                <div style={{ textAlign: "right" }}>Cases</div>,
                <div style={{ textAlign: "right" }}>Value</div>,
                <div style={{ textAlign: "center" }}>Picked</div>,
                <div style={{ textAlign: "right" }}>Variance</div>,
              ]}
            />
            {picks.map((p) => {
              const v = p.picked - p.ordered;
              return (
                <Row key={p.product.id} template={TPL} style={{ padding: "13px 12px", background: "#fff" }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.35, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {p.name}
                    </div>
                    <div style={{ fontSize: 11, color: C.faint, marginTop: 3 }}>{p.sku} · {p.unit}</div>
                  </div>
                  <div style={{ ...R({ textAlign: "right" }), fontFamily: F.mono, fontSize: 12.5 }}>{p.ordered}</div>
                  <div style={{ ...R({ textAlign: "right" }), fontSize: 11.5, fontWeight: 700, color: p.tierIdx > 1 ? C.green : C.muted }}>
                    {tierLabel(p.tierIdx)}
                  </div>
                  <div style={{ ...R({ textAlign: "right" }), fontFamily: F.mono, fontSize: 12, color: C.muted }}>
                    {p.cases}
                  </div>
                  <div style={{ ...R({ textAlign: "right" }), fontFamily: F.mono, fontSize: 12.5 }}>{money(p.value)}</div>
                  <input
                    value={String(p.picked)}
                    onChange={(e) =>
                      s.setPickedQty((m) => ({ ...m, [`${s.fulComm}-${p.product.id}`]: e.target.value }))
                    }
                    onBlur={savePicked}
                    style={{
                      width: "100%", padding: "8px 10px", borderRadius: 8,
                      border: `1px solid ${C.input}`, fontFamily: F.mono, fontSize: 12.5,
                      color: C.ink, textAlign: "center",
                    }}
                  />
                  <div style={{ ...R({ textAlign: "right" }), fontSize: 11.5, fontWeight: 700, color: v === 0 ? C.green : C.red }}>
                    {v === 0 ? "ok" : v > 0 ? `+${v}` : String(v)}
                  </div>
                </Row>
              );
            })}
          </div>
        }
        right={
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <Panel>
              <Eyebrow>Drop summary</Eyebrow>
              <div style={{ display: "flex", flexDirection: "column", marginTop: 12 }}>
                <StatLine label="Lines on the sheet" value={String(picks.length)} />
                <StatLine label="Units ordered" value={String(totalUnits)} />
                <StatLine label="Cases to move" value={String(cases)} />
                <StatLine label="Order value" value={money(totalValue)} />
                <StatLine
                  label="Short lines"
                  value={shortLines ? String(shortLines) : "none"}
                  tone={shortLines ? C.red : C.green}
                />
              </div>
              <DarkBtn onClick={advance} style={{ marginTop: 18, width: "100%" }}>
                {stageIdx >= STAGE_LIST.length - 1
                  ? "Dispatched"
                  : `Advance to ${STAGE_LIST[stageIdx + 1].label.toLowerCase()}`}
              </DarkBtn>
              <GhostBtn
                tone={C.purple}
                onClick={() => flash(`${comm.short ?? comm.name} office notified`)}
                style={{ marginTop: 9, width: "100%" }}
              >
                Notify the property office
              </GhostBtn>
            </Panel>

            <Panel>
              <Eyebrow>Other communities</Eyebrow>
              <div style={{ display: "flex", flexDirection: "column", marginTop: 12 }}>
                {s.communities
                  .filter((c) => c.id !== s.fulComm)
                  .map((c) => {
                    const st = s.fulStage[c.id] ?? "open";
                    const def = STAGE_LIST.find((x) => x.k === st);
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => s.setFulComm(c.id)}
                        style={{
                          display: "flex", alignItems: "baseline", gap: 10, textAlign: "left",
                          width: "100%", padding: "11px 0", border: 0,
                          borderBottom: `1px solid ${C.lineSoft}`, background: "transparent",
                          cursor: "pointer", fontFamily: F.body,
                        }}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12.5, fontWeight: 700 }}>{c.name}</div>
                          <div style={{ fontSize: 11.5, color: C.faint, marginTop: 2 }}>
                            {c.collectPoint}
                          </div>
                        </div>
                        <div style={{ fontSize: 11.5, fontWeight: 700, color: st === "dispatched" ? C.green : C.muted }}>
                          {def?.label ?? st}
                        </div>
                      </button>
                    );
                  })}
              </div>
            </Panel>
          </div>
        }
      />
    </div>
  );
}
