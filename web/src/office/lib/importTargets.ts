import type { SheetRow } from "./sheet";

/** The seven import targets, with the copy and template columns from the design's `T` object. */
export type ImportTargetKey =
  | "catalog"
  | "roster"
  | "picked"
  | "collect"
  | "payments"
  | "cycles"
  | "promos";

export interface ImportTarget {
  title: string;
  blurb: string;
  tpl: SheetRow[];
  apply: string;
}

export const IMPORT_TARGETS: Record<ImportTargetKey, ImportTarget> = {
  catalog: {
    title: "Import SKUs, specs & tier prices",
    blurb:
      "Matched on SKU — existing lines are updated, unknown SKUs are created as drafts. Recognised columns: SKU, Item, Brand, Barcode, Category, Pack, Size, Weight, Details, ImageURL, Cost, Retail, Base, Tier20, Tier50, Tier100, Communities. Category must be one of Grocery, Grocery Non-Food, Hardline, Softline, Homeline, Pharmacy, Fresh & Frozen. Photos can also be dropped per item in the editor.",
    tpl: [
      {
        SKU: "GR-3010", Item: "Paw San Rice, 10kg sack", Brand: "Shwe Bo Paw San",
        Barcode: "8851003010", Category: "Grocery", Pack: "10kg sack", Size: "10 kg",
        Weight: "10.2 kg", Details: "New crop, double-polished", ImageURL: "",
        Cost: 31000, Retail: 48000, Base: 44000, Tier20: 41000, Tier50: 38000,
        Tier100: 35000, Communities: "G1,G2,G3,G4",
      },
    ],
    apply: "Apply to catalog",
  },
  roster: {
    title: "Import household roster",
    blurb:
      "Recognised columns: Unit, Household, Phone. Existing units are updated, new ones are added without accounts.",
    tpl: [{ Unit: "A #01-01", Household: "Name", Phone: "09 000 000 000" }],
    apply: "Add to roster",
  },
  picked: {
    title: "Import picked counts",
    blurb:
      "Recognised columns: SKU, Picked. Warehouse staff can fill this on the DC laptop and drop it back here.",
    tpl: [{ SKU: "PN-3010", Picked: 0 }],
    apply: "Update pick sheet",
  },
  collect: {
    title: "Import ticked collection sheet",
    blurb:
      "Recognised columns: Order, Collected (yes/no). Use when the guard ticks the printed sheet.",
    tpl: [{ Order: "G1-2481", Collected: "yes" }],
    apply: "Mark collected",
  },
  payments: {
    title: "Import bank / CTZPay file",
    blurb: "Recognised columns: Order, Amount, Method. Matched orders are marked paid.",
    tpl: [{ Order: "G1-2476", Amount: 61500, Method: "MMQR" }],
    apply: "Reconcile payments",
  },
  cycles: {
    title: "Import cycle calendar",
    blurb: "Recognised columns: Community, Cutoff, Delivery, Point.",
    tpl: [
      {
        Community: "Gems 1 Condo", Cutoff: "2026-08-23", Delivery: "2026-08-25",
        Point: "Tower 1 guardhouse",
      },
    ],
    apply: "Update calendar",
  },
  promos: {
    title: "Import promotions",
    blurb: "Recognised columns: Name, Mechanic, Value, Item, Communities, From, To.",
    tpl: [
      {
        Name: "Rice week", Mechanic: "tier", Value: "Unlock 50+ at 20",
        Item: "Paw San Rice, 10kg sack", Communities: "G1,G2", From: "19 Aug", To: "25 Aug",
      },
    ],
    apply: "Add promotions",
  },
};
