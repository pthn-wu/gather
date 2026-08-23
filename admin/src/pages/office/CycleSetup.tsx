import { useState } from "react";
import { api } from "../../api/client";
import type { Community } from "../../api/types";
import { useStore } from "../../context/store";
import { useToast } from "../../context/ToastContext";
import { C } from "../../theme";
import { DarkBtn, Eyebrow, Field, GhostBtn, PageHead, Panel, Split } from "../../components/ui";

const dateInput = (v: string | undefined) => (v ? String(v).slice(0, 10) : "");

/**
 * What residents actually see for cutoff, collection point and window.
 * Saving here writes the community record AND drops a notice into every
 * verified household's Updates feed — that is the "notify residents" half.
 */
export default function CycleSetup() {
  const s = useStore();
  const flash = useToast();
  const comm = s.communityById(s.scope);

  const [draft, setDraft] = useState({
    collectPoint: comm.collectPoint,
    collectionWindow: comm.collectionWindow,
    cutoffDate: dateInput(comm.cutoffDate),
    deliveryDate: dateInput(comm.deliveryDate),
    blocksCovered: comm.blocksCovered ?? "A, B, C",
    officeContact: comm.officeContact ?? "",
  });

  const set = (k: keyof typeof draft) => (v: string) => setDraft((d) => ({ ...d, [k]: v }));

  const save = async () => {
    s.setCommunities((rows) =>
      rows.map((c) => (c.id === comm.id ? ({ ...c, ...draft } as Community) : c))
    );
    await s.push(() => api.office.updateSetup(draft));
    flash(`Setup saved · ${comm.households} households notified`);
  };

  return (
    <div>
      <PageHead
        title="Cycle &amp; collection setup"
        sub={`What residents at ${comm.short ?? comm.name} see for cutoffs, collection point and window.`}
      />

      <Split
        style={{ marginTop: 22 }}
        leftMin={520}
        left={
          <Panel>
            <Eyebrow>This community</Eyebrow>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 16 }}>
              <Field
                label="Collection point"
                value={draft.collectPoint}
                onChange={set("collectPoint")}
                hint="Shown on every resident order"
              />
              <Field
                label="Collection window"
                value={draft.collectionWindow}
                onChange={set("collectionWindow")}
                hint="Guard on duty for the whole window"
              />
              <Field
                label="Cutoff"
                value={draft.cutoffDate}
                onChange={set("cutoffDate")}
                type="date"
                hint="Orders after this roll into the next drop"
              />
              <Field
                label="Delivery day"
                value={draft.deliveryDate}
                onChange={set("deliveryDate")}
                type="date"
                hint="Set with Capital Retail"
              />
              <Field
                label="Blocks covered"
                value={draft.blocksCovered}
                onChange={set("blocksCovered")}
                hint="Anything outside this is not on the contract"
              />
              <Field
                label="Office contact"
                value={draft.officeContact}
                onChange={set("officeContact")}
                hint="Residents see this for account issues"
              />
            </div>
            <DarkBtn onClick={save} style={{ marginTop: 20 }}>
              Save and notify residents
            </DarkBtn>
          </Panel>
        }
        right={
          <Panel>
            <Eyebrow>Contract with Capital Retail</Eyebrow>
            <div style={{ display: "flex", flexDirection: "column", marginTop: 12 }}>
              <ContractLine label="Status" value={comm.contractStatus} tone={comm.contractStatus === "Signed" ? C.green : C.red} />
              <ContractLine label="Cycle number" value={String(comm.cycleNo)} />
              <ContractLine label="Households on the sheet" value={String(comm.households)} />
              <ContractLine label="Delivery days" value="Tuesday & Friday" />
              <ContractLine label="Tier thresholds" value="20 / 50 / 100 units" />
            </div>
            <GhostBtn
              tone={C.purple}
              onClick={() => flash("Change request sent to the Capital Retail account team")}
              style={{ marginTop: 16, width: "100%" }}
            >
              Request a change
            </GhostBtn>
          </Panel>
        }
      />
    </div>
  );
}

function ContractLine({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div
      style={{
        display: "flex", alignItems: "baseline", justifyContent: "space-between",
        gap: 12, padding: "11px 0", borderBottom: `1px solid ${C.lineSoft}`,
      }}
    >
      <div style={{ fontSize: 12.5, color: C.muted }}>{label}</div>
      <div style={{ fontSize: 12.5, fontWeight: 700, textAlign: "right", color: tone ?? C.ink }}>
        {value}
      </div>
    </div>
  );
}
