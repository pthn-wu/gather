import { api } from "../../api/client";
import { useStore } from "../../context/store";
import { useToast } from "../../context/ToastContext";
import { writeSheet } from "../../lib/sheet";
import { C, F } from "../../theme";
import { DarkBtn, Eyebrow, GhostBtn, PageHead, Panel, Split } from "../../components/ui";

/**
 * The exception queue. Accounts normally come off the unit roster, so what lands
 * here is the awkward stuff: a claim on a unit the office has not listed, a tenant
 * change, or a household wanting a second login. Approving one issues the account
 * and a temp password — this is the ONLY verification mechanism in Gather, there
 * are no SMS or email codes anywhere.
 */
export default function Verification() {
  const s = useStore();
  const flash = useToast();

  const kindTone = (kind: string) =>
    kind === "Tenant change" ? C.red : kind === "Second login" ? C.muted : C.purple;

  const approve = async (id: string, name: string, unit: string) => {
    const res = await s.push(() => api.office.approveVerification(id));
    s.setVerifications((rows) => rows.filter((v) => v.id !== id));
    s.setVerificationLog((log) => [
      { text: `Approved ${name} · ${unit} · account issued`, when: "just now", tone: "ok" },
      ...log,
    ]);
    if (res?.household) s.setHouseholds((rows) => [res.household, ...rows]);
    flash(
      res?.tempPassword
        ? `Account issued — temp password ${res.tempPassword}`
        : `${name} approved — account issued`
    );
  };

  const hold = async (id: string, name: string) => {
    await s.push(() => api.office.holdVerification(id));
    s.setVerifications((rows) => rows.filter((v) => v.id !== id));
    s.setVerificationLog((log) => [
      { text: `Asked ${name} for proof`, when: "just now", tone: "warn" },
      ...log,
    ]);
    flash(`${name} asked for proof`);
  };

  const reject = async (id: string, name: string, unit: string) => {
    await s.push(() => api.office.rejectVerification(id));
    s.setVerifications((rows) => rows.filter((v) => v.id !== id));
    s.setVerificationLog((log) => [
      { text: `Rejected claim on ${unit}`, when: "just now", tone: "bad" },
      ...log,
    ]);
    flash(`${name} rejected`);
  };

  return (
    <div>
      <PageHead
        title="Verification queue"
        sub={`${s.verifications.length} waiting on the office`}
      >
        <GhostBtn
          onClick={() =>
            writeSheet(
              "gather-verification-queue.xlsx",
              s.verifications.map((v) => ({
                Name: v.name, Unit: v.unit, Phone: v.phone, Kind: v.kind,
                OnRoster: v.rosterMatch, Proof: v.proof, Via: v.requestedVia, Note: v.note,
              }))
            ).then((f) => flash(`${f} downloaded`))
          }
        >
          Export queue .xlsx
        </GhostBtn>
      </PageHead>

      <div style={{ fontSize: 12.5, color: C.muted, lineHeight: 1.6, marginTop: 12, maxWidth: 760 }}>
        Accounts are created from the unit roster, so these are the exceptions: a claim on a unit
        you have not listed, a tenant change, or a household asking for a second login. Approving
        one issues the account and a temp password.
      </div>

      <Split
        style={{ marginTop: 22 }}
        leftMin={660}
        left={
          <div style={{ minWidth: 0 }}>
            {s.verifications.map((v) => (
              <div
                key={v.id}
                style={{
                  background: "#fff", border: `1px solid ${C.border}`, borderRadius: 10,
                  padding: 20, marginBottom: 14,
                  boxShadow: `inset 3px 0 0 ${kindTone(v.kind)}`,
                }}
              >
                <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
                  <div style={{ fontSize: 14, fontWeight: 800 }}>{v.name}</div>
                  <div style={{ fontFamily: F.mono, fontSize: 12, color: C.muted }}>{v.unit}</div>
                  <div style={{ flex: 1 }} />
                  <div style={{ fontSize: 11.5, fontWeight: 700, color: kindTone(v.kind) }}>{v.kind}</div>
                  <div style={{ fontSize: 11.5, color: C.faint }}>{v.createdAtLabel}</div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 16, marginTop: 14 }}>
                  <Cell label="Phone" mono>{v.phone}</Cell>
                  <Cell label="On roster" tone={v.rosterMatch.toLowerCase().includes("not") ? C.red : C.green} bold>
                    {v.rosterMatch}
                  </Cell>
                  <Cell label="Proof supplied" bold>{v.proof}</Cell>
                  <Cell label="Requested by">{v.requestedVia}</Cell>
                </div>

                <div style={{ fontSize: 12.5, color: C.ink2, lineHeight: 1.55, marginTop: 12 }}>{v.note}</div>

                <div style={{ display: "flex", gap: 9, marginTop: 16 }}>
                  <DarkBtn onClick={() => approve(v.id, v.name, v.unit)}>Approve &amp; issue account</DarkBtn>
                  <GhostBtn onClick={() => hold(v.id, v.name)}>Ask for proof</GhostBtn>
                  <GhostBtn tone={C.red} onClick={() => reject(v.id, v.name, v.unit)}>Reject</GhostBtn>
                </div>
              </div>
            ))}

            {s.verifications.length === 0 && (
              <div style={{ padding: "56px 0", borderTop: `1.5px solid ${C.ink}` }}>
                <div style={{ fontSize: 15, fontWeight: 800 }}>Queue is clear</div>
                <div style={{ fontSize: 13, color: C.muted, marginTop: 7, maxWidth: 420, lineHeight: 1.55 }}>
                  Every claim has been handled. New ones appear here as residents ask the office for
                  access.
                </div>
              </div>
            )}
          </div>
        }
        right={
          <Panel>
            <Eyebrow>Handled today</Eyebrow>
            <div style={{ display: "flex", flexDirection: "column", marginTop: 12 }}>
              {s.verificationLog.map((l, i) => (
                <div key={i} style={{ padding: "11px 0", borderBottom: `1px solid ${C.lineSoft}` }}>
                  <div
                    style={{
                      fontSize: 12.5, fontWeight: 700,
                      color: l.tone === "ok" ? C.green : l.tone === "bad" ? C.red : C.ink,
                    }}
                  >
                    {l.text}
                  </div>
                  <div style={{ fontSize: 11, color: C.faint2, marginTop: 2 }}>{l.when}</div>
                </div>
              ))}
              {s.verificationLog.length === 0 && (
                <div style={{ fontSize: 12.5, color: C.faint }}>Nothing handled yet today.</div>
              )}
            </div>
          </Panel>
        }
      />
    </div>
  );
}

function Cell({
  label, children, mono, bold, tone,
}: {
  label: string; children: React.ReactNode; mono?: boolean; bold?: boolean; tone?: string;
}) {
  return (
    <div>
      <div style={{ fontSize: 11, color: C.faint }}>{label}</div>
      <div
        style={{
          marginTop: 3, fontSize: 12.5, color: tone ?? C.ink,
          fontFamily: mono ? F.mono : F.body,
          fontWeight: bold ? 700 : 400,
        }}
      >
        {children}
      </div>
    </div>
  );
}
