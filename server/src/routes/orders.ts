import { createRouter } from '../lib/asyncRouter';
import { prisma } from '../lib/prisma';
import { requireUser } from '../middleware/auth';
import { basketPromotions, priceProduct, promotionsForProduct } from '../lib/pricing';
import { promotionsForCommunity } from '../lib/catalog';
import { validate } from '../lib/validate';
import { commonSchemas, shopSchemas } from '../lib/schemas';

const router = createRouter();

const ORDER_INCLUDE = {
  lines: { include: { product: true } },
} as const;

function withTotal(order: any) {
  const total = order.lines.reduce((sum: number, l: any) => sum + l.unitPrice * l.qty, 0);
  return { ...order, total };
}

async function joinedMapForCommunity(communityId: string): Promise<Map<string, number>> {
  const grouped = await prisma.orderLine.groupBy({
    by: ['productId'],
    where: { order: { communityId } },
    _sum: { qty: true },
  });
  const map = new Map<string, number>();
  for (const g of grouped) map.set(g.productId, g._sum.qty ?? 0);
  return map;
}

async function nextOrderCode(communityId: string, abbr: string): Promise<string> {
  const count = await prisma.order.count({ where: { communityId } });
  return `${abbr}-${2000 + count + 1}`;
}

// POST /api/orders
router.post('/', requireUser, validate({ body: shopSchemas.createOrder }), async (req, res) => {
  const { lines, paymentMethod, note } = req.body || {};
  if (!Array.isArray(lines) || lines.length === 0) {
    return res.status(400).json({ error: 'lines must be a non-empty array' });
  }
  if (!['mmqr', 'collection'].includes(paymentMethod)) {
    return res.status(400).json({ error: 'paymentMethod must be "mmqr" or "collection"' });
  }

  const community = req.user!.community;
  const joinedMap = await joinedMapForCommunity(community.id);

  const productIds = lines.map((l: any) => l.productId);
  // Listing scope: only products listed at this community can be ordered here.
  const products = await prisma.product.findMany({
    where: { id: { in: productIds }, listedAt: { some: { communityId: community.id } } },
  });
  const productById = new Map(products.map((p) => [p.id, p]));

  for (const line of lines) {
    if (!productById.has(line.productId)) {
      return res.status(400).json({ error: `Product is not listed at ${community.label}: ${line.productId}` });
    }
    if (!Number.isInteger(line.qty) || line.qty <= 0) {
      return res.status(400).json({ error: 'Each line qty must be a positive integer' });
    }
  }

  const promos = await promotionsForCommunity(community.id);
  const code = await nextOrderCode(community.id, community.abbr);

  const order = await prisma.order.create({
    data: {
      code,
      communityId: community.id,
      userId: req.user!.id,
      status: 'placed',
      paymentMethod,
      paid: false,
      note: note ?? null,
      placedAt: new Date(),
      collectLabel: community.deliveryLabel,
      lines: {
        create: lines.map((line: any) => {
          const product = productById.get(line.productId)!;
          const joined = joinedMap.get(product.id) ?? 0;
          // Promotion-adjusted price, clamped so a promo can only ever lower it.
          const priced = priceProduct(product, joined, promotionsForProduct(product.id, promos));
          return {
            productId: product.id,
            qty: line.qty,
            unitPrice: priced.price,
            tierIndex: priced.tierIndex,
          };
        }),
      },
    },
    include: ORDER_INCLUDE,
  });

  res.status(201).json({ ...withTotal(order), basketPromotions: basketPromotions(promos) });
});

// GET /api/orders?query=&filter=all|awaiting|ready|collected|unpaid&sort=new|old|big
router.get('/', requireUser, validate({ query: shopSchemas.orderQuery }), async (req, res) => {
  const { query, filter, sort } = req.query as { query?: string; filter?: string; sort?: string };

  const where: any = { userId: req.user!.id };
  if (query) where.code = { contains: query, mode: 'insensitive' };
  if (filter === 'awaiting') where.status = { in: ['placed', 'packing'] };
  else if (filter === 'ready') where.status = 'ready';
  else if (filter === 'collected') where.status = 'collected';
  else if (filter === 'unpaid') where.paid = false;

  const orders = await prisma.order.findMany({
    where,
    include: ORDER_INCLUDE,
    orderBy: { placedAt: 'desc' },
  });

  let result = orders.map(withTotal);

  if (sort === 'old') result.sort((a, b) => a.placedAt.getTime() - b.placedAt.getTime());
  else if (sort === 'big') result.sort((a, b) => b.total - a.total);
  else result.sort((a, b) => b.placedAt.getTime() - a.placedAt.getTime()); // 'new' / default

  res.json({ data: result });
});

// GET /api/orders/:id
router.get('/:id', requireUser, validate({ params: commonSchemas.idParam }), async (req, res) => {
  const order = await prisma.order.findUnique({ where: { id: req.params.id }, include: ORDER_INCLUDE });
  if (!order || order.userId !== req.user!.id) return res.status(404).json({ error: 'Order not found' });
  res.json(withTotal(order));
});

// POST /api/orders/:id/pay
router.post('/:id/pay', requireUser, validate({ params: commonSchemas.idParam }), async (req, res) => {
  const existing = await prisma.order.findUnique({ where: { id: req.params.id } });
  if (!existing || existing.userId !== req.user!.id) return res.status(404).json({ error: 'Order not found' });

  const order = await prisma.order.update({
    where: { id: req.params.id },
    data: { paid: true },
    include: ORDER_INCLUDE,
  });

  res.json(withTotal(order));
});

export default router;
