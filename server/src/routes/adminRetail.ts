import { Router } from 'express';
import { Community, Product } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { requireAdmin } from '../middleware/auth';
import {
  CATEGORIES,
  PROMO_MECHANICS,
  STAGE_KEYS,
  STAGE_LIST,
  TIER_SHORT,
  priceForTier,
  tierIndexForJoined,
} from '../lib/pricing';
import {
  joinedMapForCommunity,
  joinedMapGlobal,
  listingScopeMap,
  resolveCommunity,
  setListingScope,
  setPromotionScope,
} from '../lib/catalog';
import { serializeCommunity, serializePromotion, serializeProductRetail } from '../lib/serialize';
import { COLS, Row, boolish, get, intOr, num, splitList, str } from '../lib/importRows';
import { validate } from '../lib/validate';
import { commonSchemas, retailSchemas } from '../lib/schemas';

const router = Router();

// Every route below is Capital Retail only. An office token gets 403 here.
router.use(requireAdmin('retail'));

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

const PROMO_INCLUDE = { communities: true, product: true } as const;

async function communityByCodes(codes: string[]): Promise<string[]> {
  if (!codes.length) return [];
  const rows = await prisma.community.findMany({
    where: { OR: [{ id: { in: codes } }, { code: { in: codes } }, { abbr: { in: codes } }, { name: { in: codes } }] },
    select: { id: true },
  });
  return rows.map((r) => r.id);
}

function normaliseCategory(raw: string, fallback: string): string {
  const exact = CATEGORIES.find((c) => c.toLowerCase() === raw.toLowerCase());
  if (exact) return exact;
  const loose = CATEGORIES.find((c) => raw.toLowerCase().startsWith(c.toLowerCase().split(' ')[0]));
  return loose ?? fallback;
}

/** Per-community trading figures for the cycle. Margin here is retail-console-only. */
async function boardRow(c: Community) {
  const orders = await prisma.order.findMany({
    where: { communityId: c.id },
    include: { lines: { include: { product: true } } },
  });
  let units = 0;
  let value = 0;
  let margin = 0;
  for (const o of orders) {
    for (const l of o.lines) {
      units += l.qty;
      value += l.unitPrice * l.qty;
      margin += (l.unitPrice - l.product.cost) * l.qty;
    }
  }
  const run = await ensureRun(c);
  const stage = STAGE_LIST.find((s) => s.key === run.stage) ?? STAGE_LIST[0];
  const households = await prisma.user.count({ where: { communityId: c.id } });
  return {
    communityId: c.id,
    code: c.code,
    community: c.name,
    label: c.label,
    households,
    collectPoint: c.collectPoint,
    orders: orders.length,
    units,
    value,
    margin,
    marginPct: value > 0 ? Math.round((margin / value) * 100) : 0,
    stage: run.stage,
    stageLabel: stage.label,
    contractStatus: c.contractStatus,
  };
}

async function ensureRun(community: Community) {
  const existing = await prisma.fulfilmentRun.findUnique({
    where: { communityId_cycleNo: { communityId: community.id, cycleNo: community.cycleNo } },
  });
  if (existing) return existing;
  return prisma.fulfilmentRun.create({
    data: { communityId: community.id, cycleNo: community.cycleNo, stage: 'open' },
  });
}

/**
 * Pick lines for a run. Ordered quantities come from the real order lines placed at
 * that community; the row is created once so picked counts can be typed against it.
 */
async function ensurePickLines(runId: string, communityId: string) {
  const products = await prisma.product.findMany({
    where: { active: true, listedAt: { some: { communityId } } },
    orderBy: { name: 'asc' },
  });
  const joined = await joinedMapForCommunity(communityId);
  const existing = await prisma.pickLine.findMany({ where: { fulfilmentRunId: runId } });
  const byProduct = new Map(existing.map((l) => [l.productId, l]));

  for (const p of products) {
    const ordered = joined.get(p.id) ?? 0;
    if (ordered <= 0 && !byProduct.has(p.id)) continue; // nothing on the sheet for this line
    const row = byProduct.get(p.id);
    if (!row) {
      await prisma.pickLine.create({
        data: { fulfilmentRunId: runId, productId: p.id, orderedQty: ordered, pickedQty: null },
      });
    } else if (row.orderedQty !== ordered) {
      await prisma.pickLine.update({ where: { id: row.id }, data: { orderedQty: ordered } });
    }
  }
  return prisma.pickLine.findMany({
    where: { fulfilmentRunId: runId },
    include: { product: true },
    orderBy: { product: { name: 'asc' } },
  });
}

// ---------------------------------------------------------------------------
// GET /overview?scope=all|<communityId>
// ---------------------------------------------------------------------------
router.get('/overview', validate({ query: retailSchemas.overviewQuery }), async (req, res) => {
  const scope = String((req.query as any).scope ?? 'all');
  const communities = await prisma.community.findMany({ orderBy: { name: 'asc' } });
  const scoped =
    scope && scope !== 'all'
      ? communities.filter((c) => c.id === scope || c.code === scope || c.abbr === scope)
      : communities;

  const board = [];
  for (const c of scoped) board.push(await boardRow(c));

  const gmv = board.reduce((a, b) => a + b.value, 0);
  const gm = board.reduce((a, b) => a + b.margin, 0);
  const totalUnits = board.reduce((a, b) => a + b.units, 0);
  const totalOrders = board.reduce((a, b) => a + b.orders, 0);

  const unpaid = await prisma.order.findMany({
    where: { paid: false, ...(scope !== 'all' ? { communityId: { in: scoped.map((c) => c.id) } } : {}) },
    include: { lines: true },
  });
  const outstanding = unpaid.reduce(
    (a, o) => a + o.lines.reduce((s, l) => s + l.unitPrice * l.qty, 0),
    0
  );

  const kpis = [
    { key: 'gmv', value: gmv, label: 'Group order value', note: 'this cycle, all towers', format: 'money' },
    { key: 'orders', value: totalOrders, label: 'Household orders', note: 'placed this cycle', format: 'count' },
    { key: 'units', value: totalUnits, label: 'Units on the sheets', note: 'drives tier unlocks', format: 'count' },
    {
      key: 'blendedMargin',
      value: gmv > 0 ? Math.round((gm / gmv) * 100) : 0,
      label: 'Blended margin',
      note: 'contribution across the drop',
      format: 'percent',
      amount: gm,
    },
    { key: 'outstanding', value: outstanding, label: 'Cash outstanding', note: 'unpaid at collection', format: 'money' },
  ];

  // Movers: best-selling lines with their tier and margin.
  const joined = await joinedMapGlobal();
  const products = await prisma.product.findMany();
  const movers = products
    .map((p) => {
      const units = joined.get(p.id) ?? 0;
      const tierIndex = tierIndexForJoined(units);
      const price = priceForTier(p, tierIndex);
      return {
        id: p.id,
        name: p.name,
        sku: p.sku,
        units,
        tier: TIER_SHORT[tierIndex],
        margin: price > 0 ? Math.round((1 - p.cost / price) * 100) : 0,
      };
    })
    .sort((a, b) => b.units - a.units)
    .slice(0, 5);

  // To-dos, all derived from live data rather than hardcoded copy.
  const todos: { key: string; title: string; body: string; cta: string; target: string }[] = [];
  for (const b of board) {
    const community = scoped.find((c) => c.id === b.communityId)!;
    const run = await ensureRun(community);
    const short = await prisma.pickLine.count({
      where: { fulfilmentRunId: run.id, pickedQty: { not: null } },
    });
    const shortLines = short
      ? (await prisma.pickLine.findMany({ where: { fulfilmentRunId: run.id, pickedQty: { not: null } } })).filter(
          (l) => (l.pickedQty ?? 0) < l.orderedQty
        ).length
      : 0;
    if (shortLines) {
      todos.push({
        key: `short-${b.code}`,
        title: `${shortLines} short lines in the ${b.community} pick`,
        body: 'Picked counts are under what households ordered. Decide substitutions before packing closes.',
        cta: 'Open fulfilment',
        target: `fulfilment:${b.communityId}`,
      });
    }
  }
  const delisted = await prisma.product.findMany({ where: { active: false } });
  for (const d of delisted.slice(0, 2)) {
    const asks = await prisma.wishlist.count({ where: { name: { contains: d.name.split(',')[0] } } });
    todos.push({
      key: `delisted-${d.id}`,
      title: `${d.name} is delisted${asks ? ' but still wished for' : ''}`,
      body: d.details || 'Reprice it or drop it from the sheet.',
      cta: 'Open the item',
      target: `product:${d.id}`,
    });
  }
  for (const c of communities.filter((c) => c.contractStatus === 'Pilot')) {
    const households = await prisma.user.count({ where: { communityId: c.id } });
    todos.push({
      key: `pilot-${c.code}`,
      title: `${c.name} is on pilot terms`,
      body: `${households} households on the roster. Pilot margin runs under the signed towers.`,
      cta: 'Review cycles',
      target: 'cycles',
    });
  }
  const soon = new Date(Date.now() + 7 * 24 * 3600 * 1000);
  for (const p of await prisma.promotion.findMany({ where: { live: true, endsAt: { lte: soon } } })) {
    todos.push({
      key: `promo-${p.id}`,
      title: `${p.name} ends ${p.endsAt.toISOString().slice(0, 10)}`,
      body: `${p.uptakeNote}. Extend it or let the price revert on the next sheet.`,
      cta: 'Open promotions',
      target: 'promotions',
    });
  }

  res.json({ kpis, board, todos, movers, scope });
});

// ---------------------------------------------------------------------------
// Catalog
// ---------------------------------------------------------------------------

const PRODUCT_STRING_FIELDS = ['sku', 'name', 'brand', 'barcode', 'unit', 'size', 'grossWeight', 'category', 'details', 'imageSlot', 'imageUrl'];
const PRODUCT_INT_FIELDS = ['cost', 'retailPrice', 'price0', 'price1', 'price2', 'price3'];

function pickProductFields(body: any) {
  const data: any = {};
  for (const key of PRODUCT_STRING_FIELDS) if (body[key] !== undefined) data[key] = body[key] === null ? null : String(body[key]);
  for (const key of PRODUCT_INT_FIELDS) if (body[key] !== undefined) data[key] = Math.round(num(body[key]));
  if (body.active !== undefined) data.active = !!body.active;
  if (Array.isArray(body.prices) && body.prices.length === 4) {
    data.price0 = Math.round(num(body.prices[0]));
    data.price1 = Math.round(num(body.prices[1]));
    data.price2 = Math.round(num(body.prices[2]));
    data.price3 = Math.round(num(body.prices[3]));
  }
  if (data.category) data.category = normaliseCategory(data.category, 'Grocery');
  return data;
}

// GET /products?q=&category=
router.get('/products', validate({ query: retailSchemas.productQuery }), async (req, res) => {
  const { q, category } = req.query as { q?: string; category?: string };
  const where: any = {};
  if (category && category !== 'All') where.category = category;
  const products = await prisma.product.findMany({ where, orderBy: { name: 'asc' } });
  const term = (q ?? '').trim().toLowerCase();
  const filtered = term
    ? products.filter((p) =>
        `${p.name} ${p.sku} ${p.category} ${p.brand} ${p.barcode}`.toLowerCase().includes(term)
      )
    : products;

  const joined = await joinedMapGlobal();
  const scope = await listingScopeMap(filtered.map((p) => p.id));
  const data = filtered.map((p) => {
    const units = joined.get(p.id) ?? 0;
    return serializeProductRetail(p, {
      joined: units,
      communityIds: scope.get(p.id) ?? [],
      priceAtTier: priceForTier(p, tierIndexForJoined(units)),
    });
  });
  res.json({ data, categories: CATEGORIES });
});

// POST /products
router.post('/products', validate({ body: retailSchemas.createProduct }), async (req, res) => {
  const body = req.body || {};
  const data = pickProductFields(body);
  if (!data.name || !data.sku) return res.status(400).json({ error: 'sku and name are required' });
  const clash = await prisma.product.findUnique({ where: { sku: data.sku } });
  if (clash) return res.status(409).json({ error: `SKU ${data.sku} already exists` });

  const created = await prisma.product.create({
    data: {
      sku: data.sku,
      name: data.name,
      brand: data.brand ?? '',
      barcode: data.barcode ?? '',
      unit: data.unit ?? '1 pack',
      size: data.size ?? '',
      grossWeight: data.grossWeight ?? '',
      category: data.category ?? 'Grocery',
      details: data.details ?? '',
      cost: data.cost ?? 0,
      retailPrice: data.retailPrice ?? 0,
      price0: data.price0 ?? 0,
      price1: data.price1 ?? data.price0 ?? 0,
      price2: data.price2 ?? data.price0 ?? 0,
      price3: data.price3 ?? data.price0 ?? 0,
      imageSlot: data.imageSlot ?? data.name,
      imageUrl: data.imageUrl ?? null,
      active: body.active ?? false,
    },
  });
  const communityIds = await communityByCodes(body.communityIds ?? []);
  await setListingScope(created.id, communityIds);
  res.status(201).json(serializeProductRetail(created, { joined: 0, communityIds }));
});

// PATCH /products/:id  (accepts communityIds to set the listing scope)
router.patch('/products/:id', validate({ params: commonSchemas.idParam, body: retailSchemas.updateProduct }), async (req, res) => {
  const existing = await prisma.product.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: 'Product not found' });
  const body = req.body || {};
  const data = pickProductFields(body);
  if (data.sku && data.sku !== existing.sku) {
    const clash = await prisma.product.findUnique({ where: { sku: data.sku } });
    if (clash) return res.status(409).json({ error: `SKU ${data.sku} already exists` });
  }
  const updated = await prisma.product.update({ where: { id: existing.id }, data });
  if (Array.isArray(body.communityIds)) {
    await setListingScope(updated.id, await communityByCodes(body.communityIds));
  }
  const scope = await listingScopeMap([updated.id]);
  const joined = await joinedMapGlobal();
  res.json(
    serializeProductRetail(updated, {
      joined: joined.get(updated.id) ?? 0,
      communityIds: scope.get(updated.id) ?? [],
    })
  );
});

// DELETE /products/:id
router.delete('/products/:id', validate({ params: commonSchemas.idParam }), async (req, res) => {
  const existing = await prisma.product.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: 'Product not found' });
  const ordered = await prisma.orderLine.count({ where: { productId: existing.id } });
  if (ordered > 0) {
    // Residents have already bought it — delist rather than destroy their order history.
    const delisted = await prisma.product.update({ where: { id: existing.id }, data: { active: false } });
    await prisma.productCommunity.deleteMany({ where: { productId: existing.id } });
    return res.json({ ...delisted, deleted: false, delisted: true });
  }
  await prisma.pickLine.deleteMany({ where: { productId: existing.id } });
  await prisma.promotion.updateMany({ where: { productId: existing.id }, data: { productId: null } });
  await prisma.productCommunity.deleteMany({ where: { productId: existing.id } });
  await prisma.comment.deleteMany({ where: { productId: existing.id } });
  await prisma.splitParticipant.deleteMany({ where: { split: { productId: existing.id } } });
  await prisma.split.deleteMany({ where: { productId: existing.id } });
  await prisma.product.delete({ where: { id: existing.id } });
  res.json({ ...existing, deleted: true, delisted: false });
});

// POST /products/bulk { rows: [...] } — upsert on SKU, unknown SKUs created inactive.
router.post('/products/bulk', validate({ body: retailSchemas.bulk }), async (req, res) => {
  const rows: Row[] = Array.isArray(req.body?.rows) ? req.body.rows : [];
  if (!rows.length) return res.status(400).json({ error: 'rows must be a non-empty array' });

  const communities = await prisma.community.findMany();
  const codeToId = new Map<string, string>();
  for (const c of communities) {
    codeToId.set(c.code.toLowerCase(), c.id);
    codeToId.set(c.abbr.toLowerCase(), c.id);
    codeToId.set(c.name.toLowerCase(), c.id);
    codeToId.set(c.id.toLowerCase(), c.id);
  }

  let updated = 0;
  let created = 0;
  const skipped: string[] = [];

  for (const row of rows) {
    const sku = str(row, COLS.sku, '').trim();
    const name = str(row, COLS.name, '').trim();
    if (!sku && !name) continue;

    const existing = sku
      ? await prisma.product.findUnique({ where: { sku } })
      : await prisma.product.findFirst({ where: { name } });

    if (!existing && !sku) {
      skipped.push(name);
      continue;
    }

    const base = existing ?? {
      sku,
      name: name || 'Untitled line',
      brand: '',
      barcode: '',
      unit: '1 pack',
      size: '',
      grossWeight: '',
      category: 'Grocery',
      details: '',
      imageUrl: null as string | null,
      cost: 0,
      retailPrice: 0,
      price0: 0,
      price1: 0,
      price2: 0,
      price3: 0,
    };

    const image = str(row, COLS.image, '');
    const data = {
      sku: sku || (existing as Product).sku,
      name: str(row, COLS.name, base.name),
      brand: str(row, COLS.brand, base.brand),
      barcode: str(row, COLS.barcode, base.barcode),
      unit: str(row, COLS.pack, base.unit),
      size: str(row, COLS.size, base.size),
      grossWeight: str(row, COLS.weight, base.grossWeight),
      category: normaliseCategory(str(row, COLS.category, base.category), base.category),
      details: str(row, COLS.details, base.details),
      imageUrl: image.startsWith('http') || image.startsWith('data:') ? image : base.imageUrl,
      cost: intOr(row, COLS.cost, base.cost),
      retailPrice: intOr(row, COLS.retail, base.retailPrice),
      price0: intOr(row, COLS.base, base.price0),
      price1: intOr(row, COLS.tier20, base.price1),
      price2: intOr(row, COLS.tier50, base.price2),
      price3: intOr(row, COLS.tier100, base.price3),
    };

    let productId: string;
    if (existing) {
      await prisma.product.update({ where: { id: existing.id }, data });
      productId = existing.id;
      updated++;
    } else {
      const madeDraft = await prisma.product.create({
        data: { ...data, imageSlot: data.name, active: false }, // unknown SKUs land as drafts
      });
      productId = madeDraft.id;
      created++;
    }

    const commsRaw = str(row, COLS.communities, '');
    if (commsRaw) {
      const ids = splitList(commsRaw)
        .map((token) => codeToId.get(token.toLowerCase()))
        .filter((x): x is string => !!x);
      await setListingScope(productId, ids);
    }
  }

  res.json({ updated, created, skipped, total: rows.length });
});

// ---------------------------------------------------------------------------
// Promotions
// ---------------------------------------------------------------------------

function parseDate(value: unknown, fallback: Date): Date {
  if (value === undefined || value === null || value === '') return fallback;
  const raw = String(value).trim();
  const direct = new Date(raw);
  if (!Number.isNaN(direct.getTime())) return direct;
  // The design writes windows as "19 Aug" — assume the current cycle's year.
  const loose = new Date(`${raw} ${new Date().getFullYear()}`);
  if (!Number.isNaN(loose.getTime())) return loose;
  return fallback;
}

router.get('/promotions', async (req, res) => {
  const promos = await prisma.promotion.findMany({ include: PROMO_INCLUDE, orderBy: { createdAt: 'desc' } });
  res.json({ data: promos.map((p) => serializePromotion(p)), mechanics: PROMO_MECHANICS });
});

router.post('/promotions', validate({ body: retailSchemas.createPromotion }), async (req, res) => {
  const b = req.body || {};
  if (!b.name || !b.value) return res.status(400).json({ error: 'name and value are required' });
  const mechanic = String(b.mechanic ?? 'percent');
  if (!PROMO_MECHANICS.includes(mechanic as any)) {
    return res.status(400).json({ error: `mechanic must be one of ${PROMO_MECHANICS.join(', ')}` });
  }
  const now = new Date();
  const created = await prisma.promotion.create({
    data: {
      name: String(b.name),
      mechanic,
      value: String(b.value),
      productId: b.productId ?? null,
      startsAt: parseDate(b.startsAt, now),
      endsAt: parseDate(b.endsAt, new Date(now.getTime() + 7 * 24 * 3600 * 1000)),
      live: b.live ?? true,
      uptakeNote: b.uptakeNote ?? 'just published',
    },
  });
  await setPromotionScope(created.id, await communityByCodes(b.communityIds ?? []));
  const full = await prisma.promotion.findUnique({ where: { id: created.id }, include: PROMO_INCLUDE });
  res.status(201).json(serializePromotion(full));
});

router.patch('/promotions/:id', validate({ params: commonSchemas.idParam, body: retailSchemas.updatePromotion }), async (req, res) => {
  const existing = await prisma.promotion.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: 'Promotion not found' });
  const b = req.body || {};
  if (b.mechanic !== undefined && !PROMO_MECHANICS.includes(b.mechanic)) {
    return res.status(400).json({ error: `mechanic must be one of ${PROMO_MECHANICS.join(', ')}` });
  }
  await prisma.promotion.update({
    where: { id: existing.id },
    data: {
      ...(b.name !== undefined ? { name: String(b.name) } : {}),
      ...(b.mechanic !== undefined ? { mechanic: String(b.mechanic) } : {}),
      ...(b.value !== undefined ? { value: String(b.value) } : {}),
      ...(b.productId !== undefined ? { productId: b.productId || null } : {}),
      ...(b.startsAt !== undefined ? { startsAt: parseDate(b.startsAt, existing.startsAt) } : {}),
      ...(b.endsAt !== undefined ? { endsAt: parseDate(b.endsAt, existing.endsAt) } : {}),
      ...(b.live !== undefined ? { live: !!b.live } : {}),
      ...(b.uptakeNote !== undefined ? { uptakeNote: String(b.uptakeNote) } : {}),
    },
  });
  if (Array.isArray(b.communityIds)) {
    await setPromotionScope(existing.id, await communityByCodes(b.communityIds));
  }
  const full = await prisma.promotion.findUnique({ where: { id: existing.id }, include: PROMO_INCLUDE });
  res.json(serializePromotion(full));
});

// POST /promotions/bulk — imported promotions land paused, per the design.
router.post('/promotions/bulk', validate({ body: retailSchemas.bulk }), async (req, res) => {
  const rows: Row[] = Array.isArray(req.body?.rows) ? req.body.rows : [];
  if (!rows.length) return res.status(400).json({ error: 'rows must be a non-empty array' });
  const now = new Date();
  let created = 0;
  for (const row of rows) {
    const name = str(row, COLS.promoName, '');
    if (!name) continue;
    const mechanicRaw = str(row, COLS.mechanic, 'percent').toLowerCase();
    const mechanic = (PROMO_MECHANICS as readonly string[]).includes(mechanicRaw) ? mechanicRaw : 'percent';
    const itemName = str(row, ['item'], '');
    const product = itemName ? await prisma.product.findFirst({ where: { name: itemName } }) : null;
    const promo = await prisma.promotion.create({
      data: {
        name,
        mechanic,
        value: str(row, COLS.value, ''),
        productId: product?.id ?? null,
        startsAt: parseDate(get(row, COLS.from), now),
        endsAt: parseDate(get(row, COLS.to), new Date(now.getTime() + 7 * 24 * 3600 * 1000)),
        live: false,
        uptakeNote: 'not started',
      },
    });
    const ids = await communityByCodes(splitList(str(row, COLS.communities, '')));
    await setPromotionScope(promo.id, ids);
    created++;
  }
  res.json({ created, total: rows.length });
});

// ---------------------------------------------------------------------------
// Fulfilment
// ---------------------------------------------------------------------------

router.get('/fulfilment/:communityId', validate({ params: retailSchemas.communityParam }), async (req, res) => {
  const community = await resolveCommunity(req.params.communityId);
  if (!community) return res.status(404).json({ error: 'Community not found' });
  const run = await ensureRun(community);
  const lines = await ensurePickLines(run.id, community.id);

  const rows = lines.map((l) => {
    const tierIndex = tierIndexForJoined(l.orderedQty);
    const price = priceForTier(l.product, tierIndex);
    const picked = l.pickedQty;
    return {
      id: l.id,
      productId: l.productId,
      sku: l.product.sku,
      name: l.product.name,
      unit: l.product.unit,
      orderedQty: l.orderedQty,
      pickedQty: picked,
      variance: picked === null ? null : picked - l.orderedQty,
      tier: TIER_SHORT[tierIndex],
      cases: Math.ceil(l.orderedQty / 12),
      lineValue: price * (picked ?? l.orderedQty),
      lineMargin: (price - l.product.cost) * (picked ?? l.orderedQty),
    };
  });

  const shortLines = rows.filter((r) => r.pickedQty !== null && r.pickedQty < r.orderedQty).length;
  const summary = {
    lines: rows.length,
    unitsOrdered: rows.reduce((a, r) => a + r.orderedQty, 0),
    unitsPicked: rows.reduce((a, r) => a + (r.pickedQty ?? 0), 0),
    shortLines,
    dropValue: rows.reduce((a, r) => a + r.lineValue, 0),
    dropMargin: rows.reduce((a, r) => a + r.lineMargin, 0),
  };

  res.json({
    run,
    stage: run.stage,
    stages: STAGE_LIST.map((s, i) => ({
      ...s,
      index: i,
      current: s.key === run.stage,
      done: i <= STAGE_KEYS.indexOf(run.stage),
    })),
    community: serializeCommunity(community),
    lines: rows,
    summary,
  });
});

// PATCH /fulfilment/:communityId/lines { lines: [{productId|sku, pickedQty}] }
router.patch('/fulfilment/:communityId/lines', validate({ params: retailSchemas.communityParam, body: retailSchemas.pickLines }), async (req, res) => {
  const community = await resolveCommunity(req.params.communityId);
  if (!community) return res.status(404).json({ error: 'Community not found' });
  const incoming = Array.isArray(req.body?.lines) ? req.body.lines : [];
  if (!incoming.length) return res.status(400).json({ error: 'lines must be a non-empty array' });

  const run = await ensureRun(community);
  await ensurePickLines(run.id, community.id);

  let updated = 0;
  const unmatched: string[] = [];
  for (const line of incoming) {
    const product = line.productId
      ? await prisma.product.findUnique({ where: { id: String(line.productId) } })
      : line.sku
      ? await prisma.product.findUnique({ where: { sku: String(line.sku) } })
      : null;
    if (!product) {
      unmatched.push(String(line.productId ?? line.sku ?? '?'));
      continue;
    }
    const picked = line.pickedQty === null || line.pickedQty === undefined ? null : Math.round(num(line.pickedQty));
    await prisma.pickLine.upsert({
      where: { fulfilmentRunId_productId: { fulfilmentRunId: run.id, productId: product.id } },
      create: { fulfilmentRunId: run.id, productId: product.id, orderedQty: 0, pickedQty: picked },
      update: { pickedQty: picked },
    });
    updated++;
  }
  res.json({ updated, unmatched, runId: run.id });
});

// POST /fulfilment/:communityId/advance
router.post('/fulfilment/:communityId/advance', validate({ params: retailSchemas.communityParam }), async (req, res) => {
  const community = await resolveCommunity(req.params.communityId);
  if (!community) return res.status(404).json({ error: 'Community not found' });
  const run = await ensureRun(community);
  const target = req.body?.stage ? String(req.body.stage) : null;
  if (target && !STAGE_KEYS.includes(target)) {
    return res.status(400).json({ error: `stage must be one of ${STAGE_KEYS.join(', ')}` });
  }
  const nextStage = target ?? STAGE_KEYS[Math.min(STAGE_KEYS.length - 1, STAGE_KEYS.indexOf(run.stage) + 1)];
  const updated = await prisma.fulfilmentRun.update({ where: { id: run.id }, data: { stage: nextStage } });

  // Resident-visible order stages follow the drop.
  if (nextStage === 'packed') {
    await prisma.order.updateMany({
      where: { communityId: community.id, status: 'placed' },
      data: { status: 'packing', packingAt: new Date() },
    });
  }
  if (nextStage === 'dispatched') {
    await prisma.order.updateMany({
      where: { communityId: community.id, status: { in: ['placed', 'packing'] } },
      data: { status: 'ready', readyAt: new Date() },
    });
  }

  res.json({
    run: updated,
    stage: updated.stage,
    stageLabel: STAGE_LIST.find((s) => s.key === updated.stage)?.label ?? updated.stage,
  });
});

// ---------------------------------------------------------------------------
// Cycles & accounts
// ---------------------------------------------------------------------------

router.get('/cycles', async (req, res) => {
  const communities = await prisma.community.findMany({ orderBy: { name: 'asc' } });
  const data = [];
  for (const c of communities) {
    const run = await ensureRun(c);
    const households = await prisma.user.count({ where: { communityId: c.id } });
    const activeLogins = await prisma.user.count({ where: { communityId: c.id, accountState: 'active' } });
    const orders = await prisma.order.count({ where: { communityId: c.id } });
    const offices = await prisma.adminUser.findMany({
      where: { role: 'office', communityId: c.id },
      select: { id: true, username: true, displayName: true, email: true },
    });
    const units = await prisma.orderLine.aggregate({
      where: { order: { communityId: c.id } },
      _sum: { qty: true },
    });
    data.push(
      serializeCommunity(c, {
        households,
        activeLogins,
        orders,
        unitsOnSheet: units._sum.qty ?? 0,
        stage: run.stage,
        offices,
      })
    );
  }
  res.json({ data });
});

router.patch('/cycles/:communityId', validate({ params: retailSchemas.communityParam, body: retailSchemas.updateCycle }), async (req, res) => {
  const community = await resolveCommunity(req.params.communityId);
  if (!community) return res.status(404).json({ error: 'Community not found' });
  const b = req.body || {};
  const updated = await prisma.community.update({
    where: { id: community.id },
    data: {
      ...(b.cutoffDate !== undefined ? { cutoffDate: new Date(b.cutoffDate), cutoffAt: new Date(b.cutoffDate) } : {}),
      ...(b.deliveryDate !== undefined ? { deliveryDate: new Date(b.deliveryDate) } : {}),
      ...(b.collectPoint !== undefined ? { collectPoint: String(b.collectPoint) } : {}),
      ...(b.collectionWindow !== undefined ? { collectionWindow: String(b.collectionWindow) } : {}),
      ...(b.contractStatus !== undefined ? { contractStatus: String(b.contractStatus) } : {}),
    },
  });
  res.json(serializeCommunity(updated));
});

// POST /cycles/:communityId/publish — opens the next cycle for residents.
router.post('/cycles/:communityId/publish', validate({ params: retailSchemas.communityParam }), async (req, res) => {
  const community = await resolveCommunity(req.params.communityId);
  if (!community) return res.status(404).json({ error: 'Community not found' });

  const cycleNo = community.cycleNo + 1;
  const updated = await prisma.community.update({
    where: { id: community.id },
    data: { cycleNo, isOpen: true },
  });
  await prisma.fulfilmentRun.upsert({
    where: { communityId_cycleNo: { communityId: community.id, cycleNo } },
    create: { communityId: community.id, cycleNo, stage: 'open' },
    update: { stage: 'open' },
  });
  const households = await prisma.user.count({ where: { communityId: community.id } });
  const announcement = await prisma.alert.create({
    data: {
      communityId: community.id,
      title: `Cycle ${cycleNo} sheet is open`,
      body: `Orders are open until cutoff. Collection at ${updated.collectPoint}, ${updated.collectionWindow}.`,
      ctaLabel: 'Open the shop',
      ctaType: 'cart',
      isDraft: false,
      reachCount: households,
    },
  });
  await prisma.activity.create({
    data: { communityId: community.id, text: `Cycle ${cycleNo} sheet published by Capital Retail` },
  });
  res.json({ community: serializeCommunity(updated), announcement });
});

// ---------------------------------------------------------------------------
// Resident demand
// ---------------------------------------------------------------------------

router.get('/demand', async (req, res) => {
  const items = await prisma.wishlist.findMany({ include: { votes: true, community: true } });
  const byName = new Map<string, any>();
  for (const w of items) {
    const key = w.name.toLowerCase();
    const row = byName.get(key) ?? {
      id: w.id,
      wishlistIds: [] as string[],
      name: w.name,
      note: w.note,
      votes: 0,
      households: 0,
      communities: [] as string[],
      addedToCatalog: false,
    };
    row.wishlistIds.push(w.id);
    row.votes += w.votes.length;
    row.households += w.householdCount || w.votes.length;
    if (!row.communities.includes(w.community.name)) row.communities.push(w.community.name);
    row.addedToCatalog = row.addedToCatalog || w.addedToCatalog;
    byName.set(key, row);
  }
  const data = [...byName.values()].sort((a, b) => b.votes - a.votes);
  res.json({
    data,
    stats: {
      requests: data.length,
      votes: data.reduce((a, r) => a + r.votes, 0),
      converted: data.filter((r) => r.addedToCatalog).length,
    },
  });
});

// POST /demand/:id/add-to-catalog — creates a draft line residents cannot see yet.
router.post('/demand/:id/add-to-catalog', validate({ params: commonSchemas.idParam }), async (req, res) => {
  const wish = await prisma.wishlist.findUnique({ where: { id: req.params.id } });
  if (!wish) return res.status(404).json({ error: 'Wishlist item not found' });

  const sku = `NEW-${String(Date.now()).slice(-4)}`;
  const product = await prisma.product.create({
    data: {
      sku,
      name: wish.name,
      unit: '1 pack',
      category: 'Grocery',
      details: wish.note,
      cost: 0,
      retailPrice: 0,
      price0: 0,
      price1: 0,
      price2: 0,
      price3: 0,
      imageSlot: wish.name,
      active: false, // draft: set spec, cost and tiers before it goes on a sheet
    },
  });
  await prisma.wishlist.updateMany({ where: { name: wish.name }, data: { addedToCatalog: true } });
  const joined = 0;
  res.status(201).json({
    wishlistId: wish.id,
    product: serializeProductRetail(product, { joined, communityIds: [] }),
  });
});

export default router;
