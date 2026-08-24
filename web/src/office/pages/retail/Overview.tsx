import { useEffect, useState } from "react";
import { api } from "../../api/client";
import type { OverviewPayload } from "../../api/client";
import { STAGE_LIST } from "../../api/fixtures";
import { useStore } from "../../context/store";
import { useToast } from "../../context/ToastContext";
import { boardRow, livePrice, tierLabel } from "../../lib/derive";
import { money } from "../../lib/format";
import { writeSheet } from "../../lib/sheet";
import { C, F } from "../../theme";
import { Eyebrow, GhostBtn, KpiStrip, LinkBtn, PageHead, Panel, R, Row } from "../../components/ui";

const TPL = "minmax(0,1fr) 92px 78px 118px 96px 104px 112px";

export default function Overview() {
  const s = useStore();
  const flash = useToast();
  const [remote, setRemote] = useState<OverviewPayload | null>(null);

  useEffect(() => {
    let alive = true;
    api.retail
      .overview(s.retailScope)
      .then((p) => alive && p && setRemote(p))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [s.retailScope]);

  const comms =
    s.retailScope === "all" ? s.communities : s.communities.filter((c) => c.id === s.retailScope);
  const board = comms.map((c) => boardRow(c, s.products, s.orders));
  const gmv = board.reduce((a, b) => a + b.value, 0);
  const gm = board.reduce((a, b) => a + b.margin, 0);
  const outstanding = s.orders.filter((o) => !o.paid).reduce((a, o) => a + o.total, 0);
  const activeLines = s.products.filter((p) => p.active).length;

  const kpis = remote?.kpis ?? [
    { value: money(gmv), label: "Group order value", note: "this cycle, all towers" },
    {
      value: String(board.reduce((a, b) => a + b.orders, 0)),
      label: "Household orders", note: "placed since Wednesday",
    },
    {
      value: String(board.reduce((a, b) => a + b.units, 0)),
      label: "Units on the sheets", note: "drives tier unlocks",
    },
    {
      value: (gmv ? Math.round((gm / gmv) * 100) : 0) + "%",
      label: "Blended margin", note: money(gm) + " contribution", tone: C.green,
    },
    { value: money(outstanding), label: "Cash outstanding", note: "unpaid at collection", tone: C.red },
  ];

  const movers = s.products
    .slice()
    .sort((a, b) => b.unitsThisCycle - a.unitsThisCycle)
    .slice(0, 5)
    .map((p) => {
      const lp = livePrice(p);
      return {
        name: p.name,
        note: `${p.sku} · ${tierLabel(lp.tierIdx)} tier · ${lp.margin}% margin`,
        units: `${p.unitsThisCycle} u`,
      };
    });

  const todos = [
    {
      title: "Short lines in the Gems 1 pick",
      body: "Picked counts are under what households ordered. Decide substitutions before packing closes.",
      cta: "Open fulfilment",
      act: () => {
        s.setFulComm("G1");
        s.setRetailScreen("fulfil");
      },
    },
    {
      title: "Coconut water is delisted but still wished for",
      body: "12 units last cycle, 8 households asking again. Reprice or drop it from the sheet.",
      cta: "Open the item",
      act: () => s.setRetailScreen("catalog"),
    },
    {
      title: "Gems 4 is on pilot terms",
      body: "38 households and rising. Pilot margin is 4 points under the signed towers.",
      cta: "Review cycles",
      act: () => s.setRetailScreen("cycles"),
    },
    {
      title: "Rice week ends Monday",
      body: "88 units so far. Extend it or let the tier revert on the next sheet.",
      cta: "Open promotions",
      act: () => s.setRetailScreen("promos"),
    },
  ];

  const exportRows = board.map((b) => ({
    Community: b.community.name,
    Households: b.community.households,
    Orders: b.orders,
    Units: b.units,
    Value: b.value,
    Margin: b.margin,
    MarginPct: b.marginPct + "%",
    Stage: s.fulStage[b.community.id] ?? "open",
    CollectionPoint: b.community.collectPoint,
  }));

  return (
    <div>
      <PageHead
        title={`Cycle 34 at a glance`}
        sub={`${s.communities.length} communities · ${activeLines} lines live · cutoff Sunday 10pm`}
      >
        <GhostBtn onClick={async () => flash(await writeSheet("gather-cycle-34-overview.xlsx", exportRows))}>
          Export .xlsx
        </GhostBtn>
        <GhostBtn
          tone={C.muted}
          onClick={async () =>
            flash(
              await writeSheet(
                "gather-cycle-34-overview.csv",
                board.map((b) => ({
                  Community: b.community.name, Orders: b.orders, Units: b.units,
                  Value: b.value, Margin: b.margin,
                }))
              )
            )
          }
        >
          .csv
        </GhostBtn>
      </PageHead>

      <KpiStrip items={kpis} columns={5} />

      <div
        style={{
          display: "grid", gridTemplateColumns: "minmax(0,1fr) clamp(310px, 30%, 372px)", gap: 26,
          alignItems: "start", marginTop: 30,
        }}
      >
        <div style={{ minWidth: 0 }}>
          <Eyebrow style={{ paddingBottom: 11, borderBottom: `1.5px solid ${C.ink}` }}>
            Communities this cycle
          </Eyebrow>
          <div
            style={{
              display: "grid", gridTemplateColumns: TPL, gap: 12, padding: "11px 12px",
              fontSize: 11, fontWeight: 800, letterSpacing: ".06em", textTransform: "uppercase",
              color: C.faint, borderBottom: `1px solid ${C.line}`,
            }}
          >
            <div>Community</div>
            <div style={{ textAlign: "right" }}>Orders</div>
            <div style={{ textAlign: "right" }}>Units</div>
            <div style={{ textAlign: "right" }}>Value</div>
            <div style={{ textAlign: "right" }}>Margin</div>
            <div>Stage</div>
            <div />
          </div>
          {board.map((b) => {
            const stage = s.fulStage[b.community.id] ?? "open";
            const stageLabel = STAGE_LIST.find((x) => x.k === stage)?.label ?? "Sheet open";
            return (
              <Row key={b.community.id} template={TPL} gap={12} style={{ padding: "15px 12px" }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 700 }}>{b.community.name}</div>
                  <div style={{ fontSize: 11.5, color: C.faint, marginTop: 3 }}>
                    {b.community.households} households · {b.community.collectPoint}
                  </div>
                </div>
                <div style={R()}>{b.orders}</div>
                <div style={R()}>{b.units}</div>
                <div style={R()}>{money(b.value)}</div>
                <div style={R({ color: b.marginPct < 18 ? C.red : C.green })}>{b.marginPct}%</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: stage === "open" ? C.muted : C.purple }}>
                  {stageLabel}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    s.setFulComm(b.community.id);
                    s.setRetailScreen("fulfil");
                  }}
                  style={{
                    padding: "8px 6px", border: `1px solid ${C.input}`, borderRadius: 8,
                    background: "#fff", color: C.ink, fontFamily: F.body, fontSize: 11.5,
                    fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap",
                  }}
                >
                  Fulfilment
                </button>
              </Row>
            );
          })}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <Panel>
            <Eyebrow>Needs a decision</Eyebrow>
            <div style={{ display: "flex", flexDirection: "column", marginTop: 12 }}>
              {todos.map((t) => (
                <div key={t.title} style={{ padding: "12px 0", borderBottom: `1px solid ${C.lineSoft}` }}>
                  <div style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.4 }}>{t.title}</div>
                  <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.5, marginTop: 4 }}>
                    {t.body}
                  </div>
                  <LinkBtn onClick={t.act} style={{ marginTop: 7, fontSize: 12 }}>
                    {t.cta}
                  </LinkBtn>
                </div>
              ))}
            </div>
          </Panel>
          <Panel>
            <Eyebrow>Top movers this cycle</Eyebrow>
            <div style={{ display: "flex", flexDirection: "column", marginTop: 12 }}>
              {movers.map((m) => (
                <div
                  key={m.name}
                  style={{
                    display: "flex", alignItems: "baseline", gap: 12, padding: "10px 0",
                    borderBottom: `1px solid ${C.lineSoft}`,
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 600 }}>{m.name}</div>
                    <div style={{ fontSize: 11.5, color: C.faint2, marginTop: 2 }}>{m.note}</div>
                  </div>
                  <div style={{ fontFamily: F.mono, fontSize: 12 }}>{m.units}</div>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
