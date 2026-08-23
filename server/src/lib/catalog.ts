import { Product } from '@prisma/client';
import { prisma } from './prisma';
import { PromotionLike } from './pricing';

/** Units already on the sheet per product, in one community — drives the tier ladder. */
export async function joinedMapForCommunity(communityId: string): Promise<Map<string, number>> {
  const grouped = await prisma.orderLine.groupBy({
    by: ['productId'],
    where: { order: { communityId } },
    _sum: { qty: true },
  });
  const map = new Map<string, number>();
  for (const g of grouped) map.set(g.productId, g._sum.qty ?? 0);
  return map;
}

/** Units on the sheet per product across every community. */
export async function joinedMapGlobal(): Promise<Map<string, number>> {
  const grouped = await prisma.orderLine.groupBy({ by: ['productId'], _sum: { qty: true } });
  const map = new Map<string, number>();
  for (const g of grouped) map.set(g.productId, g._sum.qty ?? 0);
  return map;
}

/** The promotions attached to a community (live and not, callers filter on the window). */
export async function promotionsForCommunity(communityId: string): Promise<PromotionLike[]> {
  const rows = await prisma.promotion.findMany({
    where: { communities: { some: { communityId } } },
    orderBy: { createdAt: 'desc' },
  });
  return rows as PromotionLike[];
}

/** productId -> communityId[] listing scope. */
export async function listingScopeMap(productIds?: string[]): Promise<Map<string, string[]>> {
  const rows = await prisma.productCommunity.findMany({
    where: productIds ? { productId: { in: productIds } } : undefined,
    select: { productId: true, communityId: true },
  });
  const map = new Map<string, string[]>();
  for (const r of rows) {
    const list = map.get(r.productId) ?? [];
    list.push(r.communityId);
    map.set(r.productId, list);
  }
  return map;
}

/** Products listed at (orderable in) a community. */
export async function productsListedAt(
  communityId: string,
  where: Record<string, unknown> = {}
): Promise<Product[]> {
  return prisma.product.findMany({
    where: { ...where, listedAt: { some: { communityId } } },
    orderBy: { name: 'asc' },
  });
}

/** Replace a product's listing scope with exactly `communityIds`. */
export async function setListingScope(productId: string, communityIds: string[]) {
  await prisma.productCommunity.deleteMany({ where: { productId } });
  if (!communityIds.length) return;
  const valid = await prisma.community.findMany({ where: { id: { in: communityIds } }, select: { id: true } });
  await prisma.productCommunity.createMany({
    data: valid.map((c) => ({ productId, communityId: c.id })),
  });
}

/** Replace a promotion's community scope. */
export async function setPromotionScope(promotionId: string, communityIds: string[]) {
  await prisma.promotionCommunity.deleteMany({ where: { promotionId } });
  if (!communityIds.length) return;
  const valid = await prisma.community.findMany({ where: { id: { in: communityIds } }, select: { id: true } });
  await prisma.promotionCommunity.createMany({
    data: valid.map((c) => ({ promotionId, communityId: c.id })),
  });
}

/**
 * Communities can be addressed by id, by `code` (G1..G4) or by `abbr` — the design's
 * spreadsheets and the admin UI both speak codes, so resolve either.
 */
export async function resolveCommunity(idOrCode: string) {
  if (!idOrCode) return null;
  return prisma.community.findFirst({
    where: { OR: [{ id: idOrCode }, { code: idOrCode }, { abbr: idOrCode }, { name: idOrCode }] },
  });
}
