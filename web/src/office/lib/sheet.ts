/**
 * Client-side spreadsheet IO. Exports are generated from already-fetched data;
 * imports are parsed here and the parsed rows are POSTed to the `/bulk`
 * endpoints (CONTRACT.md §3).
 *
 * SECURITY — why ExcelJS and not SheetJS:
 * The npm `xlsx` package is stuck on a version carrying two unfixed advisories
 * (prototype pollution GHSA-4r6h-8v6p-xvw6, ReDoS GHSA-5pgg-2g8v-p4x9) —
 * `npm audit` reports "no fix available", because SheetJS publishes patched
 * builds only from its own CDN. That library would be parsing operator-supplied
 * .xlsx files, which is precisely the attack path those advisories describe, so
 * it is replaced with ExcelJS (maintained, on npm, no outstanding advisories).
 *
 * Defence in depth regardless of parser:
 *  - Uploads are size-capped before parsing (MAX_IMPORT_BYTES).
 *  - Row count is capped here and again server-side (importRows, 5000 max).
 *  - Rows are rebuilt onto null-prototype objects, so a crafted header like
 *    "__proto__" cannot pollute Object.prototype on its way through.
 */
import type ExcelJSNS from "exceljs";

/**
 * Loaded on demand. The spreadsheet library is ~700 KB and only a handful of
 * screens ever import or export, so it must not sit in the initial bundle.
 */
let excelPromise: Promise<typeof ExcelJSNS> | null = null;
const loadExcel = () => {
  excelPromise ??= import("exceljs").then((m) => (m as unknown as { default: typeof ExcelJSNS }).default ?? m);
  return excelPromise;
};

export type SheetRow = Record<string, string | number | boolean | null | undefined>;

/** Matches the server's cap so a rejected import fails fast, in the browser. */
const MAX_ROWS = 5000;
const MAX_IMPORT_BYTES = 10 * 1024 * 1024; // 10 MB

/** Headers that must never become live object keys. */
const FORBIDDEN_KEYS = new Set(["__proto__", "constructor", "prototype"]);

/** Write `rows` to `filename`; the extension decides .xlsx vs .csv. */
export async function writeSheet(filename: string, rows: SheetRow[]): Promise<string> {
  if (!rows.length) return "Nothing to export in this view";

  const ExcelJS = await loadExcel();
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Gather");

  const headers = Object.keys(rows[0]);
  ws.columns = headers.map((h) => ({ header: h, key: h, width: Math.min(40, Math.max(12, h.length + 4)) }));
  for (const row of rows) ws.addRow(row);
  ws.getRow(1).font = { bold: true };

  const isCsv = filename.toLowerCase().endsWith(".csv");
  const buffer = isCsv ? await wb.csv.writeBuffer() : await wb.xlsx.writeBuffer();
  const type = isCsv
    ? "text/csv;charset=utf-8"
    : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

  const url = URL.createObjectURL(new Blob([buffer], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Give the browser a tick to start the download before revoking.
  setTimeout(() => URL.revokeObjectURL(url), 1000);

  return filename + " downloaded";
}

export interface ParsedSheet {
  file: string;
  sheet: string;
  rows: SheetRow[];
  cols: string[];
}

/** Normalise one cell to a scalar the bulk endpoints accept. */
function cellValue(v: ExcelJSNS.CellValue): string | number | boolean | null {
  if (v === null || v === undefined) return "";
  if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") return v;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === "object") {
    // Formula cells carry { formula, result }; hyperlinks carry { text }.
    const o = v as { result?: unknown; text?: unknown; richText?: { text: string }[] };
    if (o.richText) return o.richText.map((t) => t.text).join("");
    if (o.text !== undefined) return String(o.text);
    if (o.result !== undefined) return String(o.result);
  }
  return String(v);
}

/** Read the first sheet of a dropped/selected file, header row included. */
export async function readSheet(file: File): Promise<ParsedSheet> {
  if (file.size > MAX_IMPORT_BYTES) {
    throw new Error(`That file is ${(file.size / 1024 / 1024).toFixed(1)} MB — the limit is 10 MB.`);
  }

  const ExcelJS = await loadExcel();
  const wb = new ExcelJS.Workbook();
  const buf = await file.arrayBuffer();

  if (file.name.toLowerCase().endsWith(".csv")) {
    // ExcelJS's csv reader wants a stream; a Blob-backed text read is simpler
    // and avoids pulling a Node stream shim into the browser bundle.
    const text = new TextDecoder().decode(buf);
    const ws = wb.addWorksheet("Gather");
    const lines = text.split(/\r?\n/).filter((l) => l.trim().length);
    for (const line of lines) ws.addRow(splitCsvLine(line));
  } else {
    await wb.xlsx.load(buf);
  }

  const ws = wb.worksheets[0];
  if (!ws) throw new Error("That file has no sheets in it.");

  const headerRow = ws.getRow(1);
  const headers: string[] = [];
  headerRow.eachCell({ includeEmpty: true }, (cellRef, colNumber) => {
    headers[colNumber - 1] = String(cellValue(cellRef.value) ?? "").trim();
  });

  const rows: SheetRow[] = [];
  ws.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1) return;
    if (rows.length >= MAX_ROWS) return;

    // Null-prototype: a "__proto__" header cannot reach Object.prototype.
    const out = Object.create(null) as SheetRow;
    let hasValue = false;
    row.eachCell({ includeEmpty: true }, (cellRef, colNumber) => {
      const key = headers[colNumber - 1];
      if (!key || FORBIDDEN_KEYS.has(key)) return;
      const v = cellValue(cellRef.value);
      if (v !== "" && v !== null) hasValue = true;
      out[key] = v;
    });
    if (hasValue) rows.push({ ...out });
  });

  if (ws.rowCount - 1 > MAX_ROWS) {
    throw new Error(`That sheet has ${ws.rowCount - 1} rows — the limit is ${MAX_ROWS} per import.`);
  }

  return {
    file: file.name,
    sheet: ws.name,
    rows,
    cols: headers.filter((h) => h && !FORBIDDEN_KEYS.has(h)),
  };
}

/** Minimal RFC-4180 line splitter: handles quoted fields and escaped quotes. */
function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') { cur += '"'; i += 1; }
      else if (ch === '"') inQuotes = false;
      else cur += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === ",") { out.push(cur); cur = ""; }
    else cur += ch;
  }
  out.push(cur);
  return out;
}

/**
 * Column lookup that ignores case, spacing and punctuation — the design's
 * `get(row, keys)` helper. Returns undefined when nothing matches or the cell
 * is blank, so callers can fall back to the existing value.
 */
export function cell(row: SheetRow, keys: string[]): string | number | undefined {
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
  for (const k of keys) {
    const hit = Object.keys(row).find((x) => norm(x) === k);
    if (hit !== undefined && row[hit] !== "" && row[hit] !== null && row[hit] !== undefined) {
      return row[hit] as string | number;
    }
  }
  return undefined;
}

export const str = (row: SheetRow, keys: string[], fallback: string): string => {
  const v = cell(row, keys);
  return v === undefined ? fallback : String(v).trim();
};
