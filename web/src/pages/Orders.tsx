import { useMemo, useState, type ReactNode } from 'react';
import { useAuth } from '../context/AuthContext';
import { useOrders } from '../context/OrdersContext';
import { useProducts } from '../context/ProductsContext';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import { payOrder } from '../api/endpoints';
import { money } from '../utils/format';
import { buildOrderView, buildTimeline, orderPayDetail, orderSearchBlob, itemName, type OrderRowView } from '../utils/orderView';
import { tierNoteForIndex } from '../utils/cutoff';
import { collectPoint } from '../utils/cycle';
import { promoName } from '../utils/promo';
import { STICKY_BELOW_HEADER, card, linkButton, mono, pageTitle, sectionLabel, stickyHeader } from '../styles/shared';

const FILTERS = [
  { k: 'all', label: 'All' },
  { k: 'awaiting', label: 'Not received' },
  { k: 'ready', label: 'Ready now' },
  { k: 'collected', label: 'Received' },
  { k: 'unpaid', label: 'Unpaid' },
] as const;
type FilterKey = (typeof FILTERS)[number]['k'];

const SORT_LABELS: Record<string, string> = { new: 'Newest first', old: 'Oldest first', big: 'Largest first' };
const SORT_NEXT: Record<string, 'new' | 'old' | 'big'> = { new: 'old', old: 'big', big: 'new' };

function passFilter(v: OrderRowView, f: FilterKey): boolean {
  if (f === 'all') return true;
  if (f === 'awaiting') return !v.received;
  if (f === 'ready') return v.order.status === 'ready';
  if (f === 'collected') return v.received;
  return !v.paid; // unpaid
}

export function Orders() {
  const { community } = useAuth();
  const { orders, loading, error, refetch } = useOrders();
  const { byId: productsById } = useProducts();
  const { addTo: addToCart } = useCart();
  const { flash } = useToast();

  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<FilterKey>('all');
  const [sort, setSort] = useState<'new' | 'old' | 'big'>('new');
  const [selId, setSelId] = useState<string | null>(null);
  const [paying, setPaying] = useState<string | null>(null);

  const allViews = useMemo(() => orders.map((o) => buildOrderView(o, community)), [orders, community]);

  const q = query.trim().toLowerCase();
  const searched = useMemo(
    () => (q ? allViews.filter((v) => orderSearchBlob(v.order).includes(q)) : allViews),
    [allViews, q],
  );
  const list = useMemo(() => {
    const filtered = searched.filter((v) => passFilter(v, filter));
    const sorted = [...filtered];
    if (sort === 'new') sorted.sort((a, b) => new Date(b.order.placedAt).getTime() - new Date(a.order.placedAt).getTime());
    else if (sort === 'old') sorted.sort((a, b) => new Date(a.order.placedAt).getTime() - new Date(b.order.placedAt).getTime());
    else sorted.sort((a, b) => b.total - a.total);
    return sorted;
  }, [searched, filter, sort]);

  const active = list.filter((v) => !v.received);
  const past = list.filter((v) => v.received);
  const dueList = allViews.filter((v) => v.due);

  const selected = list.find((v) => v.order.id === selId) ?? list[0] ?? null;

  const handleAct = async (v: OrderRowView) => {
    if (v.actIsPay) {
      setPaying(v.order.id);
      try {
        await payOrder(v.order.id);
        await refetch();
        flash('Marked as paid');
      } catch {
        flash('Could not confirm payment — try again');
      } finally {
        setPaying(null);
      }
      return;
    }
    if (v.received) {
      // Reorder: add the same lines back to the current cart, if still on sale.
      let added = 0;
      for (const l of v.order.lines) {
        if (productsById[l.productId]) {
          addToCart(l.productId, l.qty);
          added += 1;
        }
      }
      flash(added > 0 ? 'Items added to your order' : 'Those items are no longer on the sheet');
      return;
    }
    if (v.order.status === 'ready') {
      flash(`Collection pass ready — show at ${collectPoint(community, 'the collection point')}`);
      return;
    }
    flash(`Editing ${v.code} before cutoff`);
  };

  const headline = loading
    ? 'Loading…'
    : `${list.length} order${list.length === 1 ? '' : 's'} · ${money(list.reduce((a, v) => a + v.total, 0))} with ${community?.name ?? 'your community'}`;

  const emptyHint = q
    ? `Nothing matches "${query}" in this view. Try an item name, an order code, or switch the filter above.`
    : 'Nothing in this view yet.';

  return (
    <>
      <div style={stickyHeader}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 26 }}>
          <div style={pageTitle}>Your orders</div>
          <div style={{ fontSize: 12.5, color: '#7B7280' }}>{headline}</div>
          <div style={{ flex: 1 }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                width: 300,
                padding: '7px 0',
                borderBottom: `1.5px solid ${query ? '#5B34D9' : '#DED5CC'}`,
              }}
            >
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search code, item or month"
                style={{ flex: 1, minWidth: 0, border: 0, background: 'transparent', fontSize: 13, fontWeight: 600, color: '#1E1926', outline: 'none', padding: 0 }}
              />
              {query.length > 0 && (
                <button onClick={() => setQuery('')} style={{ ...linkButton, color: '#7B7280', fontSize: 12 }}>
                  clear
                </button>
              )}
            </div>
            <button onClick={() => setSort(SORT_NEXT[sort])} style={{ ...linkButton, fontSize: 12.5, whiteSpace: 'nowrap' }}>
              {SORT_LABELS[sort]}
            </button>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 22, marginTop: 20 }}>
          {FILTERS.map((f) => {
            const on = filter === f.k;
            return (
              <button
                key={f.k}
                onClick={() => setFilter(f.k)}
                style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: 6,
                  padding: '0 0 12px',
                  border: 0,
                  background: 'transparent',
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: on ? 800 : 600,
                  color: on ? '#1E1926' : '#7B7280',
                  borderBottom: `2px solid ${on ? '#5B34D9' : 'transparent'}`,
                  marginBottom: -1,
                }}
              >
                {f.label}
                <span style={{ ...mono, fontSize: 11, fontWeight: 500, color: '#A79E9E' }}>
                  {searched.filter((v) => passFilter(v, f.k)).length}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ padding: '26px 36px 48px', display: 'grid', gridTemplateColumns: 'minmax(0,1fr) clamp(296px, 30%, 348px)', gap: 26, alignItems: 'start' }}>
        <div style={{ minWidth: 0 }}>
          {error && <div style={{ padding: '32px 0', fontSize: 13, color: '#B3253A' }}>{error}. Make sure the Gather server is running.</div>}

          {!error && dueList.length > 0 && filter !== 'unpaid' && (
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, padding: '0 0 16px', borderBottom: '1px solid #E7DFD5', marginBottom: 22 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#B3253A' }}>
                {dueList.length} received order{dueList.length === 1 ? '' : 's'} still owe
                {dueList.length === 1 ? 's' : ''} {money(dueList.reduce((a, v) => a + v.total, 0))}.
              </div>
              <button onClick={() => setFilter('unpaid')} style={{ ...linkButton, fontSize: 12.5 }}>
                Show them
              </button>
            </div>
          )}

          {!error && active.length > 0 && (
            <div style={{ marginBottom: 36 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 9, paddingBottom: 11, borderBottom: '1.5px solid #1E1926' }}>
                <div style={sectionLabel}>Not yet received</div>
                <div style={{ ...mono, fontSize: 11, color: '#A79E9E' }}>{active.length}</div>
              </div>
              {active.map((v) => (
                <ActiveRow key={v.order.id} v={v} selected={v.order.id === selected?.order.id} onOpen={() => setSelId(v.order.id)} onAct={() => handleAct(v)} paying={paying === v.order.id} />
              ))}
            </div>
          )}

          {!error && past.length > 0 && (
            <div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 9, paddingBottom: 11, borderBottom: '1.5px solid #1E1926' }}>
                <div style={sectionLabel}>Received</div>
                <div style={{ ...mono, fontSize: 11, color: '#A79E9E' }}>{past.length}</div>
              </div>
              {past.map((v) => (
                <PastRow key={v.order.id} v={v} selected={v.order.id === selected?.order.id} onOpen={() => setSelId(v.order.id)} onAct={() => handleAct(v)} paying={paying === v.order.id} />
              ))}
            </div>
          )}

          {!loading && !error && list.length === 0 && (
            <div style={{ padding: '64px 0', borderTop: '1.5px solid #1E1926' }}>
              <div style={{ fontSize: 15, fontWeight: 800 }}>No orders match</div>
              <div style={{ fontSize: 13, color: '#6F6678', marginTop: 7, maxWidth: 430, lineHeight: 1.55 }}>{emptyHint}</div>
              <button
                onClick={() => {
                  setQuery('');
                  setFilter('all');
                }}
                style={{ ...linkButton, marginTop: 14, fontSize: 13 }}
              >
                Clear search and filters
              </button>
            </div>
          )}
        </div>

        <div style={{ position: 'sticky', top: STICKY_BELOW_HEADER, ...card, padding: 24 }}>
          {selected ? (
            <DetailPanel v={selected} onAct={() => handleAct(selected)} paying={paying === selected.order.id} />
          ) : (
            <div style={{ fontSize: 13, color: '#6F6678' }}>No orders yet.</div>
          )}
        </div>
      </div>
    </>
  );
}

function RowShell({
  v,
  selected,
  onOpen,
  children,
  padding,
}: {
  v: OrderRowView;
  selected: boolean;
  onOpen: () => void;
  children: ReactNode;
  padding: string;
}) {
  return (
    <div
      className="row"
      onClick={onOpen}
      style={{
        display: 'grid',
        // Order code, collection line, item names, money, action.
        //
        // The two text columns both flex, and neither has a px floor. A floor
        // makes the five tracks add up to more than the cell on a 1280 screen,
        // and the row overflows to the right — that is what slid the action
        // buttons underneath the detail panel. Fixing that by pinning the
        // collection column then starved the item names down to "Shan …", so
        // the slack is shared: collection gets slightly more because it wraps
        // to a second line, names truncate instead of wrapping.
        //
        // Money is 118px because "Pay on collection" wrapped under the amount
        // at 96.
        gridTemplateColumns: '112px minmax(0,1.1fr) minmax(0,1fr) 118px 100px',
        gap: 12,
        alignItems: 'baseline',
        padding,
        borderBottom: '1px solid #EFE8E0',
        cursor: 'pointer',
        background: selected ? '#FDFBF7' : '#fff',
        boxShadow: `inset 2px 0 0 ${selected ? '#5B34D9' : 'transparent'}`,
      }}
    >
      {children}
    </div>
  );
}

function ActRowButton({ v, onAct, paying }: { v: OrderRowView; onAct: () => void; paying: boolean }) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onAct();
      }}
      disabled={paying}
      style={{
        width: '100%',
        padding: '8px 6px',
        border: `1px solid ${v.actIsPay ? '#1E1926' : '#E5DCD3'}`,
        borderRadius: 8,
        background: v.actIsPay ? '#1E1926' : '#fff',
        color: v.actIsPay ? '#fff' : '#1E1926',
        fontSize: 12,
        fontWeight: 700,
        cursor: 'pointer',
        whiteSpace: 'nowrap',
      }}
    >
      {paying ? '…' : v.actShort}
    </button>
  );
}

function ActiveRow({ v, selected, onOpen, onAct, paying }: { v: OrderRowView; selected: boolean; onOpen: () => void; onAct: () => void; paying: boolean }) {
  return (
    <RowShell v={v} selected={selected} onOpen={onOpen} padding="17px 12px">
      <div style={{ minWidth: 0 }}>
        <div style={{ ...mono, fontSize: 12, fontWeight: 500 }}>{v.code}</div>
        <div style={{ fontSize: 11.5, color: '#928892', marginTop: 4 }}>{v.placedLabel}</div>
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          {v.stops.map((st, i) => (
            <span key={i} style={{ display: 'inline-flex', alignItems: 'center' }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', border: `1.5px solid ${st.border}`, background: st.bg, display: 'inline-block' }} />
              <span style={{ width: 12, height: 1, background: st.line, display: 'inline-block' }} />
            </span>
          ))}
          <span style={{ fontSize: 12.5, fontWeight: 700, color: v.statusFg, marginLeft: 2 }}>{v.status}</span>
        </div>
        <div style={{ fontSize: 12, color: '#6F6678', marginTop: 5 }}>{v.when}</div>
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{v.summary}</div>
        <div style={{ fontSize: 11.5, color: '#928892', marginTop: 4 }}>{v.itemNote}</div>
      </div>
      <div style={{ minWidth: 0, textAlign: 'right' }}>
        <div style={{ ...mono, fontSize: 14, fontWeight: 500 }}>{money(v.total)}</div>
        <div style={{ fontSize: 11.5, fontWeight: 600, color: v.payFg, marginTop: 4 }}>{v.payLabel}</div>
      </div>
      <ActRowButton v={v} onAct={onAct} paying={paying} />
    </RowShell>
  );
}

function PastRow({ v, selected, onOpen, onAct, paying }: { v: OrderRowView; selected: boolean; onOpen: () => void; onAct: () => void; paying: boolean }) {
  return (
    <RowShell v={v} selected={selected} onOpen={onOpen} padding="14px 12px">
      <div style={{ minWidth: 0, ...mono, fontSize: 12, fontWeight: 500 }}>{v.code}</div>
      <div style={{ minWidth: 0, fontSize: 12.5, color: '#6F6678' }}>{v.when}</div>
      <div style={{ minWidth: 0, fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{v.summary}</div>
      <div style={{ minWidth: 0, textAlign: 'right' }}>
        <div style={{ ...mono, fontSize: 13.5, fontWeight: 500 }}>{money(v.total)}</div>
        <div style={{ fontSize: 11.5, fontWeight: 600, color: v.payFg, marginTop: 4 }}>{v.payLabel}</div>
      </div>
      <ActRowButton v={v} onAct={onAct} paying={paying} />
    </RowShell>
  );
}

function DetailPanel({ v, onAct, paying }: { v: OrderRowView; onAct: () => void; paying: boolean }) {
  const { flash } = useToast();
  const o = v.order;
  const timeline = buildTimeline(o);
  const payDetail = orderPayDetail(o);
  const retail = o.lines.reduce((a, l) => a + (l.product?.retailPrice ?? l.unitPrice) * l.qty, 0);

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
        <div style={{ ...mono, fontSize: 12.5, fontWeight: 500 }}>{v.code}</div>
        <div style={{ flex: 1 }} />
        <div style={{ fontSize: 12, fontWeight: 700, color: v.statusFg }}>{v.status}</div>
      </div>
      <div style={{ fontSize: 17.5, fontWeight: 800, letterSpacing: '-.01em', marginTop: 14 }}>{v.when}</div>
      <div style={{ fontSize: 12.5, color: '#7B7280', marginTop: 4, lineHeight: 1.5 }}>
        {v.collectLine}
        {o.collectedBy ? ` · signed for by ${o.collectedBy}` : ''}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', marginTop: 20, paddingTop: 18, borderTop: '1px solid #EFE8E0' }}>
        {timeline.map((t, i) => (
          <div key={i} style={{ display: 'flex', gap: 11, alignItems: 'flex-start' }}>
            <div style={{ width: 9, flex: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 4 }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', border: `1.5px solid ${t.border}`, background: t.dot }} />
              <div style={{ width: 1, flex: 1, minHeight: t.tail, background: t.line }} />
            </div>
            <div style={{ paddingBottom: 14 }}>
              <div style={{ fontSize: 12.5, fontWeight: t.weight, color: t.fg }}>{t.label}</div>
              <div style={{ fontSize: 11.5, color: '#9A9199', marginTop: 2 }}>{t.when}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ paddingTop: 16, borderTop: '1px solid #EFE8E0' }}>
        <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.09em', textTransform: 'uppercase', color: '#928892' }}>{v.itemNote}</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 13 }}>
          {o.lines.map((l) => (
            <div key={l.id} style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{itemName(l)}</div>
                <div style={{ fontSize: 11.5, color: '#9A9199', marginTop: 2 }}>
                  {l.qty} × {tierNoteForIndex(l.tierIndex)}
                </div>
                {promoName(l.promotion ?? l.product?.promotion) && (
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#5B34D9', marginTop: 2 }}>
                    {promoName(l.promotion ?? l.product?.promotion)}
                  </div>
                )}
              </div>
              <div style={{ ...mono, fontSize: 12.5, fontWeight: 500 }}>{money(l.unitPrice * l.qty)}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginTop: 18, paddingTop: 16, borderTop: '1px solid #EFE8E0', display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 13, fontWeight: 800 }}>Total</div>
        <div style={{ ...mono, fontSize: 16, fontWeight: 500 }}>{money(v.total)}</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 7 }}>
        <div style={{ fontSize: 12, color: '#6F6678' }}>Retail would have been</div>
        <div style={{ ...mono, fontSize: 12, color: '#6F6678' }}>{money(retail)}</div>
      </div>
      <div style={{ fontSize: 12.5, fontWeight: 700, color: v.payFg, marginTop: 14, lineHeight: 1.5 }}>{payDetail}</div>

      <div style={{ display: 'flex', gap: 9, marginTop: 20 }}>
        <button
          onClick={onAct}
          disabled={paying}
          style={{ flex: 1, padding: 12, border: 0, borderRadius: 9, background: '#1E1926', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
        >
          {paying ? '…' : v.actLabel}
        </button>
        <button
          onClick={() => flash(`Receipt ${v.code}.pdf downloaded`)}
          style={{ padding: '12px 14px', border: '1px solid #E5DCD3', borderRadius: 9, background: '#fff', color: '#6F6678', fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}
        >
          Receipt
        </button>
      </div>
    </>
  );
}
