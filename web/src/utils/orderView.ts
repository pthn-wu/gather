import type { Community, FulfilmentStage, Order, OrderStatus } from '../api/types';
import { money } from './format';
import { formatDate, formatDateTime } from './dates';
import { collectionLine } from './cycle';

// The resident timeline stays four stages (CONTRACT.md §4.7). What changed in
// v2 is where those stages come from: the office and retail consoles advance
// the order, and the fulfilment run behind it, so nothing here is simulated.

const STAGE: Record<OrderStatus, number> = { placed: 0, packing: 1, ready: 2, collected: 3 };
const STATUS_LABEL: Record<OrderStatus, string> = { placed: 'Order in', packing: 'Packing', ready: 'Ready', collected: 'Collected' };
const STAGE_LABELS = ['Order placed', 'Packed by Capital Retail', 'Ready at collection point', 'Received by you'];

/**
 * How the retail console's fulfilment stage reads to a resident. Used only to
 * sharpen the middle step's label — the four resident stages are unchanged.
 */
const FULFILMENT_LABEL: Record<FulfilmentStage, string> = {
  open: 'Order placed',
  confirmed: 'Confirmed with Capital Retail',
  picking: 'Being picked at Capital Retail',
  packed: 'Packed by Capital Retail',
  dispatched: 'On its way to your block',
};

export interface OrderRowView {
  order: Order;
  code: string;
  placedLabel: string;
  status: string;
  statusFg: string;
  when: string;
  received: boolean;
  due: boolean;
  paid: boolean;
  total: number;
  summary: string;
  itemNote: string;
  payLabel: string;
  payFg: string;
  actLabel: string;
  actShort: string;
  actIsPay: boolean;
  stops: { border: string; bg: string; line: string }[];
  /** Where and when this order is collected, per the office's current setup. */
  collectLine: string;
}

function itemName(l: Order['lines'][number]): string {
  return l.product?.name ?? `Item ${l.productId}`;
}

/**
 * `collectPointOrCommunity` accepts the community record so an order still in
 * flight picks up the collection point/window the office is running *now*;
 * a collected order keeps the label it was collected against.
 */
export function buildOrderView(o: Order, community: Community | null | undefined): OrderRowView {
  const stage = STAGE[o.status] ?? 0;
  const received = o.status === 'collected';
  const due = received && !o.paid;
  const total = o.lines.reduce((a, l) => a + l.unitPrice * l.qty, 0);
  const summary = o.lines.map((l) => itemName(l).split(',')[0]).join(', ');
  const qty = o.lines.length;

  const collectLine = received ? o.collectLabel : collectionLine(community) || o.collectLabel;

  const when = received
    ? `Collected ${formatDateTime(o.collectedAt)}`
    : o.status === 'ready'
      ? `Ready ${collectLine}`
      : `Collect ${collectLine}`;

  return {
    order: o,
    code: o.code,
    placedLabel: `Placed ${formatDate(o.placedAt)}`,
    status: STATUS_LABEL[o.status] ?? 'Order in',
    statusFg: received ? '#6F6678' : o.status === 'ready' ? '#5B34D9' : '#1E1926',
    when,
    received,
    due,
    paid: o.paid,
    total,
    summary,
    itemNote: `${qty}${qty === 1 ? ' item' : ' items'}`,
    payLabel: o.paid ? 'Paid' : due ? 'Payment due' : 'Pay on collection',
    payFg: o.paid ? '#6F6678' : due ? '#B3253A' : '#6F6678',
    actLabel: due ? 'Pay now' : received ? 'Order again' : o.status === 'ready' ? 'Collection pass' : 'Edit order',
    actShort: due ? 'Pay now' : received ? 'Reorder' : o.status === 'ready' ? 'Get pass' : 'Edit',
    actIsPay: due,
    stops: [0, 1, 2].map((k) => ({
      border: k <= stage ? '#1E1926' : '#D6CEC6',
      bg: k <= stage ? '#1E1926' : '#fff',
      line: k < stage ? '#1E1926' : '#E7DFD5',
    })),
    collectLine,
  };
}

export interface TimelineStep {
  label: string;
  when: string;
  border: string;
  dot: string;
  line: string;
  tail: number;
  weight: number;
  fg: string;
}

export function buildTimeline(o: Order): TimelineStep[] {
  const stage = STAGE[o.status] ?? 0;
  const dates = [o.placedAt, o.packingAt, o.readyAt, o.collectedAt];

  const labels = [...STAGE_LABELS];
  // When the retail console has advanced the fulfilment run, say what it is
  // actually doing rather than the generic "Packed by Capital Retail".
  if (o.fulfilmentStage && FULFILMENT_LABEL[o.fulfilmentStage] && stage < 3) {
    labels[1] = FULFILMENT_LABEL[o.fulfilmentStage];
  }
  // The collection sheet records who signed for it.
  if (o.status === 'collected' && o.collectedBy) {
    labels[3] = `Collected by ${o.collectedBy}`;
  }

  return labels.map((label, k) => ({
    label,
    when: dates[k] ? formatDate(dates[k]) : 'pending',
    border: k <= stage ? '#1E1926' : '#D6CEC6',
    dot: k <= stage ? '#1E1926' : '#fff',
    line: k < stage ? '#1E1926' : '#E7DFD5',
    tail: k === 3 ? 0 : 14,
    weight: k === stage ? 800 : 600,
    fg: k <= stage ? '#1E1926' : '#9A9199',
  }));
}

/**
 * Payment wording. `paid` is set either by the resident's MMQR confirmation or
 * by the office console marking it paid / reconciling a bank statement, so the
 * copy names the date when the server sends one.
 */
export function orderPayDetail(o: Order): string {
  const total = o.lines.reduce((a, l) => a + l.unitPrice * l.qty, 0);
  if (o.paid) {
    const on = o.paidAt ? ` on ${formatDate(o.paidAt)}` : '';
    return o.paymentMethod === 'mmqr'
      ? `Paid in full by MMQR${on}, reconciled by the property office.`
      : `Paid in full${on}, reconciled by the property office.`;
  }
  if (o.status === 'collected') return `Outstanding ${money(total)} — the office will add it to your next collection.`;
  return 'You can pay by MMQR now or with cash when you collect.';
}

export function orderSearchBlob(o: Order): string {
  return `${o.code} ${o.lines.map(itemName).join(' ')} ${o.collectLabel}`.toLowerCase();
}

export { itemName };
