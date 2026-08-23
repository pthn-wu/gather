import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { api } from "../api/client";
import type { Product, Promotion } from "../api/types";
import { useStore } from "../context/store";
import { useToast } from "../context/ToastContext";
import { IMPORT_TARGETS } from "../lib/importTargets";
import type { ImportTargetKey } from "../lib/importTargets";
import { cell, readSheet, str, writeSheet } from "../lib/sheet";
import type { ParsedSheet, SheetRow } from "../lib/sheet";
import { num } from "../lib/format";
import { C, CATS, F } from "../theme";
import { DarkBtn, Eyebrow, GhostBtn, LinkBtn } from "./ui";

const ImportContext = createContext<(t: ImportTargetKey) => void>(() => {});
export const useImport = () => useContext(ImportContext);

export function ImportProvider({ children }: { children: ReactNode }) {
  const [target, setTarget] = useState<ImportTargetKey | null>(null);
  const open = useCallback((t: ImportTargetKey) => setTarget(t), []);
  const value = useMemo(() => open, [open]);
  return (
    <ImportContext.Provider value={value}>
      {children}
      {target ? <ImportModal target={target} onClose={() => setTarget(null)} /> : null}
    </ImportContext.Provider>
  );
}

function ImportModal({ target, onClose }: { target: ImportTargetKey; onClose: () => void }) {
  const t = IMPORT_TARGETS[target];
  const flash = useToast();
  const store = useStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const [parsed, setParsed] = useState<ParsedSheet | null>(null);
  const [dragging, setDragging] = useState(false);

  const read = async (file: File) => {
    try {
      setParsed(await readSheet(file));
    } catch {
      flash("Could not read that file — is it a real .xlsx or .csv?");
    }
  };

  const applyImport = async () => {
    if (!parsed || !parsed.rows.length) return;
    const rows = parsed.rows;
    flash(await applyTo(target, rows, parsed.file, store));
    onClose();
  };

  const cols = parsed ? parsed.cols.slice(0, 7) : [];

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 30, background: "rgba(30,25,38,.42)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: 40,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 820, maxHeight: "88vh", overflow: "auto", background: C.bg,
          border: `1px solid ${C.input2}`, borderRadius: 12, padding: 28,
        }}
      >
        <div style={{ display: "flex", alignItems: "baseline", gap: 14 }}>
          <div style={{ fontFamily: F.head, fontSize: 21, fontWeight: 600, letterSpacing: "-.02em" }}>
            {t.title}
          </div>
          <div style={{ flex: 1 }} />
          <LinkBtn
            onClick={async () => flash(await writeSheet(`gather-${target}-template.xlsx`, t.tpl))}
          >
            Download blank template
          </LinkBtn>
          <LinkBtn tone={C.muted} onClick={onClose}>
            Close
          </LinkBtn>
        </div>
        <div style={{ fontSize: 12.5, color: C.muted, lineHeight: 1.6, marginTop: 8 }}>
          {t.blurb}
        </div>

        <div
          onClick={() => fileRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            const f = e.dataTransfer?.files?.[0];
            if (f) void read(f);
          }}
          style={{
            marginTop: 18, padding: 34,
            border: `1.5px dashed ${parsed || dragging ? C.purple : C.check}`,
            borderRadius: 11, background: parsed || dragging ? C.purpleWash : "#fff",
            textAlign: "center", cursor: "pointer",
          }}
        >
          <div style={{ fontSize: 14, fontWeight: 700 }}>
            {parsed ? `${parsed.file} · sheet “${parsed.sheet}”` : "Drop a spreadsheet here, or click to browse"}
          </div>
          <div style={{ fontSize: 12.5, color: C.muted, marginTop: 6 }}>
            .xlsx, .xls or .csv — the first sheet is read, header row included
          </div>
        </div>
        <input
          ref={fileRef} type="file" accept=".xlsx,.xls,.csv" style={{ display: "none" }}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void read(f);
            e.target.value = "";
          }}
        />

        {parsed && parsed.rows.length ? (
          <div style={{ marginTop: 20 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
              <Eyebrow>Preview</Eyebrow>
              <div style={{ fontSize: 12, color: C.muted }}>
                {parsed.rows.length} rows · {parsed.cols.length} columns detected
              </div>
            </div>
            <div
              style={{
                marginTop: 12, overflowX: "auto", background: "#fff",
                border: `1px solid ${C.border}`, borderRadius: 10,
              }}
            >
              <div style={{ display: "flex", padding: "10px 14px", borderBottom: `1px solid ${C.line}` }}>
                {cols.map((c) => (
                  <div
                    key={c}
                    style={{
                      minWidth: 120, flex: 1, fontSize: 10.5, fontWeight: 800,
                      letterSpacing: ".05em", textTransform: "uppercase", color: C.faint,
                    }}
                  >
                    {String(c)}
                  </div>
                ))}
              </div>
              {parsed.rows.slice(0, 6).map((r, i) => (
                <div
                  key={i}
                  style={{ display: "flex", padding: "10px 14px", borderBottom: `1px solid ${C.lineSoft}` }}
                >
                  {cols.map((c) => (
                    <div
                      key={c}
                      style={{
                        minWidth: 120, flex: 1, fontFamily: F.mono, fontSize: 11.5,
                        color: C.ink2, whiteSpace: "nowrap", overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {String(r[c] === "" ? "—" : r[c])}
                    </div>
                  ))}
                </div>
              ))}
            </div>
            <div
              style={{
                fontSize: 12.5, color: parsed.cols.length ? C.muted : C.red,
                fontWeight: 700, marginTop: 12, lineHeight: 1.5,
              }}
            >
              {parsed.cols.length
                ? "Columns are matched by name, case and spacing ignored. Anything unrecognised is left alone."
                : "No header row found — the first row of the sheet must name the columns."}
            </div>
            <div style={{ display: "flex", gap: 9, marginTop: 16 }}>
              <DarkBtn onClick={applyImport} style={{ padding: "12px 18px", fontSize: 12.5 }}>
                {t.apply}
              </DarkBtn>
              <GhostBtn
                tone={C.muted}
                onClick={() => setParsed(null)}
                style={{ padding: "12px 16px", fontSize: 12.5 }}
              >
                Pick another file
              </GhostBtn>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------------ */
/* Merge rules, matching the design's `applyImport`. Each target also POSTs   */
/* the parsed rows to its CONTRACT.md §3 bulk endpoint.                       */
/* ------------------------------------------------------------------------ */

type Store = ReturnType<typeof useStore>;

const blankProduct = (over: Partial<Product>): Product => ({
  id: String(Date.now() + Math.random()),
  sku: "NEW-" + String(Date.now()).slice(-4),
  name: "Untitled line", brand: "", barcode: "", unit: "1 pack", size: "",
  grossWeight: "", category: "Grocery", details: "", imageUrl: null,
  cost: 1000, retailPrice: 2000, prices: [1900, 1800, 1700, 1600],
  unitsThisCycle: 0, active: false, communityIds: ["G1"],
  ...over,
});

async function applyTo(
  target: ImportTargetKey,
  rows: SheetRow[],
  fileName: string,
  s: Store
): Promise<string> {
  switch (target) {
    case "catalog": {
      void s.push(() => api.retail.bulkProducts(rows as Record<string, unknown>[]));
      const rowSku = (r: SheetRow) => String(cell(r, ["sku", "skucode", "itemcode"]) ?? "").trim();
      const merge = (p: Product, r: SheetRow): Product => {
        const prices = [...p.prices] as [number, number, number, number];
        const b = cell(r, ["base", "baseprice", "groupprice"]);
        const t20 = cell(r, ["tier20", "t20", "20units"]);
        const t50 = cell(r, ["tier50", "t50", "50units"]);
        const t100 = cell(r, ["tier100", "t100", "100units"]);
        if (b !== undefined) prices[0] = num(b);
        if (t20 !== undefined) prices[1] = num(t20);
        if (t50 !== undefined) prices[2] = num(t50);
        if (t100 !== undefined) prices[3] = num(t100);
        const cost = cell(r, ["cost", "landedcost", "unitcost"]);
        const retail = cell(r, ["retail", "shelfretail", "rrp"]);
        const catRaw = str(r, ["category", "cat", "department"], p.category);
        const category =
          CATS.find((x) => x.toLowerCase() === catRaw.toLowerCase()) ??
          CATS.find((x) => catRaw.toLowerCase().startsWith(x.toLowerCase().split(" ")[0])) ??
          p.category;
        const comms = str(r, ["communities", "towers", "where"], "");
        const img = str(r, ["imageurl", "image", "photo", "photourl"], p.imageUrl ?? "");
        return {
          ...p,
          prices,
          name: str(r, ["item", "name", "itemname", "description"], p.name),
          brand: str(r, ["brand", "supplier"], p.brand),
          barcode: str(r, ["barcode", "ean", "upc"], p.barcode),
          unit: str(r, ["pack", "packsize", "unit", "uom"], p.unit),
          size: str(r, ["size", "volume", "netcontent"], p.size),
          grossWeight: str(r, ["weight", "grossweight", "kg"], p.grossWeight),
          details: str(r, ["details", "itemdetails", "notes", "longdescription"], p.details),
          imageUrl: img.startsWith("http") ? img : p.imageUrl,
          category,
          cost: cost !== undefined ? num(cost) : p.cost,
          retailPrice: retail !== undefined ? num(retail) : p.retailPrice,
          communityIds: comms
            ? comms.split(/[,;]/).map((x) => x.trim()).filter(Boolean)
            : p.communityIds,
        };
      };
      let updated = 0;
      let created = 0;
      const next = s.products.map((p) => {
        const r = rows.find(
          (x) =>
            rowSku(x).toLowerCase() === p.sku.toLowerCase() ||
            String(cell(x, ["item", "name"]) ?? "").trim().toLowerCase() === p.name.toLowerCase()
        );
        if (!r) return p;
        updated++;
        return merge(p, r);
      });
      const fresh: Product[] = [];
      rows.forEach((r) => {
        const sku = rowSku(r);
        if (!sku) return;
        if (next.some((p) => p.sku.toLowerCase() === sku.toLowerCase())) return;
        created++;
        fresh.push(merge(blankProduct({ sku }), r));
      });
      s.setProducts([...next, ...fresh]);
      return `${updated} existing SKUs updated, ${created} new SKUs created as drafts`;
    }

    case "roster": {
      void s.push(() => api.office.bulkRoster(rows as Record<string, unknown>[]));
      const add: Store["households"] = [];
      let already = 0;
      rows.forEach((r, k) => {
        const unit = String(cell(r, ["unit"]) ?? "").trim();
        if (!unit) return;
        if (s.households.some((h) => h.unit.toLowerCase() === unit.toLowerCase())) {
          already++;
          return;
        }
        add.push({
          id: "imp-" + k,
          unit,
          displayName: String(cell(r, ["household", "name", "resident"]) ?? "Unnamed household"),
          phone: String(cell(r, ["phone", "mobile"]) ?? "—"),
          accountState: "none",
          tempPassword: null,
          ordersCount: 0,
          note: "Imported " + fileName,
        });
      });
      s.setHouseholds([...s.households, ...add]);
      return `${add.length} households added, ${already} already on the roster`;
    }

    case "picked": {
      const next = { ...s.pickedQty };
      const lines: { productId: string; pickedQty: number }[] = [];
      let n = 0;
      rows.forEach((r) => {
        const sku = String(cell(r, ["sku"]) ?? "").trim();
        const p = s.products.find((x) => x.sku.toLowerCase() === sku.toLowerCase());
        const picked = cell(r, ["picked", "count", "qty"]);
        if (p && picked !== undefined) {
          next[`${s.fulComm}-${p.id}`] = String(num(picked));
          lines.push({ productId: p.id, pickedQty: num(picked) });
          n++;
        }
      });
      s.setPickedQty(next);
      void s.push(() => api.retail.updatePickLines(s.fulComm, lines));
      return `${n} pick lines updated`;
    }

    case "collect": {
      const ticked = [...s.ticked];
      const ids: string[] = [];
      let n = 0;
      rows.forEach((r) => {
        const code = String(cell(r, ["order", "code"]) ?? "").trim().toUpperCase();
        const yes = String(cell(r, ["collected", "tick", "done"]) ?? "").trim().toLowerCase();
        const o = s.orders.find((x) => x.code.toUpperCase() === code);
        if (o && ["yes", "y", "1", "true"].includes(yes)) {
          if (!ticked.includes(o.id)) ticked.push(o.id);
          ids.push(o.id);
          n++;
        }
      });
      s.setTicked(ticked);
      void s.push(() => api.office.tickCollection(ids, true));
      return `${n} orders ticked off from ${fileName}`;
    }

    case "payments": {
      const recon: { orderCode: string; amount: number; method: string }[] = [];
      let n = 0;
      const next = s.orders.map((o) => {
        const r = rows.find(
          (x) => String(cell(x, ["order", "code"]) ?? "").trim().toUpperCase() === o.code.toUpperCase()
        );
        if (!r) return o;
        n++;
        const method = String(cell(r, ["method"]) ?? "MMQR");
        recon.push({ orderCode: o.code, amount: num(cell(r, ["amount"]) ?? o.total), method });
        return { ...o, paid: true, paymentMethod: method };
      });
      s.setOrders(next);
      void s.push(() => api.office.bulkReconcile(recon));
      return `${n} payments reconciled`;
    }

    case "cycles": {
      void s.push(() => api.retail.bulkCycles(rows as Record<string, unknown>[]));
      let n = 0;
      const next = s.communities.map((c) => {
        const r = rows.find(
          (x) => String(cell(x, ["community", "name"]) ?? "").trim().toLowerCase() === c.name.toLowerCase()
        );
        if (!r) return c;
        n++;
        return {
          ...c,
          cutoffDate: String(cell(r, ["cutoff"]) ?? c.cutoffDate),
          deliveryDate: String(cell(r, ["delivery"]) ?? c.deliveryDate),
          collectPoint: String(cell(r, ["point", "collectionpoint"]) ?? c.collectPoint),
        };
      });
      s.setCommunities(next);
      return `${n} communities updated`;
    }

    case "promos": {
      void s.push(() => api.retail.bulkPromotions(rows as Record<string, unknown>[]));
      const add: Promotion[] = rows.map((r, k) => ({
        id: "imp-" + k,
        name: String(cell(r, ["name"]) ?? "Imported promo"),
        mechanic: (String(cell(r, ["mechanic", "kind"]) ?? "percent") as Promotion["mechanic"]),
        value: String(cell(r, ["value"]) ?? ""),
        productId: null,
        itemLabel: String(cell(r, ["item"]) ?? "Basket total"),
        communityIds: String(cell(r, ["communities", "where"]) ?? "G1")
          .split(/[,;]/)
          .map((x) => x.trim())
          .filter(Boolean),
        startsAt: String(cell(r, ["from"]) ?? "—"),
        endsAt: String(cell(r, ["to"]) ?? "—"),
        uptakeNote: "not started",
        live: false,
      }));
      s.setPromotions([...s.promotions, ...add]);
      return `${add.length} promotions imported as drafts`;
    }
  }
}
