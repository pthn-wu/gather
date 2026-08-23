import { api } from "../../api/client";
import { useStore } from "../../context/store";
import { useToast } from "../../context/ToastContext";
import { useImport } from "../../components/ImportModal";
import { money, num } from "../../lib/format";
import { writeSheet } from "../../lib/sheet";
import { C, F } from "../../theme";
import {
  DarkBtn, Eyebrow, FieldLabel, GhostBtn, PageHead, Panel, R, Row, Split, StatLine, TableHead,
} from "../../components/ui";

const TPL = "96px 78px minmax(160px,1fr) 116px 128px 118px 108px";

export default function Payments() {
  const s = useStore();
  const flash = useToast();
  const openImport = useImport();

  const rows = s.orders.filter((o) => o.communityId === s.scope || o.code.startsWith(s.scope));
  const due = rows.filter((o) => !o.paid);
  const paid = rows.filter((o) => o.paid);

  /* Cash-up only counts what should physically be on the table: unpaid orders
     that have actually reached the collection point. */
  const expected = due
    .filter((o) => o.stage === "ready" || o.stage === "collected")
    .reduce((a, o) => a + o.total, 0);
  const counted = s.cashCount === "" ? null : num(s.cashCount);
  const variance = counted === null ? 0 : counted - expected;

  const markPaid = async (id: string, code: string) => {
    s.setOrders((list) => list.map((o) => (o.id === id ? { ...o, paid: true } : o)));
    await s.push(() => api.office.markPaid(id));
    flash(`${code} marked paid`);
  };

  const submit = async () => {
    if (counted === null) {
      flash("Enter the cash counted at the table first");
      return;
    }
    await s.push(() => api.office.submitCashup(counted));
    flash(
      variance === 0
        ? "Cash-up submitted — balanced"
        : `Cash-up submitted — ${variance > 0 ? "over" : "short"} by ${money(Math.abs(variance))}`
    );
  };

  return (
    <div>
      <PageHead
        title="Payments &amp; cash-up"
        sub={`${money(paid.reduce((a, o) => a + o.total, 0))} settled · ${money(due.reduce((a, o) => a + o.total, 0))} outstanding`}
      >
        <GhostBtn
          onClick={() =>
            writeSheet(
              "gather-ledger.xlsx",
              rows.map((o) => ({
                Order: o.code, Unit: o.unit, Household: o.householdName,
                Amount: o.total, Method: o.paymentMethod,
                State: o.paid ? "Paid" : "Due",
              }))
            ).then((f) => flash(`${f} downloaded`))
          }
        >
          Export ledger .xlsx
        </GhostBtn>
        <GhostBtn tone={C.purple} onClick={() => openImport("payments")}>
          Import bank file
        </GhostBtn>
      </PageHead>

      <Split
        style={{ marginTop: 22 }}
        left={
          <div style={{ minWidth: 0 }}>
            <TableHead
              template={TPL}
              cols={[
                "Order", "Unit", "Household",
                <div style={{ textAlign: "right" }}>Amount</div>,
                "Method", "State", "",
              ]}
            />
            {rows.map((o) => (
              <Row key={o.id} template={TPL} style={{ padding: "13px 12px", background: "#fff" }}>
                <div style={{ fontFamily: F.mono, fontSize: 12 }}>{o.code}</div>
                <div style={{ fontFamily: F.mono, fontSize: 12, color: C.muted }}>{o.unit}</div>
                <div style={{ minWidth: 0, fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {o.householdName}
                </div>
                <div style={{ ...R({ textAlign: "right" }), fontFamily: F.mono, fontSize: 12.5 }}>
                  {money(o.total)}
                </div>
                <div style={{ fontSize: 11.5, color: C.muted }}>
                  {o.paymentMethod === "mmqr" ? "MMQR · CTZPay" : "Cash at table"}
                </div>
                <div style={{ fontSize: 11.5, fontWeight: 700, color: o.paid ? C.green : C.red }}>
                  {o.paid ? "Paid" : "Due"}
                </div>
                <button
                  type="button"
                  disabled={o.paid}
                  onClick={() => markPaid(o.id, o.code)}
                  style={{
                    padding: "8px 6px", borderRadius: 8, fontFamily: F.body, fontSize: 11.5,
                    fontWeight: 700, whiteSpace: "nowrap",
                    cursor: o.paid ? "default" : "pointer",
                    border: `1px solid ${o.paid ? C.input : C.ink}`,
                    background: o.paid ? "#fff" : C.ink,
                    color: o.paid ? C.faint : "#fff",
                  }}
                >
                  {o.paid ? "Settled" : "Mark paid"}
                </button>
              </Row>
            ))}
          </div>
        }
        right={
          <Panel>
            <Eyebrow>Cash-up for this drop</Eyebrow>
            <div style={{ display: "flex", flexDirection: "column", marginTop: 14 }}>
              <StatLine label="Orders due cash" value={String(due.length)} />
              <StatLine label="Expected at the table" value={money(expected)} />
              <StatLine label="Already settled" value={money(paid.reduce((a, o) => a + o.total, 0))} tone={C.green} />
            </div>

            <div style={{ marginTop: 16 }}>
              <FieldLabel>Cash counted at the table</FieldLabel>
              <input
                value={s.cashCount}
                onChange={(e) => s.setCashCount(e.target.value)}
                placeholder="0"
                style={{
                  width: "100%", marginTop: 6, padding: "12px 13px", borderRadius: 9,
                  border: `1px solid ${C.input}`, fontFamily: F.mono, fontSize: 14, color: C.ink,
                }}
              />
            </div>

            <div
              style={{
                display: "flex", alignItems: "baseline", justifyContent: "space-between",
                marginTop: 14, paddingTop: 14, borderTop: `1px solid ${C.line}`,
              }}
            >
              <div style={{ fontSize: 12.5, fontWeight: 800 }}>Variance</div>
              <div
                style={{
                  fontFamily: F.mono, fontSize: 15,
                  color: counted === null ? C.faint : variance === 0 ? C.green : C.red,
                }}
              >
                {counted === null ? "—" : `${variance > 0 ? "+" : ""}${money(variance)}`}
              </div>
            </div>
            <div style={{ fontSize: 11.5, color: C.muted, lineHeight: 1.5, marginTop: 10 }}>
              {counted === null
                ? "Count the cash box and enter the total to check it against the table."
                : variance === 0
                  ? "Balanced — the box matches what was owed."
                  : variance > 0
                    ? "More in the box than expected. Check for a payment recorded against the wrong order."
                    : "Short. Check for an order collected without paying."}
            </div>

            <DarkBtn onClick={submit} style={{ marginTop: 16, width: "100%" }}>
              Submit cash-up to Capital Retail
            </DarkBtn>
          </Panel>
        }
      />
    </div>
  );
}
