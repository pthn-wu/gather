import { createRouter } from '../lib/asyncRouter';
import { prisma } from '../lib/prisma';
import { requireUser } from '../middleware/auth';
import { serializeAnnouncement } from '../lib/serialize';
import { CATEGORIES, basketPromotions } from '../lib/pricing';
import { promotionsForCommunity } from '../lib/catalog';
import { validate } from '../lib/validate';
import { commonSchemas, shopSchemas } from '../lib/schemas';

const router = createRouter();

function serializeWishlist(w: any, userId: string) {
  return {
    id: w.id,
    communityId: w.communityId,
    name: w.name,
    note: w.note,
    votes: w.votes.length,
    voted: w.votes.some((v: any) => v.userId === userId),
    addedToCatalog: w.addedToCatalog,
    householdCount: w.householdCount,
  };
}

function serializeSplit(s: any, userId: string) {
  return {
    id: s.id,
    communityId: s.communityId,
    productId: s.productId,
    product: s.product,
    initiatorName: s.initiatorName,
    detail: s.detail,
    neededCount: s.neededCount,
    joinedCount: s.participants.length,
    joined: s.participants.some((p: any) => p.userId === userId),
  };
}

// GET /api/wishlist
router.get('/wishlist', requireUser, async (req, res) => {
  const items = await prisma.wishlist.findMany({
    where: { communityId: req.user!.communityId },
    include: { votes: true },
    orderBy: { id: 'asc' },
  });
  res.json({ data: items.map((w) => serializeWishlist(w, req.user!.id)) });
});

// POST /api/wishlist
router.post('/wishlist', requireUser, validate({ body: shopSchemas.wishlist }), async (req, res) => {
  const { name, note } = req.body || {};
  if (!name) return res.status(400).json({ error: 'name is required' });
  const created = await prisma.wishlist.create({
    data: { communityId: req.user!.communityId, name, note: note ?? '' },
    include: { votes: true },
  });
  res.status(201).json(serializeWishlist(created, req.user!.id));
});

// POST /api/wishlist/:id/vote (toggle)
router.post('/wishlist/:id/vote', requireUser, validate({ params: commonSchemas.idParam }), async (req, res) => {
  const wishlist = await prisma.wishlist.findUnique({ where: { id: req.params.id } });
  if (!wishlist || wishlist.communityId !== req.user!.communityId) {
    return res.status(404).json({ error: 'Wishlist item not found' });
  }
  const existingVote = await prisma.wishlistVote.findUnique({
    where: { wishlistId_userId: { wishlistId: wishlist.id, userId: req.user!.id } },
  });
  if (existingVote) {
    await prisma.wishlistVote.delete({ where: { id: existingVote.id } });
  } else {
    await prisma.wishlistVote.create({ data: { wishlistId: wishlist.id, userId: req.user!.id } });
  }
  const updated = await prisma.wishlist.findUnique({ where: { id: wishlist.id }, include: { votes: true } });
  // householdCount is the stored form of "how many households asked for this".
  await prisma.wishlist.update({ where: { id: wishlist.id }, data: { householdCount: updated!.votes.length } });
  res.json(serializeWishlist({ ...updated, householdCount: updated!.votes.length }, req.user!.id));
});

// GET /api/splits
router.get('/splits', requireUser, async (req, res) => {
  const items = await prisma.split.findMany({
    where: { communityId: req.user!.communityId },
    include: { participants: true, product: true },
    orderBy: { id: 'asc' },
  });
  res.json({ data: items.map((s) => serializeSplit(s, req.user!.id)) });
});

// POST /api/splits
router.post('/splits', requireUser, validate({ body: shopSchemas.split }), async (req, res) => {
  const { productId, detail, neededCount } = req.body || {};
  if (!productId || !detail || !Number.isInteger(neededCount)) {
    return res.status(400).json({ error: 'productId, detail and neededCount are required' });
  }
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) return res.status(400).json({ error: 'Unknown productId' });

  const created = await prisma.split.create({
    data: {
      communityId: req.user!.communityId,
      productId,
      initiatorName: req.user!.displayName,
      detail,
      neededCount,
    },
    include: { participants: true, product: true },
  });
  res.status(201).json(serializeSplit(created, req.user!.id));
});

// POST /api/splits/:id/join (toggle)
router.post('/splits/:id/join', requireUser, validate({ params: commonSchemas.idParam }), async (req, res) => {
  const split = await prisma.split.findUnique({ where: { id: req.params.id } });
  if (!split || split.communityId !== req.user!.communityId) {
    return res.status(404).json({ error: 'Split not found' });
  }
  const existingParticipant = await prisma.splitParticipant.findUnique({
    where: { splitId_userId: { splitId: split.id, userId: req.user!.id } },
  });
  if (existingParticipant) {
    await prisma.splitParticipant.delete({ where: { id: existingParticipant.id } });
  } else {
    await prisma.splitParticipant.create({ data: { splitId: split.id, userId: req.user!.id } });
  }
  const updated = await prisma.split.findUnique({
    where: { id: split.id },
    include: { participants: true, product: true },
  });
  res.json(serializeSplit(updated, req.user!.id));
});

// GET /api/activity
router.get('/activity', requireUser, async (req, res) => {
  const items = await prisma.activity.findMany({
    where: { communityId: req.user!.communityId },
    include: { user: true },
    orderBy: { createdAt: 'desc' },
  });
  res.json({
    data: items.map((a) => ({
      id: a.id,
      communityId: a.communityId,
      userId: a.userId,
      user: a.user
        ? { id: a.user.id, displayName: a.user.displayName, block: a.user.block, unit: a.user.unit, avatarIndex: a.user.avatarIndex }
        : null,
      text: a.text,
      createdAt: a.createdAt,
    })),
  });
});

// GET /api/alerts — the resident "Updates" feed. Published announcements only:
// office drafts must never leave the back office.
router.get('/alerts', requireUser, async (req, res) => {
  const items = await prisma.alert.findMany({
    where: { communityId: req.user!.communityId, isDraft: false },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ data: items.map(serializeAnnouncement) });
});

// GET /api/categories — the seven v2 categories with live counts for this
// community. Mirrors /api/products/categories; both paths exist because the web
// and mobile clients each reach for one of them.
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

// GET /api/promotions — basket-wide promotions (bundle / threshold) live at this
// resident's community. Per-line promos already ride along on /api/products;
// these are the ones the shop and cart surface as a banner.
router.get('/promotions', requireUser, async (req, res) => {
  const promos = await promotionsForCommunity(req.user!.communityId);
  res.json({ data: basketPromotions(promos) });
});

export default router;
