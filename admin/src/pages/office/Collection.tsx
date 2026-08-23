import { api } from "../../api/client";
import { useStore } from "../../context/store";
import { useToast } from "../../context/ToastContext";
import { useImport } from "../../components/ImportModal";
import { money } from "../../lib/format";
import { writeSheet } from "../../lib/sheet";
import { C, F } from "../../theme";
import { DarkBtn, GhostBtn, KpiStrip, PageHead, R, Row, TableHead, Tick } from "../../components/ui";

const TPL = "40px 96px 78px minmax(180px,1fr) 92px 118px 132px 116px";

/** The printed sheet the guard ticks at the collection table. */
export default function Collection() {
  const s = useStore();
  const flash = useToast();
  const openImport = useImport();

  const comm = s.communityById(s.scope);
  const rows = s.orders.filter(
    (o) => (o.communityId === s.scope || o.code.startsWith(s.scope)) && o.stage !== "placed"
  );
  const isTicked = (id: string) => s.ticked.includes(id);
  const tickedRows = rows.filter((o) => isTicked(o.id) || o.stage === "collected");
  const expectedCash = rows.filter((o) => !o.paid).reduce((a, o) => a + o.total, 0);

  const toggle = async (id: string) => {
    const next = !isTicked(id);
    s.setTicked((t) => (next ? [...t, id] : t.filter((x) => x !== id)));
    await s.push(() => api.office.tickCollection([id], next));
  };

  const close = async () => {
    await s.push(() => api.office.closeCollection());
    const missed = rows.length - tickedRows.length;
    flash(
      missed > 0
        ? `Collection closed · ${missed} order${missed === 1 ? "" : "s"} not picked up`
        : "Collection closed · everyone collected"
    );
  };

  return (
    <div>
      <PageHead
        title="Collection sheet"
        sub={`${comm.collectPoint} · ${comm.collectionWindow}`}
      >
        <GhostBtn
          onClick={() =>
            writeSheet(
              `gather-collection-${s.scope}.xlsx`,
              rows.map((o) => ({
                Order: o.code, Unit: o.unit, Household: o.householdName,
                Items: o.itemsLabel, Total: o.total,
                Payment: o.paid ? "Paid" : "Cash due", Collected: "",
              }))
            ).then((f) => flash(`${f} downloaded`))
          }
        >
          Print sheet .xlsx
        </GhostBtn>
        <GhostBtn tone={C.purple} onClick={() => openImport("collect")}>
          Import ticked sheet
        </GhostBtn>
        <DarkBtn onClick={close}>Close collection</DarkBtn>
      </PageHead>

      <div style={{ marginTop: 20 }}>
        <KpiStrip
          columns={4}
          items={[
            { value: String(rows.length), label: "Orders expected at the table" },
            { value: String(tickedRows.length), label: "Ticked off so far", tone: C.green },
            { value: String(rows.length - tickedRows.length), label: "Still to collect" },
            { value: money(expectedCash), label: "Cash due at the table", tone: C.red },
          ]}
        />
      </div>

      <div style={{ marginTop: 22 }}>
        <TableHead
          template={TPL}
          cols={[
            "", "Order", "Unit", "Household",
            <div style={{ textAlign: "right" }}>Items</div>,
            <div style={{ textAlign: "right" }}>Total</div>,
            "Payment", "Collected by",
          ]}
        />
        {rows.map((o) => {
          const on = isTicked(o.id) || o.stage === "collected";
          return (
            <Row
              key={o.id}
              template={TPL}
              style={{ padding: "13px 12px", background: on ? C.rowHover : "#fff" }}
            >
              <Tick on={on} onToggle={() => toggle(o.id)} size={19} />
              <div style={{ fontFamily: F.mono, fontSize: 12 }}>{o.code}</div>
              <div style={{ fontFamily: F.mono, fontSize: 12, color: C.muted }}>{o.unit}</div>
              <div
                style={{
                  minWidth: 0, fontSize: 13, fontWeight: on ? 400 : 700,
                  color: on ? C.muted : C.ink,
                  whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                }}
              >
                {o.householdName}
              </div>
              <div style={{ ...R({ textAlign: "right" }), fontFamily: F.mono, fontSize: 12, color: C.muted }}>
                {o.itemsLabel.split(",").length}
              </div>
              <div style={{ ...R({ textAlign: "right" }), fontFamily: F.mono, fontSize: 12.5 }}>
                {money(o.total)}
              </div>
              <div style={{ fontSize: 11.5, fontWeight: 700, color: o.paid ? C.green : C.red }}>
                {o.paid ? "Paid" : "Cash due"}
              </div>
              <div style={{ fontSize: 11.5, color: C.muted }}>
                {o.collectedBy ?? (on ? "Household" : "—")}
              </div>
            </Row>
          );
        })}
      </div>
    </div>
  );
}
