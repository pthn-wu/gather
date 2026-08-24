import { createRouter } from '../lib/asyncRouter';
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma';
import { officeCommunityId, requireAdmin } from '../middleware/auth';
import { serializeAnnouncement, serializeCommunity, serializeRosterUser } from '../lib/serialize';
import { COLS, Row, boolish, num, str } from '../lib/importRows';
import { validate } from '../lib/validate';
import { commonSchemas, officeSchemas } from '../lib/schemas';

const router = createRouter();

/**
 * The property-office console. Every route is scoped to the admin's own community —
 * `officeCommunityId(req)` is the only community id this router ever trusts, so a
 * Gems 2 office token cannot read or write Gems 1 rows even by passing an id.
 *
 * Margin confidentiality: nothing here assembles cost or margin, and the global
 * confidentiality guard scrubs the response anyway (src/lib/confidential.ts).
 */
router.use(requireAdmin('office'));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ORDER_INCLUDE = { lines: { include: { product: true } }, user: true } as const;

function orderTotal(order: { lines: { unitPrice: number; qty: number }[] }): number {
  return order.lines.reduce((sum, l) => sum + l.unitPrice * l.qty, 0);
}

/** The row shape every office order table renders. */
function serializeOfficeOrder(order: any) {
  const total = orderTotal(order);
  return {
    id: order.id,
    code: order.code,
    communityId: order.communityId,
    unit: order.user ? `${order.user.block} #${order.user.unit}` : '—',
    householdName: order.user?.displayName ?? 'Unknown resident',
    itemsLabel: order.lines.map((l: any) => l.product?.name ?? 'Item').join(', '),
    itemCount: order.lines.length,
    total,
    stage: order.status,
    paid: order.paid,
    paymentMethod: order.paymentMethod,
    collectedBy: order.collectedBy ?? null,
    placedAt: order.placedAt,
    collectLabel: order.collectLabel,
  };
}

/** A readable temp password for a printed credential slip, e.g. "gems-4471". */
function makeTempPassword(prefix: string): string {
  return `${prefix.toLowerCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
}

/** Username from a display name, de-duplicated against what already exists. */
async function uniqueUsername(displayName: string, abbr: string): Promise<string> {
  const base =
    displayName
      .toLowerCase()
      .replace(/[^a-z\s]/g, '')
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .join('.') || 'resident';
  let candidate = `${base}.${abbr.toLowerCase()}`;
  let n = 1;
  // eslint-disable-next-line no-await-in-loop
  while (await prisma.user.findUnique({ where: { username: candidate } })) {
    n += 1;
    candidate = `${base}${n}.${abbr.toLowerCase()}`;
  }
  return candidate;
}

// ---------------------------------------------------------------------------
// Verification queue
// ---------------------------------------------------------------------------

router.get('/verifications', async (req, res) => {
  const communityId = officeCommunityId(req);
  const rows = await prisma.verificationRequest.findMany({
    where: { communityId, status: 'pending' },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ data: rows });
});

router.get('/verifications/log', async (req, res) => {
  const communityId = officeCommunityId(req);
  const rows = await prisma.verificationRequest.findMany({
    where: { communityId, status: { not: 'pending' } },
    orderBy: { resolvedAt: 'desc' },
    take: 20,
  });
  res.json({
    data: rows.map((r) => ({
      id: r.id,
      text: r.resolutionNote || `${r.status} — ${r.name} · ${r.unit}`,
      when: r.resolvedAt,
      tone: r.status === 'approved' ? 'ok' : r.status === 'held' ? 'warn' : 'bad',
    })),
  });
});

/**
 * Approving a claim is the ONLY way a resident account comes into existence
 * outside the roster — it creates the User with a temp password and returns the
 * slip the office hands over. There is no SMS or email channel anywhere in Gather.
 */
router.post('/verifications/:id/approve', validate({ params: commonSchemas.idParam }), async (req, res) => {
  const communityId = officeCommunityId(req);
  const request = await prisma.verificationRequest.findUnique({ where: { id: req.params.id } });
  if (!request || request.communityId !== communityId) {
    return res.status(404).json({ error: 'Verification request not found' });
  }
  if (request.status !== 'pending') {
    return res.status(409).json({ error: 'That request has already been handled' });
  }

  const community = await prisma.community.findUnique({ where: { id: communityId } });
  const tempPassword = makeTempPassword(community?.abbr ?? 'gems');
  const username = await uniqueUsername(request.name, community?.abbr ?? 'g');
  // "A #06-10" -> block "A", unit "06-10"
  const match = /^\s*([A-Za-z0-9]+)?\s*#?\s*(.+?)\s*$/.exec(request.unit);
  const block = match?.[1] ?? '';
  const unit = (match?.[2] ?? request.unit).replace(/^#/, '');

  const user = await prisma.user.create({
    data: {
      communityId,
      username,
      passwordHash: await bcrypt.hash(tempPassword, 10),
      mustSetPassword: true,
      displayName: request.name,
      block,
      unit,
      blockUnit: request.unit,
      phone: request.phone,
      verified: true, // the office verifying the unit IS the verification
      accountState: 'issued',
      tempPassword,
    },
  });

  await prisma.verificationRequest.update({
    where: { id: request.id },
    data: {
      status: 'approved',
      resolvedAt: new Date(),
      resolutionNote: `Approved ${request.name} · ${request.unit} · account issued`,
    },
  });

  res.json({ user: serializeRosterUser(user as any), credentials: { username, tempPassword } });
});

router.post('/verifications/:id/hold', validate({ params: commonSchemas.idParam }), async (req, res) => {
  const communityId = officeCommunityId(req);
  const request = await prisma.verificationRequest.findUnique({ where: { id: req.params.id } });
  if (!request || request.communityId !== communityId) {
    return res.status(404).json({ error: 'Verification request not found' });
  }
  const updated = await prisma.verificationRequest.update({
    where: { id: request.id },
    data: {
      status: 'held',
      resolvedAt: new Date(),
      resolutionNote: `Asked ${request.name} for proof on ${request.unit}`,
    },
  });
  res.json(updated);
});

router.post('/verifications/:id/reject', validate({ params: commonSchemas.idParam, body: officeSchemas.rejectVerification }), async (req, res) => {
  const communityId = officeCommunityId(req);
  const request = await prisma.verificationRequest.findUnique({ where: { id: req.params.id } });
  if (!request || request.communityId !== communityId) {
    return res.status(404).json({ error: 'Verification request not found' });
  }
  const updated = await prisma.verificationRequest.update({
    where: { id: request.id },
    data: {
      status: 'rejected',
      resolvedAt: new Date(),
      resolutionNote: req.body?.reason || `Rejected claim on ${request.unit}`,
    },
  });
  res.json(updated);
});

// ---------------------------------------------------------------------------
// Household roster
// ---------------------------------------------------------------------------

router.get('/roster', validate({ query: officeSchemas.rosterQuery }), async (req, res) => {
  const communityId = officeCommunityId(req);
  const q = String(req.query.q ?? '').trim().toLowerCase();
  const rows = await prisma.user.findMany({
    where: { communityId },
    include: { _count: { select: { orders: true } } },
    orderBy: [{ block: 'asc' }, { unit: 'asc' }],
  });
  const filtered = q
    ? rows.filter((r) =>
        `${r.block} ${r.unit} ${r.displayName} ${r.username} ${r.phone ?? ''}`.toLowerCase().includes(q)
      )
    : rows;
  res.json({ data: filtered.map((r) => serializeRosterUser(r as any)) });
});

/** Add a roster row. No login yet — accountState "none" until accounts are issued. */
router.post('/roster', validate({ body: officeSchemas.createHousehold }), async (req, res) => {
  const communityId = officeCommunityId(req);
  const { displayName, block, unit, phone } = req.body || {};
  if (!displayName || !unit) {
    return res.status(400).json({ error: 'displayName and unit are required' });
  }
  const community = await prisma.community.findUnique({ where: { id: communityId } });
  const username = await uniqueUsername(displayName, community?.abbr ?? 'g');
  const user = await prisma.user.create({
    data: {
      communityId,
      username,
      // Unusable until an account is actually issued.
      passwordHash: await bcrypt.hash(`unset-${Date.now()}-${Math.random()}`, 10),
      mustSetPassword: true,
      displayName,
      block: block ?? '',
      unit: String(unit).replace(/^#/, ''),
      blockUnit: `${block ?? ''} #${String(unit).replace(/^#/, '')}`.trim(),
      phone: phone ?? null,
      verified: false,
      accountState: 'none',
    },
  });
  res.status(201).json(serializeRosterUser(user as any));
});

router.patch('/roster/:id', validate({ params: commonSchemas.idParam, body: officeSchemas.updateHousehold }), async (req, res) => {
  const communityId = officeCommunityId(req);
  const existing = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!existing || existing.communityId !== communityId) {
    return res.status(404).json({ error: 'Household not found' });
  }
  const { displayName, block, unit, phone, verified } = req.body || {};
  const data: any = {};
  if (displayName !== undefined) data.displayName = displayName;
  if (block !== undefined) data.block = block;
  if (unit !== undefined) data.unit = String(unit).replace(/^#/, '');
  if (phone !== undefined) data.phone = phone;
  if (verified !== undefined) data.verified = !!verified;
  if (data.block !== undefined || data.unit !== undefined) {
    data.blockUnit = `${data.block ?? existing.block} #${data.unit ?? existing.unit}`.trim();
  }
  const user = await prisma.user.update({ where: { id: existing.id }, data });
  res.json(serializeRosterUser(user as any));
});

/** Import target "roster" — columns Unit, Household, Phone. Existing units update. */
router.post('/roster/bulk', validate({ body: officeSchemas.bulk }), async (req, res) => {
  const communityId = officeCommunityId(req);
  const rows: Row[] = Array.isArray(req.body?.rows) ? req.body.rows : [];
  if (!rows.length) return res.status(400).json({ error: 'rows must be a non-empty array' });
  const community = await prisma.community.findUnique({ where: { id: communityId } });
  const existing = await prisma.user.findMany({ where: { communityId } });

  let created = 0;
  let updated = 0;
  for (const row of rows) {
    const rawUnit = str(row, COLS.unit, '').trim();
    if (!rawUnit) continue;
    const displayName = str(row, COLS.household, '').trim() || 'Household';
    const phone = str(row, COLS.phone, '').trim() || null;
    const m = /^\s*([A-Za-z0-9]+)?\s*#?\s*(.+?)\s*$/.exec(rawUnit);
    const block = m?.[1] ?? '';
    const unit = (m?.[2] ?? rawUnit).replace(/^#/, '');

    const hit = existing.find((u) => u.block === block && u.unit === unit);
    if (hit) {
      // eslint-disable-next-line no-await-in-loop
      await prisma.user.update({
        where: { id: hit.id },
        data: { displayName, phone, blockUnit: `${block} #${unit}`.trim() },
      });
      updated += 1;
    } else {
      // eslint-disable-next-line no-await-in-loop
      await prisma.user.create({
        data: {
          communityId,
          // eslint-disable-next-line no-await-in-loop
          username: await uniqueUsername(displayName, community?.abbr ?? 'g'),
          // eslint-disable-next-line no-await-in-loop
          passwordHash: await bcrypt.hash(`unset-${Date.now()}-${Math.random()}`, 10),
          mustSetPassword: true,
          displayName,
          block,
          unit,
          blockUnit: `${block} #${unit}`.trim(),
          phone,
          verified: false,
          accountState: 'none',
        },
      });
      created += 1;
    }
  }
  res.json({ created, updated });
});

/** Bulk-issue logins + temp passwords. Returns the credential slips to print. */
router.post('/roster/issue-accounts', validate({ body: officeSchemas.issueAccounts }), async (req, res) => {
  const communityId = officeCommunityId(req);
  const ids: string[] = Array.isArray(req.body?.userIds) ? req.body.userIds : [];
  if (!ids.length) return res.status(400).json({ error: 'userIds must be a non-empty array' });
  const community = await prisma.community.findUnique({ where: { id: communityId } });
  const users = await prisma.user.findMany({ where: { id: { in: ids }, communityId } });

  const slips: { userId: string; displayName: string; unit: string; username: string; tempPassword: string }[] = [];
  for (const user of users) {
    const tempPassword = makeTempPassword(community?.abbr ?? 'gems');
    // eslint-disable-next-line no-await-in-loop
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: await bcrypt.hash(tempPassword, 10),
        tempPassword,
        mustSetPassword: true,
        accountState: 'issued',
        verified: true,
      },
    });
    slips.push({
      userId: user.id,
      displayName: user.displayName,
      unit: `${user.block} #${user.unit}`.trim(),
      username: user.username,
      tempPassword,
    });
  }
  res.json({ data: slips });
});

router.post('/roster/:id/reset-password', validate({ params: commonSchemas.idParam, body: officeSchemas.resetPassword }), async (req, res) => {
  const communityId = officeCommunityId(req);
  const user = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!user || user.communityId !== communityId) {
    return res.status(404).json({ error: 'Household not found' });
  }
  const community = await prisma.community.findUnique({ where: { id: communityId } });
  const tempPassword = req.body?.tempPassword || makeTempPassword(community?.abbr ?? 'gems');
  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash: await bcrypt.hash(tempPassword, 10),
      tempPassword,
      mustSetPassword: true,
      accountState: user.accountState === 'none' ? 'issued' : user.accountState,
    },
  });
  res.json({ username: user.username, tempPassword });
});

router.post('/roster/:id/suspend', validate({ params: commonSchemas.idParam, body: officeSchemas.suspend }), async (req, res) => {
  const communityId = officeCommunityId(req);
  const user = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!user || user.communityId !== communityId) {
    return res.status(404).json({ error: 'Household not found' });
  }
  const suspend = req.body?.suspend !== false;
  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { accountState: suspend ? 'suspended' : 'active' },
  });
  res.json(serializeRosterUser(updated as any));
});

// ---------------------------------------------------------------------------
// Orders
// ---------------------------------------------------------------------------

router.get('/orders', validate({ query: officeSchemas.ordersQuery }), async (req, res) => {
  const communityId = officeCommunityId(req);
  const filter = String(req.query.filter ?? 'all');
  const where: any = { communityId };
  if (filter === 'open') where.status = { not: 'collected' };
  else if (filter === 'collected') where.status = 'collected';
  else if (filter === 'due') where.paid = false;

  const orders = await prisma.order.findMany({
    where,
    include: ORDER_INCLUDE,
    orderBy: { placedAt: 'desc' },
  });
  res.json({ data: orders.map(serializeOfficeOrder) });
});

// ---------------------------------------------------------------------------
// Collection sheet
// ---------------------------------------------------------------------------

/** Orders that have physically arrived: anything past packing. */
router.get('/collection', async (req, res) => {
  const communityId = officeCommunityId(req);
  const orders = await prisma.order.findMany({
    where: { communityId, status: { in: ['packing', 'ready', 'collected'] } },
    include: ORDER_INCLUDE,
    orderBy: { code: 'asc' },
  });
  const rows = orders.map(serializeOfficeOrder);
  const collected = rows.filter((r) => r.stage === 'collected');
  const expectedCash = rows.filter((r) => !r.paid).reduce((a, r) => a + r.total, 0);
  res.json({
    stats: {
      expected: rows.length,
      collected: collected.length,
      outstanding: rows.length - collected.length,
      expectedCash,
    },
    data: rows,
  });
});

/** Tick households off the sheet — by id, or by order code from an imported sheet. */
router.post('/collection/tick', validate({ body: officeSchemas.tick }), async (req, res) => {
  const communityId = officeCommunityId(req);
  const { orderIds, orderCodes, collected = true, collectedBy } = req.body || {};

  const where: any = { communityId };
  if (Array.isArray(orderIds) && orderIds.length) where.id = { in: orderIds };
  else if (Array.isArray(orderCodes) && orderCodes.length) where.code = { in: orderCodes };
  else return res.status(400).json({ error: 'Pass orderIds or orderCodes' });

  const orders = await prisma.order.findMany({ where });
  for (const order of orders) {
    // eslint-disable-next-line no-await-in-loop
    await prisma.order.update({
      where: { id: order.id },
      data: collected
        ? { status: 'collected', collectedAt: new Date(), collectedBy: collectedBy ?? 'Household' }
        : { status: 'ready', collectedAt: null, collectedBy: null },
    });
  }
  res.json({ updated: orders.length });
});

/** Import target "collect" — columns Order, Collected (yes/no). */
router.post('/collection/bulk-tick', validate({ body: officeSchemas.bulk }), async (req, res) => {
  const communityId = officeCommunityId(req);
  const rows: Row[] = Array.isArray(req.body?.rows) ? req.body.rows : [];
  if (!rows.length) return res.status(400).json({ error: 'rows must be a non-empty array' });

  let updated = 0;
  for (const row of rows) {
    const code = str(row, COLS.order, '').trim();
    if (!code) continue;
    const isCollected = boolish(row[Object.keys(row).find((k) => COLS.collected.includes(k.toLowerCase().replace(/[^a-z]/g, ''))) ?? '']);
    // eslint-disable-next-line no-await-in-loop
    const order = await prisma.order.findFirst({ where: { code, communityId } });
    if (!order) continue;
    // eslint-disable-next-line no-await-in-loop
    await prisma.order.update({
      where: { id: order.id },
      data: isCollected
        ? { status: 'collected', collectedAt: new Date(), collectedBy: 'Household' }
        : { status: 'ready', collectedAt: null, collectedBy: null },
    });
    updated += 1;
  }
  res.json({ updated });
});

/** Close the drop: everything still uncollected is recorded as a no-show. */
router.post('/collection/close', async (req, res) => {
  const communityId = officeCommunityId(req);
  const stragglers = await prisma.order.findMany({
    where: { communityId, status: { in: ['packing', 'ready'] } },
  });
  res.json({
    closed: true,
    collectedCount: await prisma.order.count({ where: { communityId, status: 'collected' } }),
    notCollected: stragglers.map((o) => o.code),
  });
});

// ---------------------------------------------------------------------------
// Payments & cash-up
// ---------------------------------------------------------------------------

router.get('/payments', async (req, res) => {
  const communityId = officeCommunityId(req);
  const orders = await prisma.order.findMany({
    where: { communityId },
    include: ORDER_INCLUDE,
    orderBy: { placedAt: 'desc' },
  });
  const rows = orders.map(serializeOfficeOrder);
  res.json({
    data: rows,
    summary: {
      paid: rows.filter((r) => r.paid).reduce((a, r) => a + r.total, 0),
      due: rows.filter((r) => !r.paid).reduce((a, r) => a + r.total, 0),
      dueCount: rows.filter((r) => !r.paid).length,
    },
  });
});

router.post('/payments/:orderId/mark-paid', validate({ params: commonSchemas.orderIdParam, body: officeSchemas.markPaid }), async (req, res) => {
  const communityId = officeCommunityId(req);
  const order = await prisma.order.findUnique({ where: { id: req.params.orderId } });
  if (!order || order.communityId !== communityId) {
    return res.status(404).json({ error: 'Order not found' });
  }
  const updated = await prisma.order.update({
    where: { id: order.id },
    data: { paid: true, paymentMethod: req.body?.method ?? order.paymentMethod },
    include: ORDER_INCLUDE,
  });
  res.json(serializeOfficeOrder(updated));
});

/** Import target "payments" — columns Order, Amount, Method. Matched orders go paid. */
router.post('/payments/bulk-reconcile', validate({ body: officeSchemas.bulk }), async (req, res) => {
  const communityId = officeCommunityId(req);
  const rows: Row[] = Array.isArray(req.body?.rows) ? req.body.rows : [];
  if (!rows.length) return res.status(400).json({ error: 'rows must be a non-empty array' });

  const matched: string[] = [];
  const unmatched: string[] = [];
  for (const row of rows) {
    const code = str(row, COLS.order, '').trim();
    if (!code) continue;
    // eslint-disable-next-line no-await-in-loop
    const order = await prisma.order.findFirst({
      where: { code, communityId },
      include: ORDER_INCLUDE,
    });
    if (!order) {
      unmatched.push(code);
      continue;
    }
    const amount = num(row[Object.keys(row).find((k) => COLS.amount.includes(k.toLowerCase().replace(/[^a-z]/g, ''))) ?? '']);
    const total = orderTotal(order);
    // Only settle when the bank line actually covers the order.
    if (amount && amount + 1 < total) {
      unmatched.push(code);
      continue;
    }
    // eslint-disable-next-line no-await-in-loop
    await prisma.order.update({
      where: { id: order.id },
      data: { paid: true, paymentMethod: str(row, COLS.method, order.paymentMethod) },
    });
    matched.push(code);
  }
  res.json({ reconciled: matched.length, matched, unmatched });
});

router.get('/cashup', async (req, res) => {
  const communityId = officeCommunityId(req);
  const community = await prisma.community.findUnique({ where: { id: communityId } });
  const due = await prisma.order.findMany({
    where: { communityId, paid: false, status: { in: ['ready', 'collected'] } },
    include: ORDER_INCLUDE,
  });
  const expectedAmount = due.reduce((a, o) => a + orderTotal(o), 0);
  const last = await prisma.cashUp.findFirst({
    where: { communityId, cycleNo: community?.cycleNo ?? 0 },
    orderBy: { submittedAt: 'desc' },
  });
  res.json({
    expectedAmount,
    countedAmount: last?.countedAmount ?? null,
    variance: last?.variance ?? 0,
    submittedAt: last?.submittedAt ?? null,
    dueCount: due.length,
  });
});

router.post('/cashup', validate({ body: officeSchemas.cashup }), async (req, res) => {
  const communityId = officeCommunityId(req);
  const community = await prisma.community.findUnique({ where: { id: communityId } });
  const countedAmount = Math.round(num(req.body?.countedAmount));
  const due = await prisma.order.findMany({
    where: { communityId, paid: false, status: { in: ['ready', 'collected'] } },
    include: ORDER_INCLUDE,
  });
  const expectedAmount = due.reduce((a, o) => a + orderTotal(o), 0);
  const record = await prisma.cashUp.create({
    data: {
      communityId,
      cycleNo: community?.cycleNo ?? 0,
      expectedAmount,
      countedAmount,
      variance: countedAmount - expectedAmount,
      submittedBy: req.admin!.displayName,
    },
  });
  res.status(201).json(record);
});

// ---------------------------------------------------------------------------
// Cycle setup — what residents see for cutoff, collection point and window
// ---------------------------------------------------------------------------

router.get('/setup', async (req, res) => {
  const communityId = officeCommunityId(req);
  const community = await prisma.community.findUnique({ where: { id: communityId } });
  if (!community) return res.status(404).json({ error: 'Community not found' });
  const households = await prisma.user.count({ where: { communityId } });
  res.json(serializeCommunity(community, { households }));
});

router.patch('/setup', validate({ body: officeSchemas.updateSetup }), async (req, res) => {
  const communityId = officeCommunityId(req);
  const { collectPoint, collectionWindow, cutoffDate, deliveryDate, blocksCovered, officeContact } =
    req.body || {};
  const data: any = {};
  if (collectPoint !== undefined) data.collectPoint = collectPoint;
  if (collectionWindow !== undefined) data.collectionWindow = collectionWindow;
  if (blocksCovered !== undefined) data.blocksCovered = blocksCovered;
  if (officeContact !== undefined) data.officeContact = officeContact;
  if (cutoffDate !== undefined) {
    data.cutoffDate = new Date(cutoffDate);
    // The resident countdown reads cutoffAt — keep them in step.
    data.cutoffAt = new Date(cutoffDate);
  }
  if (deliveryDate !== undefined) {
    const d = new Date(deliveryDate);
    data.deliveryDate = d;
    data.deliveryLabel = d.toLocaleDateString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'short',
    });
  }

  const community = await prisma.community.update({ where: { id: communityId }, data });
  const households = await prisma.user.count({ where: { communityId } });

  // "Save and notify residents" — the change lands in the resident Updates feed.
  if (Object.keys(data).length) {
    await prisma.alert.create({
      data: {
        communityId,
        title: 'Collection details updated',
        body: `Collection is at ${community.collectPoint}, ${community.collectionWindow}. Cutoff and delivery day are set for this cycle.`,
        ctaLabel: 'Review your order',
        ctaType: 'cart',
        isDraft: false,
        authorAdminId: req.admin!.id,
        reachCount: households,
      },
    });
  }

  res.json(serializeCommunity(community, { households }));
});

// ---------------------------------------------------------------------------
// Announcements
// ---------------------------------------------------------------------------

router.get('/announcements', async (req, res) => {
  const communityId = officeCommunityId(req);
  const rows = await prisma.alert.findMany({
    where: { communityId },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ data: rows.map(serializeAnnouncement) });
});

router.post('/announcements', validate({ body: officeSchemas.announcement }), async (req, res) => {
  const communityId = officeCommunityId(req);
  const { title, body, isDraft = false } = req.body || {};
  if (!title?.trim() || !body?.trim()) {
    return res.status(400).json({ error: 'title and body are required' });
  }
  const households = await prisma.user.count({ where: { communityId } });
  const alert = await prisma.alert.create({
    data: {
      communityId,
      title: title.trim(),
      body: body.trim(),
      ctaLabel: 'Open Gather',
      ctaType: 'none',
      isDraft: !!isDraft,
      authorAdminId: req.admin!.id,
      reachCount: isDraft ? 0 : households,
    },
  });
  res.status(201).json(serializeAnnouncement(alert));
});

router.patch('/announcements/:id', validate({ params: commonSchemas.idParam, body: officeSchemas.updateAnnouncement }), async (req, res) => {
  const communityId = officeCommunityId(req);
  const existing = await prisma.alert.findUnique({ where: { id: req.params.id } });
  if (!existing || existing.communityId !== communityId) {
    return res.status(404).json({ error: 'Announcement not found' });
  }
  const { title, body, isDraft } = req.body || {};
  const data: any = {};
  if (title !== undefined) data.title = title;
  if (body !== undefined) data.body = body;
  if (isDraft !== undefined) {
    data.isDraft = !!isDraft;
    // Publishing a draft is when it actually reaches households.
    if (existing.isDraft && !isDraft) {
      data.reachCount = await prisma.user.count({ where: { communityId } });
    }
  }
  const alert = await prisma.alert.update({ where: { id: existing.id }, data });
  res.json(serializeAnnouncement(alert));
});

export default router;
