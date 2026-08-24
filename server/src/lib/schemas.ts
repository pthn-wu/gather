/**
 * Request schemas, grouped by router. Every object is `.strict()` — unknown
 * keys are rejected outright so a client cannot smuggle a privileged field
 * (role, paid, cost, communityId…) into a body that a handler later spreads.
 */
import {
  accountState, anyPassword, avatarIndex, category, communityRef, contractStatus, countFrom0,
  contactRole, dataUrlImage, displayName, id, importRows, isoDate, longText, money, optionalEmail,
  password, paymentMethod, phone, promoMechanic, qty, searchTerm, shortText, username, z,
} from './validate';

const strict = <T extends z.ZodRawShape>(shape: T) => z.object(shape).strict();

// ---------------------------------------------------------------------------
// Public (unauthenticated)
// ---------------------------------------------------------------------------

export const publicSchemas = {
  /**
   * "Register interest" from the property picker. Unauthenticated, so every
   * field is bounded and the free-text note is short: this is the one write
   * path on the API that anyone at all can reach.
   *
   * `phone` is required rather than email — a Yangon property office is reached
   * by phone, and requiring an address people may not have would cost leads.
   */
  propertyEnquiry: strict({
    propertyName: displayName,
    township: displayName,
    address: shortText.optional(),
    householdCount: countFrom0,
    blockCount: countFrom0.optional(),
    contactName: displayName,
    contactRole,
    contactPhone: phone.refine((v) => v.replace(/\D/g, '').length >= 7, 'Enter a contact phone number'),
    contactEmail: optionalEmail.optional(),
    note: shortText.optional(),
  }),
};

// ---------------------------------------------------------------------------
// Resident auth
// ---------------------------------------------------------------------------

export const authSchemas = {
  login: strict({ username, password: anyPassword }),

  setup: strict({
    displayName,
    username,
    password, // policy enforced here — this is where a password is SET
    avatarIndex: avatarIndex.optional(),
    avatarPhoto: dataUrlImage.nullish(),
  }),

  profile: strict({
    displayName: displayName.optional(),
    username: username.optional(),
    avatarIndex: avatarIndex.optional(),
    avatarPhoto: dataUrlImage.nullish(),
  }).refine((v) => Object.keys(v).length > 0, 'Nothing to update'),

  password: strict({ password }),
};

// ---------------------------------------------------------------------------
// Shop / orders (resident)
// ---------------------------------------------------------------------------

export const shopSchemas = {
  productQuery: strict({
    category: category.optional(),
    q: searchTerm.optional(),
    sort: z.enum(['pop', 'price', 'save']).optional(),
  }),

  comment: strict({ text: z.string().trim().min(1, 'Say something').max(1000) }),

  createOrder: strict({
    lines: z
      .array(strict({ productId: id, qty }))
      .min(1, 'Your order is empty')
      .max(100, 'Too many lines in one order'),
    paymentMethod,
    note: shortText.optional().default(''),
  }),

  orderQuery: strict({
    query: searchTerm.optional(),
    filter: z.enum(['all', 'awaiting', 'ready', 'collected', 'unpaid']).optional(),
    sort: z.enum(['new', 'old', 'big']).optional(),
  }),

  wishlist: strict({ name: shortText.min(1, 'Name the item'), note: shortText.optional().default('') }),

  split: strict({
    productId: id,
    detail: shortText.optional().default(''),
    neededCount: z.coerce.number().int().min(1).max(20).optional().default(1),
  }),
};

// ---------------------------------------------------------------------------
// Back-office auth
// ---------------------------------------------------------------------------

export const adminAuthSchemas = {
  login: strict({
    username,
    password: anyPassword,
    communityId: communityRef.optional(),
  }),
};

// ---------------------------------------------------------------------------
// Retail console
// ---------------------------------------------------------------------------

/** Tier prices must descend: a deeper tier can never cost more. */
const tierPrices = {
  retailPrice: money.optional(),
  price0: money.optional(),
  price1: money.optional(),
  price2: money.optional(),
  price3: money.optional(),
};

const descending = (v: Record<string, unknown>) => {
  const p = [v.price0, v.price1, v.price2, v.price3].filter((x): x is number => typeof x === 'number');
  return p.every((x, i) => i === 0 || x <= p[i - 1]);
};

export const retailSchemas = {
  overviewQuery: strict({ scope: z.union([z.literal('all'), communityRef]).optional() }),

  productQuery: strict({ q: searchTerm.optional(), category: category.optional() }),

  createProduct: strict({
    sku: z.string().trim().min(1).max(40).regex(/^[A-Za-z0-9-]+$/, 'SKU: letters, numbers and dashes only'),
    name: shortText.min(1, 'Name the item'),
    brand: shortText.optional().default(''),
    barcode: z.string().trim().max(32).regex(/^[0-9]*$/, 'Barcode must be digits').optional().default(''),
    unit: shortText.min(1),
    size: shortText.optional().default(''),
    grossWeight: shortText.optional().default(''),
    category,
    details: longText.optional().default(''),
    cost: money,
    retailPrice: money,
    price0: money, price1: money, price2: money, price3: money,
    imageSlot: shortText.optional().default('product shot'),
    imageUrl: dataUrlImage.nullish(),
    active: z.boolean().optional().default(false),
    communityIds: z.array(communityRef).max(50).optional(),
  }).refine(descending, { message: 'Tier prices must not increase as volume rises', path: ['price1'] }),

  updateProduct: strict({
    sku: z.string().trim().min(1).max(40).regex(/^[A-Za-z0-9-]+$/).optional(),
    name: shortText.optional(),
    brand: shortText.optional(),
    barcode: z.string().trim().max(32).regex(/^[0-9]*$/).optional(),
    unit: shortText.optional(),
    size: shortText.optional(),
    grossWeight: shortText.optional(),
    category: category.optional(),
    details: longText.optional(),
    cost: money.optional(),
    imageSlot: shortText.optional(),
    imageUrl: dataUrlImage.nullish(),
    active: z.boolean().optional(),
    communityIds: z.array(communityRef).max(50).optional(),
    ...tierPrices,
  }).refine(descending, { message: 'Tier prices must not increase as volume rises', path: ['price1'] }),

  createPromotion: strict({
    name: shortText.min(1, 'Name the promotion'),
    mechanic: promoMechanic,
    value: shortText.min(1, 'Give the promotion a value'),
    productId: id.nullish(),
    communityIds: z.array(communityRef).min(1, 'Pick at least one community').max(50),
    startsAt: isoDate,
    endsAt: isoDate,
    live: z.boolean().optional().default(false),
    uptakeNote: shortText.optional().default('not started'),
  }).refine((v) => Date.parse(v.endsAt) >= Date.parse(v.startsAt), {
    message: 'End date must be on or after the start date', path: ['endsAt'],
  }),

  updatePromotion: strict({
    name: shortText.optional(),
    mechanic: promoMechanic.optional(),
    value: shortText.optional(),
    productId: id.nullish(),
    communityIds: z.array(communityRef).max(50).optional(),
    startsAt: isoDate.optional(),
    endsAt: isoDate.optional(),
    live: z.boolean().optional(),
    uptakeNote: shortText.optional(),
  }),

  communityParam: strict({ communityId: communityRef }),

  pickLines: strict({
    lines: z.array(strict({ productId: id, pickedQty: countFrom0 })).min(1).max(500),
  }),

  updateCycle: strict({
    cutoffDate: isoDate.optional(),
    deliveryDate: isoDate.optional(),
    collectPoint: shortText.optional(),
    collectionWindow: shortText.optional(),
    contractStatus: contractStatus.optional(),
  }),

  bulk: strict({ rows: importRows }),
};

// ---------------------------------------------------------------------------
// Office console
// ---------------------------------------------------------------------------

export const officeSchemas = {
  rosterQuery: strict({ q: searchTerm.optional() }),

  createHousehold: strict({
    displayName,
    block: z.string().trim().max(20).optional().default(''),
    unit: z.string().trim().min(1, 'A unit is required').max(20),
    phone: phone.optional(),
  }),

  updateHousehold: strict({
    displayName: displayName.optional(),
    block: z.string().trim().max(20).optional(),
    unit: z.string().trim().max(20).optional(),
    phone: phone.optional(),
    verified: z.boolean().optional(),
  }),

  issueAccounts: strict({ userIds: z.array(id).min(1, 'Select at least one household').max(500) }),

  resetPassword: strict({ tempPassword: z.string().trim().min(6).max(64).optional() }),

  suspend: strict({ suspend: z.boolean().optional() }),

  ordersQuery: strict({ filter: z.enum(['all', 'open', 'due', 'collected']).optional() }),

  tick: strict({
    orderIds: z.array(id).max(500).optional(),
    orderCodes: z.array(z.string().trim().max(40)).max(500).optional(),
    collected: z.boolean().optional().default(true),
    collectedBy: shortText.optional(),
  }).refine((v) => v.orderIds?.length || v.orderCodes?.length, 'Pass orderIds or orderCodes'),

  markPaid: strict({ method: paymentMethod.optional() }),

  cashup: strict({ countedAmount: money }),

  updateSetup: strict({
    collectPoint: shortText.optional(),
    collectionWindow: shortText.optional(),
    cutoffDate: isoDate.optional(),
    deliveryDate: isoDate.optional(),
    blocksCovered: shortText.optional(),
    officeContact: phone.optional(),
  }).refine((v) => Object.keys(v).length > 0, 'Nothing to update'),

  announcement: strict({
    title: shortText.min(1, 'Give it a headline'),
    body: longText.min(1, 'Write the announcement'),
    isDraft: z.boolean().optional().default(false),
  }),

  updateAnnouncement: strict({
    title: shortText.optional(),
    body: longText.optional(),
    isDraft: z.boolean().optional(),
  }),

  rejectVerification: strict({ reason: shortText.optional() }),

  bulk: strict({ rows: importRows }),
};

export const commonSchemas = {
  idParam: strict({ id }),
  orderIdParam: strict({ orderId: id }),
};
