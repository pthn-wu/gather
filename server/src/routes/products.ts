import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { requireUser } from '../middleware/auth';
import {
  CATEGORIES,
  basketPromotions,
  priceProduct,
  promotionsForProduct,
} from '../lib/pricing';
import { joinedMapForCommunity, promotionsForCommunity } from '../lib/catalog';
import { serializeProductPublic, tierLadder } from '../lib/serialize';
import { validate } from '../lib/validate';
import { commonSchemas, shopSchemas } from '../lib/schemas';

const router = Router();

// GET /api/products/categories — the seven v2 categories, with live counts for this community.
router.get('/categories', requireUser, async (req, res) => {
  const communityId = req.user!.communityId;
  const products = await prisma.product.findMany({
    where: { active: true, listedAt: { some: { communityId } } },
    select: { category: true },
  });
  const counts = new Map<string, number>();
  for (const p of products) counts.set(p.category, (counts.get(p.category) ?? 0) + 1);
  res.json({
    data: [
      { name: 'All', count: products.length },
      ...CATEGORIES.map((name) => ({ name, count: counts.get(name) ?? 0 })),
    ],
  });
});

// GET /api/products?category=&q=&sort=pop|price|save
router.get('/', requireUser, validate({ query: shopSchemas.productQuery }), async (req, res) => {
  const { category, q, sort } = req.query as { category?: string; q?: string; sort?: string };
  const communityId = req.user!.communityId;

  // Listing scope: a delisted-here product simply does not exist for this resident.
  const where: any = { active: true, listedAt: { some: { communityId } } };
  if (category && category !== 'All') where.category = category;
  if (q) where.name = { contains: q };

  const products = await prisma.product.findMany({ where, orderBy: { name: 'asc' } });
  const joinedMap = await joinedMapForCommunity(communityId);
  const promos = await promotionsForCommunity(communityId);

  let result = products.map((p) => {
    const joined = joinedMap.get(p.id) ?? 0;
    const priced = priceProduct(p, joined, promotionsForProduct(p.id, promos));
    return serializeProductPublic(p, priced, joined);
  });

  if (sort === 'pop') result.sort((a, b) => b.joined - a.joined);
  else if (sort === 'price') result.sort((a, b) => a.price - b.price);
  else if (sort === 'save') result.sort((a, b) => b.savePct - a.savePct);

  res.json({
    data: result,
    categories: ['All', ...CATEGORIES],
    // bundle / threshold promos are not applied per line — they are a shop banner
    // and a cart line, per CONTRACT.md.
    basketPromotions: basketPromotions(promos),
  });
});

// GET /api/products/:id
router.get('/:id', requireUser, async (req, res) => {
  const communityId = req.user!.communityId;
  const product = await prisma.product.findFirst({
    where: { id: req.params.id, listedAt: { some: { communityId } } },
  });
  if (!product) return res.status(404).json({ error: 'Product not found' });

  const joinedMap = await joinedMapForCommunity(communityId);
  const joined = joinedMap.get(product.id) ?? 0;
  const promos = await promotionsForCommunity(communityId);
  const priced = priceProduct(product, joined, promotionsForProduct(product.id, promos));

  const commentRows = await prisma.comment.findMany({
    where: { productId: product.id },
    include: { user: true },
    orderBy: { createdAt: 'asc' },
  });
  const comments = commentRows.map((c) => ({
    id: c.id,
    productId: c.productId,
    text: c.text,
    createdAt: c.createdAt,
    user: {
      id: c.user.id,
      displayName: c.user.displayName,
      block: c.user.block,
      unit: c.user.unit,
      avatarIndex: c.user.avatarIndex,
      avatarPhoto: c.user.avatarPhoto,
    },
  }));

  res.json({
    ...serializeProductPublic(product, priced, joined),
    tiers: tierLadder(product, joined),
    basketPromotions: basketPromotions(promos),
    comments,
  });
});

// POST /api/products/:id/comments
router.post('/:id/comments', requireUser, validate({ params: commonSchemas.idParam, body: shopSchemas.comment }), async (req, res) => {
  const { text } = req.body || {};
  if (!text || !text.trim()) return res.status(400).json({ error: 'text is required' });
  const product = await prisma.product.findUnique({ where: { id: req.params.id } });
  if (!product) return res.status(404).json({ error: 'Product not found' });

  const comment = await prisma.comment.create({
    data: { productId: product.id, userId: req.user!.id, text: text.trim() },
    include: { user: true },
  });

  res.status(201).json({
    id: comment.id,
    productId: comment.productId,
    text: comment.text,
    createdAt: comment.createdAt,
    user: {
      id: comment.user.id,
      displayName: comment.user.displayName,
      block: comment.user.block,
      unit: comment.user.unit,
      avatarIndex: comment.user.avatarIndex,
      avatarPhoto: comment.user.avatarPhoto,
    },
  });
});

export default router;
