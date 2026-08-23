/* eslint-disable no-console */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// ---------------------------------------------------------------------------
// Tier helpers (mirrors src/lib/pricing.ts — duplicated so the seed has no
// dependency on the compiled server code).
// ---------------------------------------------------------------------------
const tierIndexForJoined = (joined: number) => (joined >= 100 ? 3 : joined >= 50 ? 2 : joined >= 20 ? 1 : 0);
const randInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = <T,>(arr: T[]): T => arr[randInt(0, arr.length - 1)];

// ---------------------------------------------------------------------------
// Source data — transcribed from project/Gather Back Office.dc.html (the ITEMS,
// COMMS, PROMOS, HH, VERIFS, ORD, WISH, ANNS constants). That design file is the
// authority for the back office, so its fixtures are what we seed.
// ---------------------------------------------------------------------------

const COMMS = [
  { key: 'G1', name: 'Gems 1', label: 'Gems 1 Condo', abbr: 'G1', address: 'Gems Residences · Tower 1 · 480 units', households: 143, unitsOnSheet: 312, cycleNo: 34, collectPoint: 'Tower 1 guardhouse', cutoff: '2026-08-23', delivery: '2026-08-25', contract: 'Signed', factor: 1, isOpen: true, stage: 'picking' },
  { key: 'G2', name: 'Gems 2', label: 'Gems 2 Condo', abbr: 'G2', address: 'Gems Residences · Tower 2 · 320 units', households: 96, unitsOnSheet: 204, cycleNo: 31, collectPoint: 'Tower 2 lobby', cutoff: '2026-08-23', delivery: '2026-08-25', contract: 'Signed', factor: 0.67, isOpen: true, stage: 'confirmed' },
  { key: 'G3', name: 'Gems 3', label: 'Gems 3 Condo', abbr: 'G3', address: 'Gems Residences · Tower 3 · 268 units', households: 61, unitsOnSheet: 138, cycleNo: 22, collectPoint: 'Tower 3 guardhouse', cutoff: '2026-08-26', delivery: '2026-08-28', contract: 'Signed', factor: 0.43, isOpen: true, stage: 'open' },
  { key: 'G4', name: 'Gems 4', label: 'Gems 4 Condo', abbr: 'G4', address: 'Gems Residences · Tower 4 · 214 units', households: 38, unitsOnSheet: 84, cycleNo: 9, collectPoint: 'Tower 4 lobby', cutoff: '2026-08-26', delivery: '2026-08-28', contract: 'Pilot', factor: 0.27, isOpen: false, stage: 'open' },
];

const ITEMS = [
  { sku: 'FF-1042', name: 'Shan Highland Tomatoes', brand: 'Shan Farm Co-op', barcode: '8851001042', unit: '1kg pack', size: '1 kg', weight: '1.05 kg', cat: 'Fresh & Frozen', details: 'Grade A, hand-picked, packed same morning in Aungban. Chilled 4°C in transit.', slot: 'produce shot', cost: 3050, retail: 4500, prices: [4200, 3900, 3600, 3300], units: 63, active: true, where: ['G1', 'G2', 'G3', 'G4'] },
  { sku: 'FF-1088', name: 'Free-range Eggs, 30s tray', brand: 'Golden Yolk', barcode: '8851001088', unit: '30 eggs', size: '30 x 55g', weight: '1.8 kg', cat: 'Fresh & Frozen', details: 'Barn-free, dated on shell. Tray is returnable at the collection table.', slot: 'egg tray shot', cost: 8400, retail: 13000, prices: [12000, 11000, 10200, 9500], units: 96, active: true, where: ['G1', 'G2', 'G3', 'G4'] },
  { sku: 'FF-2201', name: 'Beef Striploin, chilled', brand: 'Capital Butchery', barcode: '8851002201', unit: '500g pack', size: '500 g', weight: '0.52 kg', cat: 'Fresh & Frozen', details: 'Vacuum-packed, 21-day aged. Keep at 0–4°C, use within 3 days of collection.', slot: 'beef cut shot', cost: 19800, retail: 32000, prices: [29500, 27500, 25500, 23000], units: 31, active: true, where: ['G1', 'G2'] },
  { sku: 'FF-2240', name: 'Salmon Fillet, frozen', brand: 'Nordic Blue', barcode: '8851002240', unit: '400g, skin-on', size: '400 g', weight: '0.44 kg', cat: 'Fresh & Frozen', details: 'Norwegian, skin-on, individually wrapped. Delivered frozen in an insulated tote.', slot: 'salmon shot', cost: 27500, retail: 45000, prices: [41000, 38000, 35000, 32000], units: 47, active: true, where: ['G1', 'G2', 'G3'] },
  { sku: 'GR-3010', name: 'Paw San Rice, 10kg sack', brand: 'Shwe Bo Paw San', barcode: '8851003010', unit: '10kg sack', size: '10 kg', weight: '10.2 kg', cat: 'Grocery', details: 'New crop, double-polished, woven sack with handle. Heaviest line in the drop — bring a trolley.', slot: 'rice sack shot', cost: 31000, retail: 48000, prices: [44000, 41000, 38000, 35000], units: 88, active: true, where: ['G1', 'G2', 'G3', 'G4'] },
  { sku: 'GR-3055', name: 'Sunflower Cooking Oil', brand: 'Sun Valley', barcode: '8851003055', unit: '1L bottle', size: '1 L', weight: '0.95 kg', cat: 'Grocery', details: 'Refined, PET bottle, 18-month shelf life. Case of 12 for splits.', slot: 'oil bottle shot', cost: 6300, retail: 9800, prices: [9000, 8300, 7700, 7200], units: 24, active: true, where: ['G1', 'G2', 'G3', 'G4'] },
  { sku: 'GN-4102', name: 'Laundry Detergent Refill', brand: 'Clearwash', barcode: '8851004102', unit: '3.6L pouch', size: '3.6 L', weight: '3.75 kg', cat: 'Grocery Non-Food', details: 'Concentrated refill pouch, low-suds, safe for front loaders.', slot: 'detergent shot', cost: 15200, retail: 24000, prices: [22000, 20000, 18500, 17000], units: 52, active: true, where: ['G1', 'G2', 'G3'] },
  { sku: 'GN-5001', name: 'Bamboo Toilet Roll, 30-pack', brand: 'Leaf & Co', barcode: '8851005001', unit: '30 rolls', size: '30 x 3-ply', weight: '4.2 kg', cat: 'Grocery Non-Food', details: 'Unbleached bamboo, plastic-free wrap. Bulky — one case per trolley.', slot: 'paper case shot', cost: 16800, retail: 28000, prices: [25500, 23000, 21000, 19000], units: 71, active: true, where: ['G1', 'G2', 'G3', 'G4'] },
  { sku: 'GR-5044', name: 'Mineral Water, 24-bottle case', brand: 'Alpine Springs', barcode: '8851005044', unit: '24 x 600ml', size: '14.4 L', weight: '14.8 kg', cat: 'Grocery', details: 'Shrink-wrapped case. Highest-volume line — usually clears the 100-unit tier.', slot: 'water case shot', cost: 5600, retail: 9500, prices: [8800, 8000, 7200, 6500], units: 104, active: true, where: ['G1', 'G2', 'G3', 'G4'] },
  { sku: 'FF-6011', name: 'Frozen Pork Dumplings', brand: 'Yangon Kitchen', barcode: '8851006011', unit: '1kg pack', size: '1 kg (40 pcs)', weight: '1.05 kg', cat: 'Fresh & Frozen', details: 'Flash-frozen, cook from frozen. Keep at −18°C.', slot: 'dumpling shot', cost: 9700, retail: 16000, prices: [14500, 13200, 12000, 11000], units: 19, active: true, where: ['G1', 'G2'] },
  { sku: 'GR-7020', name: 'Coconut Water, 12-pack', brand: 'Pure Coco', barcode: '8851007020', unit: '12 x 330ml', size: '3.96 L', weight: '4.3 kg', cat: 'Grocery', details: 'No added sugar. Delisted this cycle on thin margin — 8 households still asking.', slot: 'drinks shot', cost: 11200, retail: 18000, prices: [16500, 15000, 13800, 12500], units: 12, active: false, where: ['G1'] },
  { sku: 'GN-8003', name: 'Baby Wipes, 6 x 80s', brand: 'Softly', barcode: '8851008003', unit: '480 wipes', size: '6 x 80 sheets', weight: '2.1 kg', cat: 'Grocery Non-Food', details: 'Fragrance-free, flip-lid packs. Steady repeat line across all towers.', slot: 'wipes shot', cost: 16400, retail: 26000, prices: [23500, 21500, 19500, 18000], units: 38, active: true, where: ['G1', 'G2', 'G3'] },
  { sku: 'HL-9010', name: 'Rice Cooker, 1.8L', brand: 'Panatech', barcode: '8851009010', unit: '1 unit', size: '1.8 L / 700W', weight: '2.4 kg', cat: 'Hardline', details: 'Non-stick bowl, one-year local warranty through Capital Retail service desk.', slot: 'appliance shot', cost: 42000, retail: 68000, prices: [63000, 60000, 57000, 54000], units: 8, active: true, where: ['G1', 'G2'] },
  { sku: 'SL-9120', name: 'Cotton Bath Towel, 2-pack', brand: 'Loomhouse', barcode: '8851009120', unit: '2 towels', size: '70 x 140 cm', weight: '0.9 kg', cat: 'Softline', details: '480gsm combed cotton, four colourways — colour picked at the collection table.', slot: 'towel shot', cost: 12000, retail: 20000, prices: [18500, 17500, 16500, 15500], units: 14, active: true, where: ['G1', 'G2', 'G3'] },
  { sku: 'HM-9205', name: 'Bedsheet Set, Queen', brand: 'Loomhouse', barcode: '8851009205', unit: '4-piece set', size: '180 x 200 cm', weight: '1.6 kg', cat: 'Homeline', details: 'Fitted sheet, flat sheet and two pillowcases. 200TC percale.', slot: 'bedding shot', cost: 28000, retail: 46000, prices: [42000, 40000, 37500, 35000], units: 6, active: true, where: ['G1', 'G2'] },
  { sku: 'PH-9301', name: 'Paracetamol 500mg, 100s', brand: 'MyanPharm', barcode: '8851009301', unit: '100 tablets', size: '100 x 500mg', weight: '0.12 kg', cat: 'Pharmacy', details: 'FDA Myanmar registered. Pharmacy lines are capped at 2 packs per household per cycle.', slot: 'pharmacy shot', cost: 3200, retail: 5500, prices: [5000, 4700, 4400, 4100], units: 22, active: true, where: ['G1', 'G2', 'G3', 'G4'] },
];

const PROMOS = [
  { name: 'Rice week', mechanic: 'tier', value: 'Unlock 50+ at 20', sku: 'GR-3010', where: ['G1', 'G2'], from: '2026-08-19', to: '2026-08-25', uptake: '88 units', live: true },
  { name: 'First order welcome', mechanic: 'percent', value: '10%', sku: null, where: ['G4'], from: '2026-08-01', to: '2026-09-30', uptake: '21 households', live: true },
  { name: 'Water + detergent bundle', mechanic: 'bundle', value: 'K 2,500 off', sku: null, where: ['G1', 'G2', 'G3'], from: '2026-08-22', to: '2026-08-29', uptake: '34 baskets', live: true },
  { name: 'Trolley Tuesday', mechanic: 'threshold', value: 'Free porter over K 60,000', sku: null, where: ['G1'], from: '2026-08-24', to: '2026-08-31', uptake: 'not started', live: false },
  { name: 'Salmon flash', mechanic: 'percent', value: '8%', sku: 'FF-2240', where: ['G1', 'G2', 'G3'], from: '2026-08-12', to: '2026-08-15', uptake: '47 units', live: false },
];

/** Gems 1 roster — the design's HH fixture. Other towers get generated rosters. */
const HH_G1 = [
  { unit: 'A #14-07', name: 'Thida Aung', phone: '09 771 204 118', acct: 'active', temp: null, since: '2026-02-01' },
  { unit: 'A #11-03', name: 'Nilar Win', phone: '09 662 445 902', acct: 'active', temp: null, since: '2026-03-01' },
  { unit: 'A #07-12', name: 'Ko Myat', phone: '09 425 118 330', acct: 'active', temp: null, since: '2026-04-01' },
  { unit: 'B #09-05', name: 'Su Su Hlaing', phone: '09 880 337 214', acct: 'active', temp: null, since: '2026-02-01' },
  { unit: 'B #03-11', name: 'Zaw Min', phone: '09 253 990 641', acct: 'issued', temp: 'gems-4471', since: null },
  { unit: 'B #12-08', name: 'May Thu', phone: '09 118 774 205', acct: 'active', temp: null, since: '2026-06-01' },
  { unit: 'C #05-02', name: 'Hla Hla Moe', phone: '09 447 226 018', acct: 'none', temp: null, since: null },
  { unit: 'C #08-09', name: 'Aung Kyaw', phone: '09 336 552 771', acct: 'none', temp: null, since: null },
  { unit: 'C #10-04', name: 'Khin Marlar', phone: '09 774 331 806', acct: 'suspended', temp: null, since: null },
  { unit: 'A #02-06', name: 'Yin Yin Aye', phone: '09 559 004 213', acct: 'none', temp: null, since: null },
];

const VERIFS = [
  { name: 'Sandar Oo', unit: 'B #06-10', phone: '09 448 220 917', kind: 'New unit claim', match: 'Not on roster', proof: 'Lease photo', via: 'Guardhouse desk', note: 'Says she moved in on 1 Aug. Unit B #06-10 is listed as vacant on the roster from July.' },
  { name: 'Tun Tun Naing', unit: 'C #10-04', phone: '09 217 664 553', kind: 'Tenant change', match: 'Roster shows Khin Marlar', proof: 'Agent letter', via: 'Property manager', note: 'New tenant taking over from the suspended account. Old account should be closed on approval.' },
  { name: 'Ei Mon (household 2nd login)', unit: 'A #14-07', phone: '09 771 204 552', kind: 'Second login', match: 'Roster match', proof: 'Not needed', via: 'Resident request', note: 'Daughter collects on Tuesdays when Thida is away. Same unit, separate login, shared order history.' },
  { name: 'Wai Phyo', unit: 'D #04-08', phone: '09 660 118 402', kind: 'New unit claim', match: 'Block D not contracted', proof: 'None', via: 'App waitlist', note: 'Block D is outside the current Gems 1 contract. Hold until the office confirms coverage with Capital Retail.' },
];

const WISHES = [
  { name: 'Yoghurt, 1kg tub', note: 'chilled, needs cold chain', votes: 23, households: 6, comms: ['G1', 'G2'] },
  { name: 'Village eggs, 30s', note: 'free-range, local farm', votes: 18, households: 11, comms: ['G1', 'G3'] },
  { name: 'Instant coffee mix, 30s', note: 'Capital Retail can source', votes: 14, households: 9, comms: ['G1'] },
  { name: 'Dog food, 8kg bag', note: 'three households keen', votes: 9, households: 3, comms: ['G2'] },
  { name: 'Nappies, size 4', note: 'asked twice this month', votes: 16, households: 7, comms: ['G1', 'G4'] },
  { name: 'Charcoal, 5kg', note: 'seasonal, low margin', votes: 7, households: 5, comms: ['G3'] },
];

const ANNS = [
  { title: 'Tuesday collection moves to the guardhouse', body: 'Lobby renovation runs to 5 Sep, so the 6-9pm table is at the Tower 1 guardhouse instead. Bring a trolley for bulk cases.', opened: 118, daysAgo: 0 },
  { title: 'Cutoff is Sunday 10pm, no exceptions', body: 'Late orders roll into the Friday drop. Edits are free until cutoff.', opened: 131, daysAgo: 1 },
  { title: 'Two cash payments still outstanding', body: 'If you collected on 12 Aug and paid nothing at the table, settle at the office before the next drop.', opened: 96, daysAgo: 3 },
];

const NAME_POOL = ['Aye Myat', 'Kyaw Soe', 'Mya Mya', 'Tin Tun', 'Hnin Wai', 'Soe Moe', 'Nwe Nwe', 'Zin Ko', 'Thet Su', 'Myo Min', 'Ei Ei', 'Kaung Set', 'Phyu Phyu', 'Nay Lin', 'Moe Moe', 'Sithu Aung', 'Wai Wai', 'Htun Htun', 'Cho Cho', 'Aung Naing'];
const ACTIVITY_TEXTS = [
  'joined Paw San Rice ×2 — tipped the 100-unit tier',
  'opened a split on the 10kg rice sack',
  'asked about the tomatoes on the product page',
  'collected their order at the guardhouse',
  'added baby wipes to the wishlist',
];

const DEMO_RESIDENTS: Record<string, { username: string; displayName: string; unit: string }> = {
  G1: { username: 'thida.aung', displayName: 'Thida Aung', unit: 'A #14-07' },
  G2: { username: 'moe.thu', displayName: 'Moe Thu', unit: 'A #05-08' },
  G3: { username: 'aye.chan', displayName: 'Aye Chan', unit: 'A #03-04' },
  G4: { username: 'htet.aung', displayName: 'Htet Aung', unit: 'A #02-01' },
};

/** "A #14-07" -> { block: "A", unit: "14-07" } */
function splitUnit(raw: string) {
  const m = /^\s*([A-Za-z0-9]+)?\s*#?\s*(.+?)\s*$/.exec(raw);
  return { block: m?.[1] ?? '', unit: (m?.[2] ?? raw).replace(/^#/, '') };
}

async function main() {
  console.log('Clearing existing data...');
  await prisma.pickLine.deleteMany();
  await prisma.fulfilmentRun.deleteMany();
  await prisma.cashUp.deleteMany();
  await prisma.verificationRequest.deleteMany();
  await prisma.promotionCommunity.deleteMany();
  await prisma.promotion.deleteMany();
  await prisma.productCommunity.deleteMany();
  await prisma.splitParticipant.deleteMany();
  await prisma.split.deleteMany();
  await prisma.wishlistVote.deleteMany();
  await prisma.wishlist.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.orderLine.deleteMany();
  await prisma.order.deleteMany();
  await prisma.activity.deleteMany();
  await prisma.alert.deleteMany();
  await prisma.adminUser.deleteMany();
  await prisma.user.deleteMany();
  await prisma.product.deleteMany();
  await prisma.community.deleteMany();

  // --- communities -------------------------------------------------------
  console.log('Seeding communities...');
  const commByKey: Record<string, any> = {};
  for (const c of COMMS) {
    const delivery = new Date(`${c.delivery}T18:00:00Z`);
    commByKey[c.key] = await prisma.community.create({
      data: {
        name: c.name,
        label: c.label,
        abbr: c.abbr,
        code: c.key,
        address: c.address,
        collectPoint: c.collectPoint,
        cycleNo: c.cycleNo,
        isOpen: c.isOpen,
        cutoffAt: new Date(`${c.cutoff}T22:00:00Z`),
        cutoffDate: new Date(`${c.cutoff}T22:00:00Z`),
        deliveryDate: delivery,
        deliveryLabel: delivery.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' }),
        collectionWindow: '6–9pm',
        contractStatus: c.contract,
        blocksCovered: 'A, B, C',
        officeContact: '09 771 000 214',
        weightFactor: c.factor,
      },
    });
  }

  // --- products + listing scope -----------------------------------------
  console.log('Seeding products...');
  const productBySku: Record<string, any> = {};
  for (const i of ITEMS) {
    const product = await prisma.product.create({
      data: {
        sku: i.sku,
        name: i.name,
        brand: i.brand,
        barcode: i.barcode,
        unit: i.unit,
        size: i.size,
        grossWeight: i.weight,
        category: i.cat,
        details: i.details,
        cost: i.cost,
        retailPrice: i.retail,
        price0: i.prices[0],
        price1: i.prices[1],
        price2: i.prices[2],
        price3: i.prices[3],
        imageSlot: i.slot,
        active: i.active,
      },
    });
    productBySku[i.sku] = product;
    for (const key of i.where) {
      await prisma.productCommunity.create({
        data: { productId: product.id, communityId: commByKey[key].id },
      });
    }
  }

  // --- promotions --------------------------------------------------------
  console.log('Seeding promotions...');
  for (const p of PROMOS) {
    const promo = await prisma.promotion.create({
      data: {
        name: p.name,
        mechanic: p.mechanic,
        value: p.value,
        productId: p.sku ? productBySku[p.sku].id : null,
        startsAt: new Date(`${p.from}T00:00:00Z`),
        endsAt: new Date(`${p.to}T23:59:59Z`),
        live: p.live,
        uptakeNote: p.uptake,
      },
    });
    for (const key of p.where) {
      await prisma.promotionCommunity.create({
        data: { promotionId: promo.id, communityId: commByKey[key].id },
      });
    }
  }

  // --- admins ------------------------------------------------------------
  console.log('Seeding back-office accounts...');
  await prisma.adminUser.create({
    data: {
      role: 'retail',
      username: 'ye.naing@capitalretail.mm',
      email: 'ye.naing@capitalretail.mm',
      passwordHash: await bcrypt.hash('retail-2026', 10),
      displayName: 'Ye Naing · Capital Retail',
    },
  });
  const OFFICE_NAMES: Record<string, string> = {
    G1: 'Daw Moe · Gems 1 office',
    G2: 'U Tin · Gems 2 office',
    G3: 'Daw Hla · Gems 3 office',
    G4: 'U Kyaw · Gems 4 office',
  };
  for (const c of COMMS) {
    await prisma.adminUser.create({
      data: {
        role: 'office',
        communityId: commByKey[c.key].id,
        username: `${c.key.toLowerCase()}.office`.replace('g', 'gems'),
        passwordHash: await bcrypt.hash('office-2026', 10),
        displayName: OFFICE_NAMES[c.key],
      },
    });
  }

  // --- residents ---------------------------------------------------------
  console.log('Seeding households and historical orders...');
  const usersByComm: Record<string, any[]> = {};

  for (const c of COMMS) {
    const community = commByKey[c.key];
    const created: any[] = [];
    const demo = DEMO_RESIDENTS[c.key];

    // The design's Gems 1 roster verbatim; generated rosters elsewhere.
    const roster =
      c.key === 'G1'
        ? HH_G1
        : [
            { unit: demo.unit, name: demo.displayName, phone: '09 500 000 000', acct: 'active', temp: null, since: '2026-03-01' },
            ...Array.from({ length: randInt(14, 18) }, () => ({
              unit: `${pick(['A', 'B', 'C'])} #${String(randInt(1, 14)).padStart(2, '0')}-${String(randInt(1, 20)).padStart(2, '0')}`,
              name: pick(NAME_POOL),
              phone: `09 ${randInt(100, 999)} ${randInt(100, 999)} ${randInt(100, 999)}`,
              acct: pick(['active', 'active', 'active', 'issued', 'none']) as string,
              temp: null as string | null,
              since: '2026-04-01',
            })),
          ];

    for (const [idx, h] of roster.entries()) {
      const { block, unit } = splitUnit(h.unit);
      // The demo resident of each tower keeps a known username/password so the
      // app can be reviewed instantly; everyone else gets a derived login.
      const isDemo = c.key === 'G1' ? h.name === 'Thida Aung' : idx === 0;
      const username = isDemo
        ? demo.username
        : `${h.name.toLowerCase().replace(/[^a-z\s]/g, '').trim().split(/\s+/).slice(0, 2).join('.')}.${c.key.toLowerCase()}${idx}`;
      const password = isDemo ? 'gather123' : h.temp ?? 'neighbour123';

      const user = await prisma.user.create({
        data: {
          communityId: community.id,
          username,
          passwordHash: await bcrypt.hash(password, 10),
          mustSetPassword: h.acct === 'issued',
          displayName: h.name,
          block,
          unit,
          blockUnit: `${block} #${unit}`,
          phone: h.phone,
          verified: h.acct === 'active' || h.acct === 'issued',
          accountState: h.acct,
          tempPassword: h.temp,
          memberSince: h.since ? new Date(h.since) : null,
          avatarIndex: randInt(0, 7),
        },
      });
      created.push(user);
    }
    usersByComm[c.key] = created;
  }

  // --- historical orders, scaled per tower so tier progress looks real ----
  const STAGES: { status: string; paid: boolean }[] = [
    { status: 'collected', paid: true },
    { status: 'collected', paid: true },
    { status: 'collected', paid: false },
    { status: 'ready', paid: true },
    { status: 'ready', paid: false },
    { status: 'packing', paid: false },
    { status: 'placed', paid: false },
  ];

  for (const c of COMMS) {
    const community = commByKey[c.key];
    const residents = usersByComm[c.key].filter((u) => u.accountState !== 'none');
    const listed = ITEMS.filter((i) => i.where.includes(c.key) && i.active);
    let seq = 2300;
    let placed = 0;

    // Aim at the design's per-product unit counts, scaled by tower size.
    const remaining = new Map<string, number>();
    for (const i of listed) remaining.set(i.sku, Math.max(1, Math.round(i.units * c.factor)));

    while ([...remaining.values()].some((v) => v > 0) && placed < 120) {
      const user = pick(residents);
      const stage = pick(STAGES);
      const linesForOrder = [...remaining.entries()].filter(([, v]) => v > 0).slice(0, randInt(1, 3));
      if (!linesForOrder.length) break;

      seq += randInt(1, 4);
      const code = `${c.key}-${seq}`;
      const daysAgo = randInt(1, 30);
      const placedAt = new Date(Date.now() - daysAgo * 86400000);

      const order = await prisma.order.create({
        data: {
          code,
          communityId: community.id,
          userId: user.id,
          status: stage.status,
          paymentMethod: pick(['mmqr', 'collection']),
          paid: stage.paid,
          placedAt,
          packingAt: stage.status !== 'placed' ? new Date(placedAt.getTime() + 86400000) : null,
          readyAt: ['ready', 'collected'].includes(stage.status) ? new Date(placedAt.getTime() + 2 * 86400000) : null,
          collectedAt: stage.status === 'collected' ? new Date(placedAt.getTime() + 3 * 86400000) : null,
          collectedBy: stage.status === 'collected' ? user.displayName : null,
          collectLabel: community.deliveryLabel,
        },
      });

      for (const [sku, want] of linesForOrder) {
        const item = ITEMS.find((i) => i.sku === sku)!;
        const qty = Math.min(want, randInt(1, 3));
        const already = Math.round(item.units * c.factor) - want;
        const tierIndex = tierIndexForJoined(already);
        await prisma.orderLine.create({
          data: {
            orderId: order.id,
            productId: productBySku[sku].id,
            qty,
            unitPrice: item.prices[tierIndex],
            tierIndex,
          },
        });
        remaining.set(sku, want - qty);
      }
      placed += 1;
    }
    console.log(`  ${c.label}: ${usersByComm[c.key].length} households, ${placed} orders`);
  }

  // --- fulfilment runs ----------------------------------------------------
  console.log('Seeding fulfilment runs...');
  for (const c of COMMS) {
    const community = commByKey[c.key];
    const run = await prisma.fulfilmentRun.create({
      data: { communityId: community.id, cycleNo: c.cycleNo, stage: c.stage },
    });
    const grouped = await prisma.orderLine.groupBy({
      by: ['productId'],
      where: { order: { communityId: community.id } },
      _sum: { qty: true },
    });
    for (const g of grouped) {
      const ordered = g._sum.qty ?? 0;
      await prisma.pickLine.create({
        data: {
          fulfilmentRunId: run.id,
          productId: g.productId,
          orderedQty: ordered,
          // Only a run that has actually been picked has counts against it.
          pickedQty: c.stage === 'picking' || c.stage === 'packed' || c.stage === 'dispatched'
            ? Math.max(0, ordered - (Math.random() < 0.15 ? randInt(1, 2) : 0))
            : null,
        },
      });
    }
  }

  // --- verification queue -------------------------------------------------
  console.log('Seeding verification queue...');
  for (const v of VERIFS) {
    await prisma.verificationRequest.create({
      data: {
        communityId: commByKey.G1.id,
        name: v.name,
        unit: v.unit,
        phone: v.phone,
        kind: v.kind,
        rosterMatch: v.match,
        proof: v.proof,
        requestedVia: v.via,
        note: v.note,
        status: 'pending',
      },
    });
  }
  // Two already handled today, so the "Handled today" panel is not empty.
  await prisma.verificationRequest.create({
    data: {
      communityId: commByKey.G1.id, name: 'Ma Khine', unit: 'A #05-09', phone: '09 220 114 776',
      kind: 'New unit claim', rosterMatch: 'Roster match', proof: 'Lease photo', requestedVia: 'Guardhouse desk',
      note: 'Straightforward match.', status: 'approved', resolvedAt: new Date(),
      resolutionNote: 'Approved Ma Khine · A #05-09 · account issued',
    },
  });
  await prisma.verificationRequest.create({
    data: {
      communityId: commByKey.G1.id, name: 'Duplicate claim', unit: 'B #09-05', phone: '09 000 000 000',
      kind: 'New unit claim', rosterMatch: 'Already active', proof: 'None', requestedVia: 'App waitlist',
      note: 'Unit already has an active account.', status: 'rejected',
      resolvedAt: new Date(Date.now() - 86400000),
      resolutionNote: 'Rejected duplicate claim on B #09-05',
    },
  });

  // --- wishlist / splits / activity / announcements ------------------------
  console.log('Seeding community content...');
  for (const w of WISHES) {
    for (const key of w.comms) {
      const wish = await prisma.wishlist.create({
        data: {
          communityId: commByKey[key].id,
          name: w.name,
          note: w.note,
          householdCount: w.households,
          addedToCatalog: false,
        },
      });
      const voters = usersByComm[key].slice(0, Math.min(w.votes, usersByComm[key].length));
      for (const v of voters) {
        await prisma.wishlistVote.create({ data: { wishlistId: wish.id, userId: v.id } });
      }
    }
  }

  for (const c of COMMS) {
    const residents = usersByComm[c.key];
    const listed = ITEMS.filter((i) => i.where.includes(c.key));
    for (let n = 0; n < 4; n += 1) {
      const item = pick(listed);
      const host = pick(residents);
      await prisma.split.create({
        data: {
          communityId: commByKey[c.key].id,
          productId: productBySku[item.sku].id,
          initiatorName: `${host.displayName} · ${host.blockUnit}`,
          detail: pick(['splitting the sack', 'splitting 15 + 15', 'buying 4, 2 spare', 'two cases, one trolley trip']),
          neededCount: randInt(1, 2),
        },
      });
    }
    for (let n = 0; n < 5; n += 1) {
      const who = pick(residents);
      await prisma.activity.create({
        data: {
          communityId: commByKey[c.key].id,
          userId: who.id,
          text: `${who.blockUnit} ${ACTIVITY_TEXTS[n % ACTIVITY_TEXTS.length]}`,
        },
      });
    }
    for (const a of ANNS) {
      await prisma.alert.create({
        data: {
          communityId: commByKey[c.key].id,
          title: a.title,
          body: a.body,
          ctaLabel: 'Review your order',
          ctaType: 'cart',
          isDraft: false,
          reachCount: c.households,
          openedCount: Math.round(a.opened * c.factor),
          createdAt: new Date(Date.now() - a.daysAgo * 86400000),
        },
      });
    }
    // One unpublished draft, so the resident app can be checked for leakage.
    await prisma.alert.create({
      data: {
        communityId: commByKey[c.key].id,
        title: 'DRAFT — do not show to residents',
        body: 'This announcement is still a draft in the office console and must never appear in the resident Updates feed.',
        ctaLabel: 'Open Gather',
        ctaType: 'none',
        isDraft: true,
        reachCount: 0,
      },
    });
  }

  // --- product Q&A --------------------------------------------------------
  const g1Users = usersByComm.G1;
  const rice = productBySku['GR-3010'];
  await prisma.comment.create({
    data: { productId: rice.id, userId: g1Users[1].id, text: 'Last cycle the rice came in sealed and dry, good stuff.' },
  });
  await prisma.comment.create({
    data: { productId: rice.id, userId: g1Users[2].id, text: 'Anyone want to split a sack? I only need 5kg.' },
  });
  await prisma.comment.create({
    data: { productId: productBySku['GR-5044'].id, userId: g1Users[3].id, text: 'Bring a trolley — the cases are heavy from the collection point.' },
  });

  console.log('Seed complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
