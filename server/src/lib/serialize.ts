import { AdminUser, Alert, Community, Product, User } from '@prisma/client';
import { AppliedPromotion, PricedProduct, TIER_LABELS, TIER_THRESHOLDS, progressFor } from './pricing';

// ---------------------------------------------------------------------------
// People
// ---------------------------------------------------------------------------

export function serializeUser(user: User) {
  const { passwordHash, tempPassword, ...rest } = user;
  return rest;
}

/** Roster view for the office console — the temp password IS the point of the slip. */
export function serializeRosterUser(user: User & { _count?: { orders: number } }) {
  const { passwordHash, ...rest } = user;
  return {
    ...rest,
    orderCount: user._count?.orders ?? 0,
  };
}

export function serializeAdmin(admin: AdminUser & { community?: Community | null }) {
  const { passwordHash, community, ...rest } = admin as any;
  return {
    ...rest,
    communityLabel: community?.label ?? null,
  };
}

// ---------------------------------------------------------------------------
// Community / cycle
// ---------------------------------------------------------------------------

export function serializeCommunity(c: Community, extra: Record<string, unknown> = {}) {
  return {
    id: c.id,
    name: c.name,
    label: c.label,
    abbr: c.abbr,
    code: c.code,
    address: c.address,
    collectPoint: c.collectPoint,
    collectionWindow: c.collectionWindow,
    cycleNo: c.cycleNo,
    isOpen: c.isOpen,
    cutoffAt: c.cutoffAt,
    cutoffDate: c.cutoffDate,
    deliveryDate: c.deliveryDate,
    deliveryLabel: c.deliveryLabel,
    contractStatus: c.contractStatus,
    blocksCovered: c.blocksCovered,
    officeContact: c.officeContact,
    weightFactor: c.weightFactor,
    ...extra,
  };
}

// ---------------------------------------------------------------------------
// Products
// ---------------------------------------------------------------------------

/**
 * The resident/office view of a product: the full merchandising record MINUS the
 * landed cost and every margin figure. `cost` is simply never assembled here — and
 * even if a future caller hands a raw Prisma row straight to res.json, the
 * confidentiality guard (src/lib/confidential.ts) strips it on the way out.
 */
export function serializeProductPublic(
  product: Product,
  priced: PricedProduct,
  joined: number,
  communityIds?: string[]
) {
  return {
    id: product.id,
    sku: product.sku,
    name: product.name,
    brand: product.brand,
    barcode: product.barcode,
    unit: product.unit,
    size: product.size,
    grossWeight: product.grossWeight,
    category: product.category,
    details: product.details,
    retailPrice: product.retailPrice,
    price0: product.price0,
    price1: product.price1,
    price2: product.price2,
    price3: product.price3,
    imageSlot: product.imageSlot,
    imageUrl: product.imageUrl,
    active: product.active,
    joined,
    tierIndex: priced.tierIndex,
    basePrice: priced.basePrice,
    price: priced.price,
    savePct: priced.savePct,
    promotion: priced.promotion,
    progress: progressFor(joined, priced.tierIndex),
    ...(communityIds ? { communityIds } : {}),
  };
}

/** The retail console view: everything, including landed cost and margin. */
export function serializeProductRetail(
  product: Product,
  opts: { joined: number; communityIds: string[]; priceAtTier?: number }
) {
  const price = opts.priceAtTier ?? product.price0;
  const marginPct = price > 0 ? Math.round((1 - product.cost / price) * 100) : 0;
  return {
    ...product,
    prices: [product.price0, product.price1, product.price2, product.price3],
    units: opts.joined,
    communityIds: opts.communityIds,
    price,
    margin: marginPct,
    marginPct,
    tierMargins: [product.price0, product.price1, product.price2, product.price3].map((p) =>
      p > 0 ? Math.round((1 - product.cost / p) * 100) : 0
    ),
  };
}

export function tierLadder(product: Product, joined: number) {
  return TIER_THRESHOLDS.map((threshold, index) => ({
    index,
    label: TIER_LABELS[index],
    price: [product.price0, product.price1, product.price2, product.price3][index],
    unlocked: joined >= threshold,
  }));
}

// ---------------------------------------------------------------------------
// Promotions / announcements
// ---------------------------------------------------------------------------

export function serializePromotion(
  promo: any,
  communityIds: string[] = promo.communities?.map((c: any) => c.communityId) ?? []
) {
  return {
    id: promo.id,
    name: promo.name,
    mechanic: promo.mechanic,
    value: promo.value,
    productId: promo.productId,
    productName: promo.product?.name ?? null,
    startsAt: promo.startsAt,
    endsAt: promo.endsAt,
    live: promo.live,
    uptakeNote: promo.uptakeNote,
    createdAt: promo.createdAt,
    communityIds,
  };
}

export function serializeAnnouncement(a: Alert) {
  return {
    id: a.id,
    communityId: a.communityId,
    title: a.title,
    body: a.body,
    ctaLabel: a.ctaLabel,
    ctaType: a.ctaType,
    ctaRef: a.ctaRef,
    isDraft: a.isDraft,
    authorAdminId: a.authorAdminId,
    reachCount: a.reachCount,
    openedCount: a.openedCount,
    createdAt: a.createdAt,
  };
}

export type { AppliedPromotion };
