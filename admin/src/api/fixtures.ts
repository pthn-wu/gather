/**
 * Seed data lifted verbatim from the design prototype's `COMMS`, `ITEMS`,
 * `PROMOS`, `HH`, `VERIFS`, `ORD`, `WISH` and `ANNS` arrays, reshaped into the
 * v2 API types.
 *
 * These are used ONLY as a fallback when the API host is unreachable, so the
 * back office is still walkable while the backend lands. Every screen still
 * issues its real CONTRACT.md request first; see `store.tsx`.
 */
import type {
  Announcement,
  Community,
  Household,
  Order,
  Product,
  Promotion,
  VerificationLogEntry,
  VerificationRequest,
  WishlistRow,
} from "./types";

export const COMMUNITIES: Community[] = [
  {
    id: "G1", key: "G1", name: "Gems 1 Condo", short: "Gems 1", households: 143, units: 312,
    cycleNo: 34, collectPoint: "Tower 1 guardhouse", cutoffDate: "2026-08-23",
    deliveryDate: "2026-08-25", contractStatus: "Signed", weightFactor: 1,
    collectionWindow: "6–9pm", blocksCovered: "A, B, C", officeContact: "09 771 000 214",
  },
  {
    id: "G2", key: "G2", name: "Gems 2 Condo", short: "Gems 2", households: 96, units: 204,
    cycleNo: 31, collectPoint: "Tower 2 lobby", cutoffDate: "2026-08-23",
    deliveryDate: "2026-08-25", contractStatus: "Signed", weightFactor: 0.67,
    collectionWindow: "6–9pm", blocksCovered: "A, B", officeContact: "09 771 000 215",
  },
  {
    id: "G3", key: "G3", name: "Gems 3 Condo", short: "Gems 3", households: 61, units: 138,
    cycleNo: 22, collectPoint: "Tower 3 guardhouse", cutoffDate: "2026-08-26",
    deliveryDate: "2026-08-28", contractStatus: "Signed", weightFactor: 0.43,
    collectionWindow: "6–9pm", blocksCovered: "A, B", officeContact: "09 771 000 216",
  },
  {
    id: "G4", key: "G4", name: "Gems 4 Condo", short: "Gems 4", households: 38, units: 84,
    cycleNo: 9, collectPoint: "Tower 4 lobby", cutoffDate: "2026-08-26",
    deliveryDate: "2026-08-28", contractStatus: "Pilot", weightFactor: 0.27,
    collectionWindow: "6–9pm", blocksCovered: "A", officeContact: "09 771 000 217",
  },
];

type Raw = [
  string, string, string, string, string, string, string, string, string,
  number, number, [number, number, number, number], number, boolean, string[]
];

const RAW: Raw[] = [
  ["FF-1042", "Shan Highland Tomatoes", "Shan Farm Co-op", "8851001042", "1kg pack", "1 kg", "1.05 kg", "Fresh & Frozen", "Grade A, hand-picked, packed same morning in Aungban. Chilled 4°C in transit.", 3050, 4500, [4200, 3900, 3600, 3300], 63, true, ["G1", "G2", "G3", "G4"]],
  ["FF-1088", "Free-range Eggs, 30s tray", "Golden Yolk", "8851001088", "30 eggs", "30 x 55g", "1.8 kg", "Fresh & Frozen", "Barn-free, dated on shell. Tray is returnable at the collection table.", 8400, 13000, [12000, 11000, 10200, 9500], 96, true, ["G1", "G2", "G3", "G4"]],
  ["FF-2201", "Beef Striploin, chilled", "Capital Butchery", "8851002201", "500g pack", "500 g", "0.52 kg", "Fresh & Frozen", "Vacuum-packed, 21-day aged. Keep at 0–4°C, use within 3 days of collection.", 19800, 32000, [29500, 27500, 25500, 23000], 31, true, ["G1", "G2"]],
  ["FF-2240", "Salmon Fillet, frozen", "Nordic Blue", "8851002240", "400g, skin-on", "400 g", "0.44 kg", "Fresh & Frozen", "Norwegian, skin-on, individually wrapped. Delivered frozen in an insulated tote.", 27500, 45000, [41000, 38000, 35000, 32000], 47, true, ["G1", "G2", "G3"]],
  ["GR-3010", "Paw San Rice, 10kg sack", "Shwe Bo Paw San", "8851003010", "10kg sack", "10 kg", "10.2 kg", "Grocery", "New crop, double-polished, woven sack with handle. Heaviest line in the drop — bring a trolley.", 31000, 48000, [44000, 41000, 38000, 35000], 88, true, ["G1", "G2", "G3", "G4"]],
  ["GR-3055", "Sunflower Cooking Oil", "Sun Valley", "8851003055", "1L bottle", "1 L", "0.95 kg", "Grocery", "Refined, PET bottle, 18-month shelf life. Case of 12 for splits.", 6300, 9800, [9000, 8300, 7700, 7200], 24, true, ["G1", "G2", "G3", "G4"]],
  ["GN-4102", "Laundry Detergent Refill", "Clearwash", "8851004102", "3.6L pouch", "3.6 L", "3.75 kg", "Grocery Non-Food", "Concentrated refill pouch, low-suds, safe for front loaders.", 15200, 24000, [22000, 20000, 18500, 17000], 52, true, ["G1", "G2", "G3"]],
  ["GN-5001", "Bamboo Toilet Roll, 30-pack", "Leaf & Co", "8851005001", "30 rolls", "30 x 3-ply", "4.2 kg", "Grocery Non-Food", "Unbleached bamboo, plastic-free wrap. Bulky — one case per trolley.", 16800, 28000, [25500, 23000, 21000, 19000], 71, true, ["G1", "G2", "G3", "G4"]],
  ["GR-5044", "Mineral Water, 24-bottle case", "Alpine Springs", "8851005044", "24 x 600ml", "14.4 L", "14.8 kg", "Grocery", "Shrink-wrapped case. Highest-volume line — usually clears the 100-unit tier.", 5600, 9500, [8800, 8000, 7200, 6500], 104, true, ["G1", "G2", "G3", "G4"]],
  ["FF-6011", "Frozen Pork Dumplings", "Yangon Kitchen", "8851006011", "1kg pack", "1 kg (40 pcs)", "1.05 kg", "Fresh & Frozen", "Flash-frozen, cook from frozen. Keep at −18°C.", 9700, 16000, [14500, 13200, 12000, 11000], 19, true, ["G1", "G2"]],
  ["GR-7020", "Coconut Water, 12-pack", "Pure Coco", "8851007020", "12 x 330ml", "3.96 L", "4.3 kg", "Grocery", "No added sugar. Delisted this cycle on thin margin — 8 households still asking.", 11200, 18000, [16500, 15000, 13800, 12500], 12, false, ["G1"]],
  ["GN-8003", "Baby Wipes, 6 x 80s", "Softly", "8851008003", "480 wipes", "6 x 80 sheets", "2.1 kg", "Grocery Non-Food", "Fragrance-free, flip-lid packs. Steady repeat line across all towers.", 16400, 26000, [23500, 21500, 19500, 18000], 38, true, ["G1", "G2", "G3"]],
  ["HL-9010", "Rice Cooker, 1.8L", "Panatech", "8851009010", "1 unit", "1.8 L / 700W", "2.4 kg", "Hardline", "Non-stick bowl, one-year local warranty through Capital Retail service desk.", 42000, 68000, [63000, 60000, 57000, 54000], 8, true, ["G1", "G2"]],
  ["SL-9120", "Cotton Bath Towel, 2-pack", "Loomhouse", "8851009120", "2 towels", "70 x 140 cm", "0.9 kg", "Softline", "480gsm combed cotton, four colourways — colour picked at the collection table.", 12000, 20000, [18500, 17500, 16500, 15500], 14, true, ["G1", "G2", "G3"]],
  ["HM-9205", "Bedsheet Set, Queen", "Loomhouse", "8851009205", "4-piece set", "180 x 200 cm", "1.6 kg", "Homeline", "Fitted sheet, flat sheet and two pillowcases. 200TC percale.", 28000, 46000, [42000, 40000, 37500, 35000], 6, true, ["G1", "G2"]],
  ["PH-9301", "Paracetamol 500mg, 100s", "MyanPharm", "8851009301", "100 tablets", "100 x 500mg", "0.12 kg", "Pharmacy", "FDA Myanmar registered. Pharmacy lines are capped at 2 packs per household per cycle.", 3200, 5500, [5000, 4700, 4400, 4100], 22, true, ["G1", "G2", "G3", "G4"]],
];

export const PRODUCTS: Product[] = RAW.map((r, i) => ({
  id: String(i + 1),
  sku: r[0], name: r[1], brand: r[2], barcode: r[3], unit: r[4], size: r[5],
  grossWeight: r[6], category: r[7], details: r[8], imageUrl: null,
  cost: r[9], retailPrice: r[10], prices: [...r[11]] as [number, number, number, number],
  unitsThisCycle: r[12], active: r[13], communityIds: [...r[14]],
}));

export const PROMOTIONS: Promotion[] = [
  { id: "1", name: "Rice week", mechanic: "tier", value: "Unlock 50+ at 20", productId: "5", itemLabel: "Paw San Rice, 10kg sack", communityIds: ["G1", "G2"], startsAt: "19 Aug", endsAt: "25 Aug", uptakeNote: "88 units", live: true },
  { id: "2", name: "First order welcome", mechanic: "percent", value: "10%", productId: null, itemLabel: "Any first order", communityIds: ["G4"], startsAt: "1 Aug", endsAt: "30 Sep", uptakeNote: "21 households", live: true },
  { id: "3", name: "Water + detergent bundle", mechanic: "bundle", value: "K 2,500 off", productId: null, itemLabel: "Mineral Water + Detergent", communityIds: ["G1", "G2", "G3"], startsAt: "22 Aug", endsAt: "29 Aug", uptakeNote: "34 baskets", live: true },
  { id: "4", name: "Trolley Tuesday", mechanic: "threshold", value: "Free porter over K 60,000", productId: null, itemLabel: "Basket total", communityIds: ["G1"], startsAt: "—", endsAt: "—", uptakeNote: "not started", live: false },
  { id: "5", name: "Salmon flash", mechanic: "percent", value: "8%", productId: "4", itemLabel: "Salmon Fillet, frozen", communityIds: ["G1", "G2", "G3"], startsAt: "12 Aug", endsAt: "15 Aug", uptakeNote: "47 units", live: false },
];

export const HOUSEHOLDS: Household[] = [
  { id: "1", unit: "A #14-07", displayName: "Thida Aung", phone: "09 771 204 118", accountState: "active", tempPassword: null, ordersCount: 18, note: "Member since Feb 2026" },
  { id: "2", unit: "A #11-03", displayName: "Nilar Win", phone: "09 662 445 902", accountState: "active", tempPassword: null, ordersCount: 12, note: "Member since Mar 2026" },
  { id: "3", unit: "A #07-12", displayName: "Ko Myat", phone: "09 425 118 330", accountState: "active", tempPassword: null, ordersCount: 9, note: "Member since Apr 2026" },
  { id: "4", unit: "B #09-05", displayName: "Su Su Hlaing", phone: "09 880 337 214", accountState: "active", tempPassword: null, ordersCount: 14, note: "Member since Feb 2026" },
  { id: "5", unit: "B #03-11", displayName: "Zaw Min", phone: "09 253 990 641", accountState: "issued", tempPassword: "gems-4471", ordersCount: 0, note: "Slip printed 20 Aug" },
  { id: "6", unit: "B #12-08", displayName: "May Thu", phone: "09 118 774 205", accountState: "active", tempPassword: null, ordersCount: 6, note: "Member since Jun 2026" },
  { id: "7", unit: "C #05-02", displayName: "Hla Hla Moe", phone: "09 447 226 018", accountState: "none", tempPassword: null, ordersCount: 0, note: "On roster, no login yet" },
  { id: "8", unit: "C #08-09", displayName: "Aung Kyaw", phone: "09 336 552 771", accountState: "none", tempPassword: null, ordersCount: 0, note: "On roster, no login yet" },
  { id: "9", unit: "C #10-04", displayName: "Khin Marlar", phone: "09 774 331 806", accountState: "suspended", tempPassword: null, ordersCount: 3, note: "Moved out, pending handover" },
  { id: "10", unit: "A #02-06", displayName: "Yin Yin Aye", phone: "09 559 004 213", accountState: "none", tempPassword: null, ordersCount: 0, note: "On roster, no login yet" },
];

export const VERIFICATIONS: VerificationRequest[] = [
  { id: "1", name: "Sandar Oo", unit: "B #06-10", phone: "09 448 220 917", kind: "New unit claim", rosterMatch: "Not on roster", proof: "Lease photo", requestedVia: "Guardhouse desk", createdAtLabel: "today 09:12", note: "Says she moved in on 1 Aug. Unit B #06-10 is listed as vacant on the roster from July." },
  { id: "2", name: "Tun Tun Naing", unit: "C #10-04", phone: "09 217 664 553", kind: "Tenant change", rosterMatch: "Roster shows Khin Marlar", proof: "Agent letter", requestedVia: "Property manager", createdAtLabel: "today 08:40", note: "New tenant taking over from the suspended account. Old account should be closed on approval." },
  { id: "3", name: "Ei Mon (household 2nd login)", unit: "A #14-07", phone: "09 771 204 552", kind: "Second login", rosterMatch: "Roster match", proof: "Not needed", requestedVia: "Resident request", createdAtLabel: "yesterday", note: "Daughter collects on Tuesdays when Thida is away. Same unit, separate login, shared order history." },
  { id: "4", name: "Wai Phyo", unit: "D #04-08", phone: "09 660 118 402", kind: "New unit claim", rosterMatch: "Block D not contracted", proof: "None", requestedVia: "App waitlist", createdAtLabel: "yesterday", note: "Block D is outside the current Gems 1 contract. Hold until the office confirms coverage with Capital Retail." },
];

export const VERIFICATION_LOG: VerificationLogEntry[] = [
  { text: "Approved Ma Khine · A #05-09 · account issued", when: "today 07:55", tone: "ok" },
  { text: "Rejected duplicate claim on B #09-05", when: "yesterday 17:20", tone: "bad" },
];

export const ORDERS: Order[] = [
  { id: "1", code: "G1-2481", communityId: "G1", unit: "A #14-07", householdName: "Thida Aung", itemsLabel: "Rice 10kg, Water case x2", total: 51000, stage: "ready", paid: true, paymentMethod: "MMQR" },
  { id: "2", code: "G1-2476", communityId: "G1", unit: "A #11-03", householdName: "Nilar Win", itemsLabel: "Salmon, Eggs, Oil", total: 61500, stage: "packing", paid: false, paymentMethod: "Cash at table" },
  { id: "3", code: "G1-2470", communityId: "G1", unit: "A #07-12", householdName: "Ko Myat", itemsLabel: "Detergent, Tomatoes 3kg", total: 30200, stage: "placed", paid: false, paymentMethod: "Cash at table" },
  { id: "4", code: "G1-2468", communityId: "G1", unit: "B #09-05", householdName: "Su Su Hlaing", itemsLabel: "Toilet roll 30s, Wipes", total: 43500, stage: "ready", paid: true, paymentMethod: "MMQR" },
  { id: "5", code: "G1-2465", communityId: "G1", unit: "B #12-08", householdName: "May Thu", itemsLabel: "Dumplings, Water case", total: 22000, stage: "ready", paid: false, paymentMethod: "Cash at table" },
  { id: "6", code: "G1-2462", communityId: "G1", unit: "B #03-11", householdName: "Zaw Min", itemsLabel: "Beef x4, Rice 10kg", total: 153000, stage: "packing", paid: true, paymentMethod: "MMQR" },
  { id: "7", code: "G1-2390", communityId: "G1", unit: "C #05-02", householdName: "Hla Hla Moe", itemsLabel: "Salmon x2, Toilet roll", total: 78000, stage: "collected", paid: true, paymentMethod: "MMQR" },
  { id: "8", code: "G1-2352", communityId: "G1", unit: "C #10-04", householdName: "Khin Marlar", itemsLabel: "Chicken 2kg, Water case", total: 42600, stage: "collected", paid: false, paymentMethod: "Unpaid" },
];

export const WISHLIST: WishlistRow[] = [
  { id: "1", name: "Yoghurt, 1kg tub", note: "chilled, needs cold chain", votes: 23, householdCount: 6, communitiesLabel: "Gems 1, Gems 2", addedToCatalog: false },
  { id: "2", name: "Village eggs, 30s", note: "free-range, local farm", votes: 18, householdCount: 11, communitiesLabel: "Gems 1, Gems 3", addedToCatalog: false },
  { id: "3", name: "Instant coffee mix, 30s", note: "Capital Retail can source", votes: 14, householdCount: 9, communitiesLabel: "Gems 1", addedToCatalog: false },
  { id: "4", name: "Dog food, 8kg bag", note: "three households keen", votes: 9, householdCount: 3, communitiesLabel: "Gems 2", addedToCatalog: false },
  { id: "5", name: "Nappies, size 4", note: "asked twice this month", votes: 16, householdCount: 7, communitiesLabel: "Gems 1, Gems 4", addedToCatalog: false },
  { id: "6", name: "Charcoal, 5kg", note: "seasonal, low margin", votes: 7, householdCount: 5, communitiesLabel: "Gems 3", addedToCatalog: false },
];

export const ANNOUNCEMENTS: Announcement[] = [
  { id: "1", title: "Tuesday collection moves to the guardhouse", body: "Lobby renovation runs to 5 Sep, so the 6-9pm table is at the Tower 1 guardhouse instead. Bring a trolley for bulk cases.", when: "today 08:05", reach: "143 households · 118 opened", isDraft: false },
  { id: "2", title: "Cutoff is Sunday 10pm, no exceptions", body: "Late orders roll into the Friday drop. Edits are free until cutoff.", when: "yesterday", reach: "143 households · 131 opened", isDraft: false },
  { id: "3", title: "Two cash payments still outstanding", body: "If you collected on 12 Aug and paid nothing at the table, settle at the office before the next drop.", when: "20 Aug", reach: "143 households · 96 opened", isDraft: false },
];

export const STAGE_LIST = [
  { k: "open", label: "Sheet open", when: "until cutoff" },
  { k: "confirmed", label: "Orders confirmed", when: "Sun 10pm" },
  { k: "picking", label: "Picking at DC", when: "Mon 06:00" },
  { k: "packed", label: "Packed per unit", when: "Mon 18:00" },
  { k: "dispatched", label: "Dispatched", when: "Tue 16:00" },
] as const;

export const ORDER_STAGE_LABEL: Record<string, string> = {
  placed: "Order in",
  packing: "Packing",
  ready: "Ready",
  collected: "Collected",
};

export const PROMO_KINDS = [
  { k: "tier", label: "Unlock a deeper tier early", note: "Give the block a tier price before it hits the unit count", vl: "Tier to unlock" },
  { k: "percent", label: "Percentage off", note: "Straight discount on one item or the whole basket", vl: "Percent off" },
  { k: "bundle", label: "Bundle discount", note: "Two or more items bought together", vl: "Kyat off bundle" },
  { k: "threshold", label: "Basket threshold perk", note: "Free porter or delivery above a basket value", vl: "Basket threshold" },
] as const;
