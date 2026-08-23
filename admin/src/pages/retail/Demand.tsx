import { api } from "../../api/client";
import { useStore } from "../../context/store";
import { useToast } from "../../context/ToastContext";
import { writeSheet } from "../../lib/sheet";
import { C, F } from "../../theme";
import { Eyebrow, GhostBtn, PageHead, Panel, R, Row, Split, StatLine, TableHead } from "../../components/ui";

const TPL = "minmax(200px,1fr) 88px 118px 160px 108px";

export default function Demand() {
  const s = useStore();
  const flash = useToast();

  const rows = s.wishlist.slice().sort((a, b) => b.votes - a.votes);
  const open = rows.filter((w) => !w.addedToCatalog);
  const totalVotes = rows.reduce((a, w) => a + w.votes, 0);
  /* The design's own sourcing rule of thumb: 15+ votes across two towers
     usually clears a 20-unit tier in the first cycle. */
  const clearing = rows.filter((w) => w.votes >= 15 && w.communitiesLabel.includes(",")).length;

  const addToCatalog = async (id: string, name: string) => {
    s.setWishlist((list) => list.map((w) => (w.id === id ? { ...w, addedToCatalog: true } : w)));
    const created = await s.push(() => api.retail.addToCatalog(id));
    if (created) s.setProducts((ps) => [created, ...ps]);
    flash(`${name} added to the catalog as a draft line`);
  };

  return (
    <div>
      <PageHead title="Resident demand" sub="Wishlist votes and unmet searches, straight from the blocks.">
        <GhostBtn
          onClick={() =>
            writeSheet(
              "gather-demand.xlsx",
              rows.map((w) => ({
                Item: w.name, Note: w.note, Votes: w.votes,
                Households: w.householdCount, Communities: w.communitiesLabel,
                Added: w.addedToCatalog ? "yes" : "no",
              }))
            ).then((f) => flash(`${f} downloaded`))
          }
        >
          Export .xlsx
        </GhostBtn>
      </PageHead>

      <Split
        style={{ marginTop: 22 }}
        leftMin={620}
        left={
          <div style={{ minWidth: 0 }}>
            <TableHead
              template={TPL}
              cols={[
                "Requested item",
                <div style={{ textAlign: "right" }}>Votes</div>,
                <div style={{ textAlign: "right" }}>Households</div>,
                "Communities", "",
              ]}
            />
            {rows.map((w) => (
              <Row key={w.id} template={TPL} gap={12} style={{ padding: "14px 12px", background: "#fff" }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{w.name}</div>
                  <div style={{ fontSize: 11.5, color: C.faint, marginTop: 3 }}>{w.note}</div>
                </div>
                <div style={{ ...R({ textAlign: "right" }), fontFamily: F.mono, fontSize: 12.5 }}>{w.votes}</div>
                <div style={{ ...R({ textAlign: "right" }), fontFamily: F.mono, fontSize: 12.5, color: C.muted }}>
                  {w.householdCount}
                </div>
                <div style={{ fontSize: 11.5, color: C.muted }}>{w.communitiesLabel}</div>
                <button
                  type="button"
                  disabled={w.addedToCatalog}
                  onClick={() => addToCatalog(w.id, w.name)}
                  style={{
                    padding: "8px 6px", borderRadius: 8, fontFamily: F.body, fontSize: 11.5,
                    fontWeight: 700, whiteSpace: "nowrap",
                    cursor: w.addedToCatalog ? "default" : "pointer",
                    border: `1px solid ${w.addedToCatalog ? C.input : C.ink}`,
                    background: w.addedToCatalog ? "#fff" : C.ink,
                    color: w.addedToCatalog ? C.green : "#fff",
                  }}
                >
                  {w.addedToCatalog ? "On sheet" : "Add as line"}
                </button>
              </Row>
            ))}
          </div>
        }
        right={
          <Panel>
            <Eyebrow>Sourcing notes</Eyebrow>
            <div style={{ fontSize: 12.5, color: C.ink2, lineHeight: 1.6, marginTop: 10 }}>
              Anything above 15 votes across two towers usually clears a 20-unit tier in its first
              cycle. Add it as a trial line before committing to a case buy.
            </div>
            <div style={{ display: "flex", flexDirection: "column", marginTop: 16 }}>
              <StatLine label="Open requests" value={String(open.length)} />
              <StatLine label="Total votes" value={String(totalVotes)} />
              <StatLine label="Likely to clear a tier" value={String(clearing)} tone={C.green} />
            </div>
          </Panel>
        }
      />
    </div>
  );
}
