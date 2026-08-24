import { useState } from "react";
import { useStore } from "../../context/store";
import { useToast } from "../../context/ToastContext";
import { money } from "../../lib/format";
import { writeSheet } from "../../lib/sheet";
import { C, F } from "../../theme";
import { GhostBtn, PageHead, R, Row, TableHead, Tabs } from "../../components/ui";

const TPL = "96px 78px minmax(0,1fr) minmax(0,1fr) 92px 118px 118px";

const STAGE_LABEL: Record<string, string> = {
  placed: "Order in",
  packing: "Packing",
  ready: "Ready",
  collected: "Collected",
};

export default function Orders() {
  const s = useStore();
  const flash = useToast();
  const [filter, setFilter] = useState("all");

  const mine = s.orders.filter((o) => o.communityId === s.scope || o.code.startsWith(s.scope));
  const pass = (o: (typeof mine)[number]) =>
    filter === "all"
      ? true
      : filter === "open"
        ? o.stage !== "collected"
        : filter === "due"
          ? !o.paid
          : o.stage === "collected";

  const rows = mine.filter(pass);
  const tabs = [
    { k: "all", label: "All", count: mine.length },
    { k: "open", label: "Not collected", count: mine.filter((o) => o.stage !== "collected").length },
    { k: "due", label: "Unpaid", count: mine.filter((o) => !o.paid).length },
    { k: "collected", label: "Collected", count: mine.filter((o) => o.stage === "collected").length },
  ];

  return (
    <div>
      <PageHead
        title="Orders on the block"
        sub={`${rows.length} shown · ${money(rows.reduce((a, o) => a + o.total, 0))}`}
      >
        <GhostBtn
          onClick={() =>
            writeSheet(
              "gather-orders.xlsx",
              rows.map((o) => ({
                Order: o.code, Unit: o.unit, Household: o.householdName, Items: o.itemsLabel,
                Value: o.total, Stage: STAGE_LABEL[o.stage] ?? o.stage,
                Payment: o.paid ? "Paid" : "Due", Method: o.paymentMethod,
              }))
            ).then((f) => flash(`${f} downloaded`))
          }
        >
          Export .xlsx
        </GhostBtn>
      </PageHead>

      <div style={{ marginTop: 18, borderBottom: `1px solid ${C.lineTop}` }}>
        <Tabs tabs={tabs} active={filter} onPick={setFilter} gap={20} />
      </div>

      <div style={{ marginTop: 20 }}>
        <TableHead
          template={TPL}
          cols={[
            "Order", "Unit", "Household", "Items",
            <div style={{ textAlign: "right" }}>Value</div>,
            "Stage", "Payment",
          ]}
        />
        {rows.map((o) => (
          <Row key={o.id} template={TPL} style={{ padding: "13px 12px", background: "#fff" }}>
            <div style={{ fontFamily: F.mono, fontSize: 12 }}>{o.code}</div>
            <div style={{ fontFamily: F.mono, fontSize: 12, color: C.muted }}>{o.unit}</div>
            <div style={{ minWidth: 0, fontSize: 13, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {o.householdName}
            </div>
            <div style={{ minWidth: 0, fontSize: 12, color: C.muted, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {o.itemsLabel}
            </div>
            <div style={{ ...R({ textAlign: "right" }), fontFamily: F.mono, fontSize: 12.5 }}>{money(o.total)}</div>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: o.stage === "collected" ? C.muted : o.stage === "ready" ? C.purple : C.ink }}>
              {STAGE_LABEL[o.stage] ?? o.stage}
            </div>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: o.paid ? C.green : C.red }}>
              {o.paid ? "Paid" : "Due"}
            </div>
          </Row>
        ))}
        {rows.length === 0 && (
          <div style={{ padding: "56px 12px" }}>
            <div style={{ fontSize: 15, fontWeight: 800 }}>Nothing in this view</div>
            <div style={{ fontSize: 13, color: C.muted, marginTop: 7 }}>
              Try another filter — orders appear here as households place them.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
