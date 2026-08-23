// Shared types mirroring CONTRACT.md v2's data model + computed API fields.
//
// Rule for this file: everything the v2 back office added is declared
// **optional** on the resident-facing types. The backend is migrating to v2
// concurrently, so the app must render correctly against a v1 payload and
// light up progressively as the new fields appear.
//
// `cost` / `margin` are deliberately absent — margin confidentiality is a hard
// rule and the server never sends them to a resident token.

export interface Community {
  id: string;
  name: string;
  label: string;
  abbr: string;
  address: string;
  householdsCount: number;
  cycleNo: number;
  isOpen: boolean;
  // present on the resident-scoped community object (returned from /auth/me)
  code?: string;
  collectPoint?: string;
  /** v1 field — kept as the fallback for `cutoffDate`. */
  cutoffAt?: string;
  /** v1 field — kept as the fallback for `deliveryDate`. */
  deliveryLabel?: string;

  // ---- v2: edited by the property office in Cycle setup ----
  /** ISO date/datetime the current cycle closes. */
  cutoffDate?: string;
  /** ISO date of the drop. */
  deliveryDate?: string;
  /** e.g. "6–9pm" */
  collectionWindow?: string;
  contractStatus?: 'Signed' | 'Pilot' | 'Lapsed' | string;
  blocksCovered?: string;
  officeContact?: string;
  weightFactor?: number;
}

export type AccountState = 'none' | 'issued' | 'active' | 'suspended';

export interface User {
  id: string;
  communityId: string;
  username: string;
  displayName: string;
  block: string;
  unit: string;
  verified: boolean;
  avatarIndex: number;
  avatarPhoto: string | null;
  mustSetPassword?: boolean;

  // ---- v2: roster / verification record ----
  phone?: string | null;
  accountState?: AccountState;
  /** ISO date the office issued/activated the login. */
  memberSince?: string | null;
  /** Pre-composed "A #14-07" from the roster, when the office keeps one. */
  blockUnit?: string | null;
}

export interface ProductProgress {
  next: number | null;
  unitsToNext: number | null;
}

export type PromotionMechanic = 'tier' | 'percent' | 'bundle' | 'threshold';

/**
 * A promotion the server actually applied to a line price. `mechanic` is
 * always `tier` or `percent` here — `bundle`/`threshold` are basket-wide and
 * surface through {@link BasketPromotion} instead.
 */
export interface AppliedPromotion {
  id: string;
  name: string;
  mechanic: PromotionMechanic;
  /** Human-readable, straight off the promotion record ("10%", "Unlock 50+ at 20"). */
  value: string;
}

/** A `bundle` / `threshold` promotion — shown as a banner and a cart line. */
export interface BasketPromotion {
  id: string;
  name: string;
  mechanic: PromotionMechanic;
  value: string;
  /** Product name / "Basket total" — what the promotion is written against. */
  scope?: string | null;
  startsAt?: string | null;
  endsAt?: string | null;
}

export interface Product {
  id: string;
  name: string;
  unit: string;
  category: string;
  retailPrice: number;
  price0: number;
  price1: number;
  price2: number;
  price3: number;
  imageSlot: string;
  imageUrl: string | null;
  active: boolean;
  joined: number;
  tierIndex: number;
  /** Effective price for this resident — promotion-adjusted by the server. */
  price: number;
  savePct: number;
  progress: ProductProgress;

  // ---- v2: merchandising record written in the retail console ----
  sku?: string;
  brand?: string | null;
  barcode?: string | null;
  size?: string | null;
  grossWeight?: string | null;
  /** Long resident-facing paragraph. */
  details?: string | null;

  // ---- v2: promotions ----
  /** Set when a per-line promotion lowered `price`. */
  promotion?: AppliedPromotion | null;
  /** Tier price before the promotion, when one applied. Never lower than `price`. */
  basePrice?: number | null;

  // ---- v2: listing scope (ProductCommunity) ----
  /** Communities this product is listed at. Absent = the server already scoped it. */
  communityIds?: string[];
}

export interface ProductTier {
  index: number;
  label: string;
  price: number;
  unlocked: boolean;
}

export interface ProductComment {
  id: string;
  productId: string;
  userId: string;
  text: string;
  createdAt: string;
  authorName?: string;
  authorUnit?: string;
  authorAvatarIndex?: number;
  authorAvatarPhoto?: string | null;
}

export interface ProductDetail extends Product {
  tiers: ProductTier[];
  comments: ProductComment[];
}

export type OrderStatus = 'placed' | 'packing' | 'ready' | 'collected';
export type PaymentMethod = 'mmqr' | 'collection';
/** Fulfilment stages the back office advances (FulfilmentRun.stage). */
export type FulfilmentStage = 'open' | 'confirmed' | 'picking' | 'packed' | 'dispatched';

export interface OrderLine {
  id: string;
  orderId: string;
  productId: string;
  qty: number;
  unitPrice: number;
  tierIndex: number;
  product?: Product;
  /** Promotion the server applied when the line was priced. */
  promotion?: AppliedPromotion | null;
}

export interface Order {
  id: string;
  code: string;
  communityId: string;
  userId: string;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  paid: boolean;
  note: string | null;
  placedAt: string;
  packingAt: string | null;
  readyAt: string | null;
  collectedAt: string | null;
  collectLabel: string;
  lines: OrderLine[];

  // ---- v2 ----
  /** Who actually picked the order up, recorded on the collection sheet. */
  collectedBy?: string | null;
  /** Set when the office marks paid / reconciles the payment. */
  paidAt?: string | null;
  /** Fulfilment run stage for this community's cycle, when the server sends it. */
  fulfilmentStage?: FulfilmentStage | null;
}

export interface Wishlist {
  id: string;
  communityId: string;
  name: string;
  note: string;
  votes: number;
  votedByMe: boolean;
  /** v2: the retail console pulled this onto the catalog. */
  addedToCatalog?: boolean;
  householdCount?: number;
}

export interface Split {
  id: string;
  communityId: string;
  productId: string;
  initiatorName: string;
  detail: string;
  neededCount: number;
  joinedCount: number;
  joinedByMe: boolean;
  product?: Product;
}

export interface Activity {
  id: string;
  communityId: string;
  userId: string | null;
  text: string;
  createdAt: string;
}

export interface Alert {
  id: string;
  communityId: string;
  title: string;
  body: string;
  ctaLabel: string;
  ctaType: 'orders' | 'product' | 'cart';
  ctaRef: string | null;
  createdAt: string;
  // ---- v2: announcements written in the office console ----
  /** Residents must never see a draft. */
  isDraft?: boolean;
  authorAdminId?: string | null;
  reachCount?: number;
  openedCount?: number;
}
