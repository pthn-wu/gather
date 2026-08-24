import { useState } from "react";
import { api } from "../../api/client";
import type { PromotionMechanic } from "../../api/types";
import { useStore } from "../../context/store";
import { useToast } from "../../context/ToastContext";
import { useImport } from "../../components/ImportModal";
import { money } from "../../lib/format";
import { writeSheet } from "../../lib/sheet";
import { C, F } from "../../theme";
import {
  Chip, DarkBtn, Eyebrow, Field, FieldLabel, GhostBtn, PageHead, Panel, R, Row, Split, TableHead,
} from "../../components/ui";

const TPL = "minmax(200px,1fr) 128px 108px 150px 96px 84px";

/** The four mechanics, with the design's own copy and value-field labels. */
const KINDS: { k: PromotionMechanic; label: string; note: string; valueLabel: string }[] = [
  { k: "tier", label: "Unlock a deeper tier early", note: "Give the block a tier price before it hits the unit count", valueLabel: "Tier to unlock" },
  { k: "percent", label: "Percentage off", note: "Straight discount on one item or the whole basket", valueLabel: "Percent off" },
  { k: "bundle", label: "Bundle discount", note: "Two or more items bought together", valueLabel: "Kyat off bundle" },
  { k: "threshold", label: "Basket threshold perk", note: "Free porter or delivery above a basket value", valueLabel: "Basket threshold" },
];

const dateLabel = (iso: string) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
};

export default function Promotions() {
  const s = useStore();
  const flash = useToast();
  const openImport = useImport();

  const [name, setName] = useState("");
  const [kind, setKind] = useState<PromotionMechanic>("tier");
  const [value, setValue] = useState("");
  const [productId, setProductId] = useState<string>("");
  const [from, setFrom] = useState("2026-08-24");
  const [to, setTo] = useState("2026-08-31");
  const [where, setWhere] = useState<string[]>([s.communities[0]?.id ?? "G1"]);

  const kindDef = KINDS.find((k) => k.k === kind)!;
  const live = s.promotions.filter((p) => p.live).length;

  const toggleWhere = (id: string) =>
    setWhere((w) => (w.includes(id) ? w.filter((x) => x !== id) : [...w, id]));

  const togglePromo = async (id: string, nextLive: boolean) => {
    s.setPromotions((rows) => rows.map((p) => (p.id === id ? { ...p, live: nextLive } : p)));
    await s.push(() => api.retail.updatePromotion(id, { live: nextLive }));
    flash(nextLive ? "Promotion is live on the resident sheet" : "Promotion paused");
  };

  const create = async () => {
    if (!name.trim() || !value.trim()) {
      flash("Give the promotion a name and a value");
      return;
    }
    if (!where.length) {
      flash("Pick at least one community");
      return;
    }
    const created = await s.push(() =>
      api.retail.createPromotion({
        name: name.trim(),
        mechanic: kind,
        value: value.trim(),
        productId: productId || null,
        communityIds: where,
        startsAt: from,
        endsAt: to,
        live: true,
      } as never)
    );
    if (created) s.setPromotions((rows) => [created, ...rows]);
    setName("");
    setValue("");
    flash(`${name.trim()} published — residents see it now`);
  };

  const preview = (() => {
    const item = s.products.find((p) => p.id === productId);
    const scope = where
      .map((id) => s.communityById(id).short ?? s.communityById(id).name)
      .join(", ");
    const target = item ? item.name : "every item in the basket";
    if (!value.trim()) return "Set a value to see how this reads to residents.";
    if (kind === "tier") return `${scope}: ${target} jumps to the ${value} price before the block reaches the unit count.`;
    if (kind === "percent") return `${scope}: ${value} off ${target}, applied on the sheet and in the cart.`;
    if (kind === "bundle") return `${scope}: ${value} when ${target} is bought together with its partner line.`;
    return `${scope}: ${value} — shown as a banner once the basket qualifies.`;
  })();

  return (
    <div>
      <PageHead
        title="Deals &amp; promotions"
        sub={`${live} live · repricing is automatic and only ever downward`}
      >
        <GhostBtn
          onClick={() =>
            writeSheet(
              "gather-promotions.xlsx",
              s.promotions.map((p) => ({
                Name: p.name, Mechanic: p.mechanic, Value: p.value, Item: p.itemLabel,
                Communities: p.communityIds.join(","), From: p.startsAt, To: p.endsAt,
                Live: p.live ? "yes" : "no", Uptake: p.uptakeNote,
              }))
            ).then((f) => flash(`${f} downloaded`))
          }
        >
          Export .xlsx
        </GhostBtn>
        <GhostBtn tone={C.purple} onClick={() => openImport("promos")}>
          Import
        </GhostBtn>
      </PageHead>

      <Split
        style={{ marginTop: 22 }}
        rightWidth={388}
        left={
          <div style={{ minWidth: 0 }}>
            <TableHead
              template={TPL}
              cols={[
                "Promotion", "Mechanic",
                <div style={{ textAlign: "right" }}>Value</div>,
                "Runs", "Uptake", "",
              ]}
            />
            {s.promotions.map((p) => (
              <Row
                key={p.id}
                template={TPL}
                gap={12}
                style={{ padding: "15px 12px", background: "#fff", boxShadow: `inset 2px 0 0 ${p.live ? C.purple : "transparent"}` }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.35 }}>{p.name}</div>
                  <div style={{ fontSize: 11.5, color: C.faint, marginTop: 3 }}>
                    {p.communityIds.map((id) => s.communityById(id).short ?? s.communityById(id).name).join(", ") || "—"}
                  </div>
                </div>
                <div style={{ fontSize: 12, color: C.ink2 }}>
                  {KINDS.find((k) => k.k === p.mechanic)?.label ?? p.mechanic}
                </div>
                <div style={{ ...R({ textAlign: "right" }), fontFamily: F.mono, fontSize: 12.5 }}>{p.value}</div>
                <div style={{ fontSize: 11.5, color: C.muted }}>
                  {dateLabel(p.startsAt)} – {dateLabel(p.endsAt)}
                </div>
                <div>
                  <div style={{ fontFamily: F.mono, fontSize: 12 }}>{p.uptakeNote}</div>
                  <div style={{ fontSize: 11, fontWeight: 700, marginTop: 3, color: p.live ? C.green : C.faint2 }}>
                    {p.live ? "Live" : "Paused"}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => togglePromo(p.id, !p.live)}
                  style={{
                    padding: "8px 6px", borderRadius: 8, cursor: "pointer",
                    fontFamily: F.body, fontSize: 11.5, fontWeight: 700, whiteSpace: "nowrap",
                    border: `1px solid ${p.live ? C.input : C.ink}`,
                    background: p.live ? "#fff" : C.ink,
                    color: p.live ? C.ink : "#fff",
                  }}
                >
                  {p.live ? "Pause" : "Go live"}
                </button>
              </Row>
            ))}
          </div>
        }
        right={
          <Panel>
            <Eyebrow>Build a promotion</Eyebrow>
            <div style={{ fontSize: 11.5, color: C.muted, lineHeight: 1.5, marginTop: 6 }}>
              Goes live on the resident sheet the moment you publish. Anything already ordered is
              repriced down, never up.
            </div>

            <div style={{ marginTop: 16 }}>
              <Field label="Name" value={name} onChange={setName} placeholder="e.g. Rice week" />
            </div>

            <FieldLabel>Mechanic</FieldLabel>
            <div style={{ display: "flex", flexDirection: "column", marginTop: 7 }}>
              {KINDS.map((k) => {
                const on = kind === k.k;
                return (
                  <button
                    key={k.k}
                    type="button"
                    onClick={() => setKind(k.k)}
                    style={{
                      display: "flex", alignItems: "flex-start", gap: 10, textAlign: "left",
                      width: "100%", padding: "11px 0", border: 0,
                      borderBottom: `1px solid ${C.lineSoft}`, background: "transparent",
                      cursor: "pointer", fontFamily: F.body,
                    }}
                  >
                    <div
                      style={{
                        width: 13, height: 13, borderRadius: "50%", flex: "none", marginTop: 2,
                        border: `1.5px solid ${on ? C.purple : C.check}`,
                        background: on ? C.purple : "#fff",
                      }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 700, color: on ? C.ink : C.muted }}>{k.label}</div>
                      <div style={{ fontSize: 11.5, color: C.muted, marginTop: 2, lineHeight: 1.45 }}>{k.note}</div>
                    </div>
                  </button>
                );
              })}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 14 }}>
              <Field label={kindDef.valueLabel} value={value} onChange={setValue} mono />
              <div>
                <FieldLabel>Item</FieldLabel>
                <select
                  value={productId}
                  onChange={(e) => setProductId(e.target.value)}
                  style={{
                    width: "100%", marginTop: 5, padding: "10px", borderRadius: 9,
                    border: `1px solid ${C.input}`, background: "#fff",
                    fontFamily: F.body, fontSize: 12, fontWeight: 600, color: C.ink,
                  }}
                >
                  <option value="">Any item / whole basket</option>
                  {s.products.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <Field label="Starts" value={from} onChange={setFrom} type="date" />
              <Field label="Ends" value={to} onChange={setTo} type="date" />
            </div>

            <FieldLabel>Communities</FieldLabel>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
              {s.communities.map((c) => (
                <Chip
                  key={c.id}
                  label={c.short ?? c.name}
                  on={where.includes(c.id)}
                  onToggle={() => toggleWhere(c.id)}
                />
              ))}
            </div>

            <div
              style={{
                fontSize: 11.5, color: C.muted, lineHeight: 1.5, marginTop: 14,
                paddingTop: 14, borderTop: `1px solid ${C.line}`,
              }}
            >
              {preview}
            </div>

            <DarkBtn onClick={create} style={{ marginTop: 14, width: "100%" }}>
              Publish promotion
            </DarkBtn>
          </Panel>
        }
      />
    </div>
  );
}
