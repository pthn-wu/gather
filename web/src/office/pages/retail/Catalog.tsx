import { useRef, useState } from "react";
import { api } from "../../api/client";
import type { Product } from "../../api/types";
import { useImport } from "../../components/ImportModal";
import {
  Chip, DarkBtn, Eyebrow, FieldLabel, GhostBtn, LinkBtn, PageHead, R, Row,
  SearchInput, Tabs, inputStyle,
} from "../../components/ui";
import { useStore } from "../../context/store";
import { useToast } from "../../context/ToastContext";
import { livePrice, tierLabel } from "../../lib/derive";
import { marginPct, money, num } from "../../lib/format";
import { writeSheet } from "../../lib/sheet";
import { C, CATS, F, SLOT } from "../../theme";

const TPL = "34px 72px minmax(140px,1fr) 72px 72px 72px 72px 72px 68px";

const blank = (over: Partial<Product>): Product => ({
  id: String(Date.now()),
  sku: "NEW-" + String(Date.now()).slice(-4),
  name: "Untitled line", brand: "", barcode: "", unit: "1 pack", size: "", grossWeight: "",
  category: "Grocery", details: "", imageUrl: null, cost: 1000, retailPrice: 2000,
  prices: [1900, 1800, 1700, 1600], unitsThisCycle: 0, active: false, communityIds: ["G1"],
  ...over,
});

export default function Catalog() {
  const s = useStore();
  const flash = useToast();
  const openImport = useImport();
  const imgRef = useRef<HTMLInputElement>(null);

  const [q, setQ] = useState("");
  const [cat, setCat] = useState("All");
  const [selId, setSelId] = useState<string | null>(null);

  const products = s.products;
  const filtered = products.filter(
    (p) =>
      (cat === "All" || p.category === cat) &&
      (!q.trim() ||
        `${p.name} ${p.sku} ${p.category} ${p.brand} ${p.barcode}`
          .toLowerCase()
          .includes(q.trim().toLowerCase()))
  );

  const ed = products.find((p) => p.id === selId) ?? products[0];

  /** Local edit — the editor is a draft until "Publish to sheet". */
  const patch = (id: string, next: Partial<Product>) =>
    s.setProducts((list) => list.map((p) => (p.id === id ? { ...p, ...next } : p)));

  /** Structural change that should reach the API straight away. */
  const patchAndSave = (id: string, next: Partial<Product>) => {
    patch(id, next);
    void s.push(() => api.retail.updateProduct(id, next));
  };

  const attachImage = (file: File) => {
    const r = new FileReader();
    r.onload = () => {
      patch(ed.id, { imageUrl: String(r.result) });
      flash("Photo attached to " + ed.sku);
    };
    r.readAsDataURL(file);
  };

  const edMargin = (price: number) => marginPct(price, ed?.cost ?? 0);
  const edTier = ed ? livePrice(ed).tierIdx : 0;
  const warnLow = ed ? ed.prices.some((p) => edMargin(p) < 12) : false;
  const warnLadder = ed ? ed.prices[3] >= ed.prices[0] : false;

  const exportRows = products.map((p) => ({
    SKU: p.sku, Item: p.name, Brand: p.brand, Barcode: p.barcode, Category: p.category,
    Pack: p.unit, Size: p.size, Weight: p.grossWeight, Details: p.details,
    ImageURL: p.imageUrl?.startsWith("data:") ? "[uploaded]" : p.imageUrl ?? "",
    Cost: p.cost ?? "", Retail: p.retailPrice,
    Base: p.prices[0], Tier20: p.prices[1], Tier50: p.prices[2], Tier100: p.prices[3],
    MarginPct: livePrice(p).margin, UnitsThisCycle: p.unitsThisCycle,
    Status: p.active ? "live" : "delisted", Communities: p.communityIds.join(","),
  }));

  return (
    <div>
      <PageHead
        title="Catalog & tier pricing"
        sub={`${products.length} lines · ${products.filter((p) => p.active).length} on the sheet · tiers at 20 / 50 / 100 units`}
      >
        <SearchInput value={q} onChange={setQ} placeholder="Search item or SKU" width={240} />
        <GhostBtn tone={C.purple} onClick={() => openImport("catalog")}>
          Import .xlsx
        </GhostBtn>
        <GhostBtn onClick={async () => flash(await writeSheet("gather-catalog.xlsx", exportRows))}>
          Export .xlsx
        </GhostBtn>
        <DarkBtn
          onClick={() => {
            const draft = blank({ category: cat === "All" ? "Grocery" : cat });
            s.setProducts((list) => [...list, draft]);
            setSelId(draft.id);
            setQ("");
            void s.push(() => api.retail.createProduct(draft));
            flash("Draft line created — add SKU, spec and tiers");
          }}
        >
          New item
        </DarkBtn>
      </PageHead>

      <Tabs
        active={cat}
        onPick={setCat}
        tabs={["All", ...CATS].map((c) => ({
          k: c,
          label: c,
          count: c === "All" ? products.length : products.filter((p) => p.category === c).length,
        }))}
      />

      <div
        style={{
          display: "grid", gridTemplateColumns: "minmax(760px,1fr) 388px", gap: 24,
          alignItems: "start", marginTop: 20,
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              display: "grid", gridTemplateColumns: TPL, gap: 8, padding: "0 12px 11px",
              borderBottom: `1.5px solid ${C.ink}`, fontSize: 10.5, fontWeight: 800,
              letterSpacing: ".05em", textTransform: "uppercase", color: C.faint,
            }}
          >
            <div />
            <div>SKU</div>
            <div>Item</div>
            <div style={{ textAlign: "right" }}>Cost</div>
            <div style={{ textAlign: "right" }}>Base</div>
            <div style={{ textAlign: "right" }}>20+</div>
            <div style={{ textAlign: "right" }}>50+</div>
            <div style={{ textAlign: "right" }}>100+</div>
            <div style={{ textAlign: "right" }}>Margin</div>
          </div>

          {filtered.map((p) => {
            const lp = livePrice(p);
            const on = ed && p.id === ed.id;
            return (
              <Row
                key={p.id}
                template={TPL}
                gap={8}
                onClick={() => setSelId(p.id)}
                style={{
                  background: on ? C.rowHover : "#fff",
                  boxShadow: `inset 2px 0 0 ${on ? C.purple : "transparent"}`,
                }}
              >
                <div
                  style={{
                    width: 34, height: 34, borderRadius: 7, border: `1px solid ${C.line}`,
                    background: p.imageUrl ? `url(${p.imageUrl}) center/cover no-repeat` : SLOT,
                  }}
                />
                <div style={{ fontFamily: F.mono, fontSize: 11.5, color: C.muted }}>{p.sku}</div>
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 13, fontWeight: 700, lineHeight: 1.35, whiteSpace: "nowrap",
                      overflow: "hidden", textOverflow: "ellipsis",
                    }}
                  >
                    {p.name}
                  </div>
                  <div
                    style={{
                      fontSize: 11, color: C.faint, marginTop: 3, whiteSpace: "nowrap",
                      overflow: "hidden", textOverflow: "ellipsis",
                    }}
                  >
                    {[p.brand, p.size, p.grossWeight].filter(Boolean).join(" · ") || "no spec yet"} ·{" "}
                    {p.active ? "live" : "delisted"} · {p.unitsThisCycle} u
                  </div>
                </div>
                <div style={R({ fontSize: 12, color: C.muted })}>{money(p.cost ?? 0)}</div>
                <div style={R({ fontSize: 12 })}>{money(p.prices[0])}</div>
                <div style={R({ fontSize: 12 })}>{money(p.prices[1])}</div>
                <div style={R({ fontSize: 12 })}>{money(p.prices[2])}</div>
                <div style={R({ fontSize: 12 })}>{money(p.prices[3])}</div>
                <div style={R({ fontSize: 12, color: lp.margin < 15 ? C.red : C.green })}>
                  {lp.margin}%
                </div>
              </Row>
            );
          })}

          {!filtered.length ? (
            <div style={{ padding: "56px 12px" }}>
              <div style={{ fontSize: 15, fontWeight: 800 }}>Nothing matches</div>
              <LinkBtn
                style={{ marginTop: 10, fontSize: 13 }}
                onClick={() => {
                  setQ("");
                  setCat("All");
                }}
              >
                Clear search and category
              </LinkBtn>
            </div>
          ) : null}
        </div>

        {ed ? (
          <div
            style={{
              position: "sticky", top: 88, background: "#fff", border: `1px solid ${C.border}`,
              borderRadius: 10, padding: 22,
            }}
          >
            <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
              <input
                value={ed.sku}
                onChange={(e) => patch(ed.id, { sku: e.target.value })}
                style={{
                  width: 110, padding: "6px 8px", border: `1px solid ${C.line}`, borderRadius: 7,
                  fontFamily: F.mono, fontSize: 12, color: C.muted,
                }}
              />
              <div style={{ flex: 1 }} />
              <div
                style={{ fontSize: 11.5, fontWeight: 700, color: ed.active ? C.green : C.red }}
              >
                {ed.active ? "Live on the sheet" : "Delisted"}
              </div>
            </div>

            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const f = e.dataTransfer?.files?.[0];
                if (f) attachImage(f);
              }}
              style={{
                display: "flex", gap: 14, alignItems: "center", marginTop: 14, padding: 12,
                border: "1.5px dashed #E0D7CD", borderRadius: 10,
              }}
            >
              <div
                style={{
                  width: 78, height: 78, flex: "none", borderRadius: 8,
                  border: `1px solid ${C.line}`,
                  background: ed.imageUrl ? `url(${ed.imageUrl}) center/cover no-repeat` : SLOT,
                }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11.5, color: C.muted, lineHeight: 1.45 }}>
                  {ed.imageUrl
                    ? "Shown on the resident sheet and the product page."
                    : "Residents see a striped placeholder until you upload one. 1:1 or 4:3, at least 800px."}
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 9 }}>
                  <GhostBtn
                    tone={C.purple}
                    onClick={() => imgRef.current?.click()}
                    style={{ padding: "8px 12px", fontSize: 11.5, borderRadius: 8 }}
                  >
                    {ed.imageUrl ? "Replace photo" : "Upload photo"}
                  </GhostBtn>
                  {ed.imageUrl ? (
                    <GhostBtn
                      tone={C.red}
                      onClick={() => patch(ed.id, { imageUrl: null })}
                      style={{ padding: "8px 12px", fontSize: 11.5, borderRadius: 8 }}
                    >
                      Remove
                    </GhostBtn>
                  ) : null}
                </div>
              </div>
            </div>
            <input
              ref={imgRef} type="file" accept="image/*" style={{ display: "none" }}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) attachImage(f);
                e.target.value = "";
              }}
            />

            <input
              value={ed.name}
              onChange={(e) => patch(ed.id, { name: e.target.value })}
              style={{
                ...inputStyle, marginTop: 12, padding: "11px 12px", fontSize: 14, fontWeight: 700,
              }}
            />

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
              <Ed label="Brand / supplier" value={ed.brand} onChange={(v) => patch(ed.id, { brand: v })} />
              <Ed label="Barcode" value={ed.barcode} mono onChange={(v) => patch(ed.id, { barcode: v })} />
              <Ed label="Size / net content" value={ed.size} placeholder="10 kg" onChange={(v) => patch(ed.id, { size: v })} />
              <Ed label="Gross weight" value={ed.grossWeight} placeholder="10.2 kg" onChange={(v) => patch(ed.id, { grossWeight: v })} />
              <Ed label="Pack / unit" value={ed.unit} onChange={(v) => patch(ed.id, { unit: v })} />
              <div>
                <FieldLabel>Category</FieldLabel>
                <select
                  value={ed.category}
                  onChange={(e) => patch(ed.id, { category: e.target.value })}
                  style={{ ...inputStyle, marginTop: 5, padding: "10px" }}
                >
                  {CATS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <Ed label="Landed cost" value={String(ed.cost ?? 0)} mono onChange={(v) => patch(ed.id, { cost: num(v) })} />
              <Ed label="Shelf retail" value={String(ed.retailPrice)} mono onChange={(v) => patch(ed.id, { retailPrice: num(v) })} />
            </div>

            <div style={{ marginTop: 12 }}>
              <FieldLabel>Item details shown to residents</FieldLabel>
              <textarea
                rows={3}
                value={ed.details}
                onChange={(e) => patch(ed.id, { details: e.target.value })}
                placeholder="Storage, origin, warranty, anything the household should know before ordering."
                style={{ ...inputStyle, marginTop: 5, fontWeight: 400, lineHeight: 1.5, resize: "vertical" }}
              />
            </div>

            <div style={{ marginTop: 16, paddingTop: 16, borderTop: `1px solid ${C.line}` }}>
              <Eyebrow style={{ color: C.faint }}>Volume tiers</Eyebrow>
              <div style={{ fontSize: 11.5, color: C.muted, lineHeight: 1.5, marginTop: 6 }}>
                Price applies to every household once the block passes the unit count. Residents see
                the drop live.
              </div>
              <div style={{ display: "flex", flexDirection: "column", marginTop: 12 }}>
                {["Any quantity", "20+ units", "50+ units", "100+ units"].map((label, i) => {
                  const price = ed.prices[i];
                  const m = edMargin(price);
                  const reached = edTier >= i;
                  return (
                    <div
                      key={label}
                      style={{
                        display: "grid", gridTemplateColumns: "96px 1fr 62px 60px", gap: 10,
                        alignItems: "center", padding: "9px 0", borderBottom: `1px solid ${C.lineSoft}`,
                      }}
                    >
                      <div style={{ fontSize: 12, fontWeight: 700, color: reached ? C.ink : C.muted }}>
                        {label}
                      </div>
                      <input
                        value={String(price)}
                        onChange={(e) => {
                          const next = [...ed.prices] as Product["prices"];
                          next[i] = num(e.target.value);
                          patch(ed.id, { prices: next });
                        }}
                        style={{
                          width: "100%", padding: "9px 11px",
                          border: `1px solid ${m < 12 ? C.redSoft : C.input}`, borderRadius: 8,
                          fontFamily: F.mono, fontSize: 12.5, color: C.ink, textAlign: "right",
                        }}
                      />
                      <div
                        style={{
                          fontFamily: F.mono, fontSize: 11.5, textAlign: "right",
                          color: m < 12 ? C.red : m < 18 ? C.amber : C.green,
                        }}
                      >
                        {m}%
                      </div>
                      <div style={{ fontSize: 11, color: C.faint2, textAlign: "right" }}>
                        {reached ? "reached" : ""}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div
                style={{
                  fontSize: 11.5, fontWeight: 700, marginTop: 11, lineHeight: 1.45,
                  color: warnLow || warnLadder ? C.red : C.muted,
                }}
              >
                {warnLow
                  ? "Deepest tier is under 12% margin — check the landed cost before publishing."
                  : warnLadder
                    ? "Tiers should get cheaper as units grow. Residents see this ladder live."
                    : `Ladder looks healthy. ${ed.unitsThisCycle} units ordered this cycle at the ${tierLabel(edTier)} tier.`}
              </div>
            </div>

            <div style={{ marginTop: 18, paddingTop: 16, borderTop: `1px solid ${C.line}` }}>
              <Eyebrow style={{ color: C.faint }}>Listed at</Eyebrow>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 11 }}>
                {s.communities.map((c) => {
                  const on = ed.communityIds.includes(c.id);
                  return (
                    <Chip
                      key={c.id}
                      label={c.short ?? c.name}
                      on={on}
                      onToggle={() =>
                        patch(ed.id, {
                          communityIds: on
                            ? ed.communityIds.filter((x) => x !== c.id)
                            : [...ed.communityIds, c.id],
                        })
                      }
                    />
                  );
                })}
              </div>
            </div>

            <div style={{ display: "flex", gap: 9, marginTop: 20 }}>
              <DarkBtn
                style={{ flex: 1, padding: 12, fontSize: 12.5 }}
                onClick={() => {
                  void s.push(() => api.retail.updateProduct(ed.id, { ...ed, communityIds: ed.communityIds }));
                  flash(`${ed.name} published to ${ed.communityIds.length} communities`);
                }}
              >
                Publish to sheet
              </DarkBtn>
              <GhostBtn
                tone={ed.active ? C.red : C.green}
                style={{ padding: "12px 14px", fontSize: 12.5 }}
                onClick={() => {
                  patch(ed.id, { active: !ed.active });
                  flash(ed.active ? `${ed.name} delisted` : `${ed.name} back on the sheet`);
                }}
              >
                {ed.active ? "Delist" : "Relist"}
              </GhostBtn>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function Ed({
  label, value, onChange, mono, placeholder,
}: {
  label: string; value: string; onChange: (v: string) => void; mono?: boolean; placeholder?: string;
}) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <input
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        style={{
          ...inputStyle, marginTop: 5,
          ...(mono ? { fontFamily: F.mono, fontSize: 12, fontWeight: 400 } : {}),
        }}
      />
    </div>
  );
}
