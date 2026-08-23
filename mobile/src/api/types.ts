/**
 * Resident-facing shapes, per CONTRACT.md v2.
 *
 * `cost` and any margin figure are deliberately absent — the server strips them
 * for resident tokens (CONTRACT.md §1), so there is nothing to model here.
 */

export interface Community {
  id: string;
  name: string;
  label: string;
  abbr: string;
  code: string;
  address: string;
  collectPoint: string;
  collectionWindow?: string;
  cycleNo: number;
  isOpen: boolean;
  cutoffAt?: string;
  cutoffDate?: string;
  deliveryDate?: string;
  deliveryLabel?: string;
  householdsCount?: number;
}

export interface AppliedPromotion {
  id: string;
  name: string;
  mechanic: "tier" | "percent" | "bundle" | "threshold";
  value: string;
  productId: string | null;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  brand: string;
  barcode: string;
  unit: string;
  size: string;
  grossWeight: string;
  category: string;
  details: string;
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
  /** Tier price before any promotion. */
  basePrice: number;
  /** What the resident actually pays, promotion included. */
  price: number;
  savePct: number;
  promotion: AppliedPromotion | null;
  progress: { next: number | null; unitsToNext: number };
}

export interface ProductTier {
  index: number;
  label: string;
  price: number;
  unlocked: boolean;
}

export interface ProductComment {
  id: string;
  text: string;
  createdAt: string;
  authorName: string;
  authorUnit: string;
  authorAvatarIndex: number;
  authorAvatarPhoto: string | null;
}

export interface ProductDetail extends Product {
  tiers: ProductTier[];
  comments: ProductComment[];
}

export interface User {
  id: string;
  communityId: string;
  username: string;
  displayName: string;
  block: string;
  unit: string;
  blockUnit?: string;
  phone?: string | null;
  verified: boolean;
  accountState?: string;
  avatarIndex: number;
  avatarPhoto: string | null;
  mustSetPassword: boolean;
  memberSince?: string | null;
}

export type OrderStatus = "placed" | "packing" | "ready" | "collected";
export type PaymentMethod = "mmqr" | "collection";

export interface OrderLine {
  id: string;
  productId: string;
  qty: number;
  unitPrice: number;
  tierIndex: number;
  product?: { name: string; unit: string; retailPrice: number };
}

export interface Order {
  id: string;
  code: string;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  paid: boolean;
  note?: string | null;
  placedAt: string;
  packingAt?: string | null;
  readyAt?: string | null;
  collectedAt?: string | null;
  collectedBy?: string | null;
  collectLabel: string;
  total: number;
  lines: OrderLine[];
}

export interface Alert {
  id: string;
  title: string;
  body: string;
  ctaLabel: string;
  ctaType: "orders" | "product" | "cart" | "none";
  ctaRef?: string | null;
  isDraft: boolean;
  createdAt: string;
}

export interface Wishlist {
  id: string;
  name: string;
  note: string;
  votes: number;
  votedByMe: boolean;
}

export interface Split {
  id: string;
  productId: string;
  productName?: string;
  initiatorName: string;
  detail: string;
  neededCount: number;
  joinedByMe: boolean;
  participantCount: number;
}

export interface Activity {
  id: string;
  text: string;
  createdAt: string;
  user?: { displayName: string; avatarIndex: number } | null;
}

export interface Category {
  name: string;
  count: number;
}
