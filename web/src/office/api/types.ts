/**
 * Types mirroring CONTRACT.md v2. List endpoints return `{ data: [...] }`,
 * single resources return the object, errors `{ error: string }`.
 *
 * Margin confidentiality: `cost` / `margin` are declared optional because an
 * `office` token never receives them — the server strips them in the
 * serializer, and no office screen reads them.
 */

export type AdminRole = "office" | "retail";

export interface AdminUser {
  id: string;
  role: AdminRole;
  /** Present only for role "office". */
  communityId: string | null;
  communityLabel?: string | null;
  displayName: string;
  username: string;
  email?: string | null;
  /** Optional multi-role grant; falls back to [role]. */
  roles?: AdminRole[];
}

export interface LoginResponse {
  token: string;
  admin: AdminUser;
}

export type ContractStatus = "Signed" | "Pilot" | "Lapsed";

export interface Community {
  id: string;
  /** Short key used across the design fixtures, e.g. "G1". */
  key?: string;
  name: string;
  short?: string;
  households: number;
  units?: number;
  cycleNo: number;
  cutoffDate: string;
  deliveryDate: string;
  collectPoint: string;
  collectionWindow: string;
  contractStatus: ContractStatus;
  blocksCovered?: string;
  officeContact?: string;
  weightFactor?: number;
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
  imageUrl: string | null;
  /** Retail console only — absent for office/resident tokens. */
  cost?: number;
  retailPrice: number;
  prices: [number, number, number, number];
  unitsThisCycle: number;
  active: boolean;
  /** Community ids/keys this product is listed at (ProductCommunity). */
  communityIds: string[];
}

export type PromotionMechanic = "tier" | "percent" | "bundle" | "threshold";

export interface Promotion {
  id: string;
  name: string;
  mechanic: PromotionMechanic;
  value: string;
  productId: string | null;
  /** Human-readable item label the design shows in the table. */
  itemLabel: string;
  communityIds: string[];
  startsAt: string;
  endsAt: string;
  live: boolean;
  uptakeNote: string;
}

export type FulfilmentStage = "open" | "confirmed" | "picking" | "packed" | "dispatched";

export interface PickLine {
  productId: string;
  sku: string;
  name: string;
  unit: string;
  orderedQty: number;
  pickedQty: number | null;
  /** Retail-only. */
  cost?: number;
  prices: [number, number, number, number];
}

export interface FulfilmentRun {
  communityId: string;
  cycleNo: number;
  stage: FulfilmentStage;
  lines: PickLine[];
}

export type AccountState = "none" | "issued" | "active" | "suspended";

export interface Household {
  id: string;
  unit: string;
  displayName: string;
  phone: string;
  accountState: AccountState;
  tempPassword: string | null;
  ordersCount: number;
  note: string;
}

export type VerificationKind = "New unit claim" | "Tenant change" | "Second login";

export interface VerificationRequest {
  id: string;
  name: string;
  unit: string;
  phone: string;
  kind: VerificationKind;
  rosterMatch: string;
  proof: string;
  requestedVia: string;
  note: string;
  createdAtLabel: string;
}

export interface VerificationLogEntry {
  text: string;
  when: string;
  tone: "ok" | "warn" | "bad";
}

export type OrderStage = "placed" | "packing" | "ready" | "collected";

export interface Order {
  id: string;
  code: string;
  communityId: string;
  unit: string;
  householdName: string;
  itemsLabel: string;
  total: number;
  stage: OrderStage;
  paid: boolean;
  paymentMethod: string;
  collectedBy?: string | null;
}

export interface WishlistRow {
  id: string;
  name: string;
  note: string;
  votes: number;
  householdCount: number;
  communitiesLabel: string;
  addedToCatalog: boolean;
}

export interface Announcement {
  id: string;
  title: string;
  body: string;
  when: string;
  reach: string;
  isDraft: boolean;
}

export interface CashUp {
  expectedAmount: number;
  countedAmount: number | null;
  variance: number;
}
