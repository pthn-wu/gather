import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProducts } from '../context/ProductsContext';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { money } from '../utils/format';
import { formatCutoff, deliveryDay } from '../utils/cycle';
import { basketPromoLine, promoMarker } from '../utils/promo';
import { STICKY_BELOW_HEADER, card, linkButton, mono, primaryButton, sectionLabel } from '../styles/shared';
import { PageHeader } from '../components/PageHeader';
import { SortSelect } from '../components/SortSelect';
import { CartLineList } from '../components/CartLineList';
import { ProductImage } from '../components/ProductImage';
import type { Product } from '../api/types';

type SortKey = 'pop' | 'price' | 'save';
const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'pop', label: 'Most joined' },
  { value: 'price', label: 'Lowest price' },
  { value: 'save', label: 'Biggest saving' },
];

function sortProducts(list: Product[], sort: 'pop' | 'price' | 'save'): Product[] {
  const copy = [...list];
  if (sort === 'pop') copy.sort((a, b) => b.joined - a.joined);
  else if (sort === 'price') copy.sort((a, b) => a.price - b.price);
  else copy.sort((a, b) => b.savePct - a.savePct);
  return copy;
}

export function Shop() {
  const { products, byId, categories, basketPromotions, loading, error } = useProducts();
  const { cart, addTo, count } = useCart();
  const { community } = useAuth();
  const { flash } = useToast();
  const navigate = useNavigate();

  const [cat, setCat] = useState('All');
  const [pq, setPq] = useState('');
  const [sort, setSort] = useState<SortKey>('pop');

  const filtered = useMemo(() => {
    const q = pq.trim().toLowerCase();
    const byCat = cat === 'All' ? products : products.filter((p) => p.category === cat);
    const byQuery = q ? byCat.filter((p) => `${p.name} ${p.category} ${p.unit}`.toLowerCase().includes(q)) : byCat;
    return sortProducts(byQuery, sort);
  }, [products, cat, pq, sort]);

  const cartKeys = Object.keys(cart).filter((k) => cart[k] > 0 && byId[k]);
  const sub = cartKeys.reduce((a, k) => a + byId[k].price * cart[k], 0);
  const ret = cartKeys.reduce((a, k) => a + byId[k].retailPrice * cart[k], 0);

  return (
    <>
      <PageHeader>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 26 }}>
          <div style={{ fontFamily: 'Poppins, sans-serif', fontSize: 27, fontWeight: 600, letterSpacing: '-.02em' }}>
            This week's sheet
          </div>
          <div style={{ fontSize: 12.5, color: '#7B7280' }}>
            {loading ? 'Loading…' : `${filtered.length} items from Capital Retail · prices fall as neighbours join`}
          </div>
          <div style={{ flex: 1 }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                width: 216,
                padding: '7px 0',
                borderBottom: `1.5px solid ${pq ? '#5B34D9' : '#DED5CC'}`,
              }}
            >
              <input
                value={pq}
                onChange={(e) => setPq(e.target.value)}
                placeholder="Search the sheet"
                style={{
                  flex: 1,
                  minWidth: 0,
                  border: 0,
                  background: 'transparent',
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#1E1926',
                  outline: 'none',
                  padding: 0,
                }}
              />
              {pq.length > 0 && (
                <button onClick={() => setPq('')} style={{ ...linkButton, color: '#7B7280', fontSize: 12 }}>
                  clear
                </button>
              )}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 20, marginTop: 20 }}>
        <div
          className="no-scrollbar"
          style={{ display: 'flex', alignItems: 'flex-end', gap: 18, flex: 1, minWidth: 0, overflowX: 'auto' }}
        >
          {['All', ...categories].map((c) => {
            const on = cat === c;
            const catCount = c === 'All' ? products.length : products.filter((p) => p.category === c).length;
            return (
              <button
                key={c}
                onClick={() => setCat(c)}
                style={{
                  flex: 'none',
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
                  whiteSpace: 'nowrap',
                }}
              >
                {c}
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 500, color: '#A79E9E' }}>
                  {catCount}
                </span>
              </button>
            );
          })}
        </div>
          <SortSelect
            value={sort}
            options={SORT_OPTIONS}
            onChange={setSort}
            style={{ marginBottom: 10 }}
          />
        </div>
      </PageHeader>

      <div
        style={{
          padding: '26px 36px 48px',
          display: 'grid',
          gridTemplateColumns: 'minmax(0,1fr) clamp(296px, 30%, 348px)',
          gap: 26,
          alignItems: 'start',
        }}
      >
        <div style={{ minWidth: 0 }}>
          {error && (
            <div style={{ padding: '32px 0', fontSize: 13, color: '#B3253A' }}>
              {error}. Make sure the Gather server is running.
            </div>
          )}
          {!error && basketPromotions.length > 0 && (
            <div
              style={{
                background: '#fff',
                border: '1px solid #EBE3DA',
                borderRadius: 10,
                borderLeft: '2px solid #5B34D9',
                padding: '16px 18px',
                marginBottom: 18,
              }}
            >
              <div style={{ ...sectionLabel, color: '#5B34D9' }}>
                {basketPromotions.length === 1 ? 'Running this cycle' : `${basketPromotions.length} promotions this cycle`}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginTop: 10 }}>
                {basketPromotions.map((promo) => (
                  <div key={promo.id} style={{ fontSize: 12.5, color: '#3F3947', lineHeight: 1.55 }}>
                    <span style={{ fontWeight: 800 }}>{promo.name}</span> — {basketPromoLine(promo)}
                  </div>
                ))}
              </div>
            </div>
          )}
          {!error && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 18 }}>
              {filtered.map((p) => {
                const nextPrice =
                  p.progress.next != null ? (p as any)[`price${p.tierIndex + 1}`] ?? p.price : undefined;
                return (
                  <div
                    key={p.id}
                    className="res-card"
                    onClick={() => navigate(`/shop/${p.id}`)}
                    style={{
                      background: '#fff',
                      border: '1px solid #EBE3DA',
                      borderRadius: 10,
                      overflow: 'hidden',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                    }}
                  >
                    <ProductImage
                      src={p.imageUrl}
                      slot={p.imageSlot}
                      alt={p.name}
                      aspectRatio="4/3"
                      stripe={8}
                      slotFontSize={10.5}
                    />
                    <div style={{ padding: '15px 16px 16px', display: 'flex', flexDirection: 'column', flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: '-.01em', lineHeight: 1.35 }}>{p.name}</div>
                      <div style={{ fontSize: 11.5, color: '#928892', marginTop: 3 }}>
                        {[p.brand, p.size || p.unit, p.category].filter(Boolean).join(' · ')}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 12 }}>
                        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 16, fontWeight: 500 }}>{money(p.price)}</div>
                        <div style={{ fontSize: 11.5, color: '#928892', textDecoration: 'line-through' }}>{money(p.retailPrice)}</div>
                        <div style={{ fontSize: 11.5, fontWeight: 700, color: '#0C7C58' }}>&minus;{p.savePct}%</div>
                      </div>
                      {promoMarker(p.promotion) && (
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#5B34D9', marginTop: 6, lineHeight: 1.4 }}>
                          {promoMarker(p.promotion)}
                        </div>
                      )}
                      <div style={{ marginTop: 12 }}>
                        <div style={{ height: 3, background: '#EFE8E0', borderRadius: 2, overflow: 'hidden' }}>
                          <div
                            style={{
                              height: 3,
                              background: '#5B34D9',
                              width: `${Math.min(100, Math.round((p.joined / 100) * 100))}%`,
                            }}
                          />
                        </div>
                        <div style={{ fontSize: 11.5, color: '#6F6678', marginTop: 7, lineHeight: 1.45 }}>
                          {p.progress.next != null
                            ? `${p.joined} of ${p.progress.next} units · ${p.progress.unitsToNext} more drops it to ${money(nextPrice)}`
                            : `Deepest tier unlocked at ${money(p.price3)}`}
                        </div>
                      </div>
                      <div style={{ flex: 1 }} />
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 14 }}>
                        <div style={{ flex: 1, fontSize: 11.5, color: '#928892' }}>
                          {p.joined} units from {Math.round(p.joined / 1.8)} neighbours
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            addTo(p.id, 1);
                            flash(`Added to your ${deliveryDay(community)} order`);
                          }}
                          style={{
                            padding: '8px 14px',
                            border: '1px solid #1E1926',
                            borderRadius: 8,
                            background: '#1E1926',
                            color: '#fff',
                            fontSize: 12,
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          Add
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {!loading && !error && filtered.length === 0 && (
            <div style={{ padding: '64px 0', borderTop: '1.5px solid #1E1926' }}>
              <div style={{ fontSize: 15, fontWeight: 800 }}>Nothing on the sheet matches</div>
              <div style={{ fontSize: 13, color: '#6F6678', marginTop: 7, maxWidth: 430, lineHeight: 1.55 }}>
                Try another word, or ask for it on the Community wishlist — Capital Retail reads it before setting
                the next sheet.
              </div>
              <button
                onClick={() => {
                  setPq('');
                  setCat('All');
                }}
                style={{ ...linkButton, marginTop: 14, fontSize: 13 }}
              >
                Clear search and category
              </button>
            </div>
          )}
        </div>

        <div style={{ position: 'sticky', top: STICKY_BELOW_HEADER, ...card }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 9 }}>
            <div style={sectionLabel}>Your {deliveryDay(community)} order</div>
            <div style={{ flex: 1 }} />
            <div style={{ ...mono, fontSize: 11, color: '#A79E9E' }}>{count || ''}</div>
          </div>
          {count === 0 && (
            <div style={{ fontSize: 12.5, color: '#7B7280', lineHeight: 1.55, marginTop: 14 }}>
              Nothing added yet. Prices fall as more units join across {community?.label ?? 'your community'}, so
              early orders help everyone.
            </div>
          )}
          {count > 0 && (
            <>
              <CartLineList cart={cart} products={byId} />
              <div
                style={{
                  marginTop: 18,
                  paddingTop: 16,
                  borderTop: '1px solid #EFE8E0',
                  display: 'flex',
                  alignItems: 'baseline',
                  justifyContent: 'space-between',
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 800 }}>Subtotal</div>
                <div style={{ ...mono, fontSize: 16, fontWeight: 500 }}>{money(sub)}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 7 }}>
                <div style={{ fontSize: 12, color: '#0C7C58', fontWeight: 700 }}>Saved against retail</div>
                <div style={{ ...mono, fontSize: 12, color: '#0C7C58' }}>{money(ret - sub)}</div>
              </div>
              <button
                onClick={() => navigate('/cart')}
                style={{ ...primaryButton, marginTop: 18, width: '100%', padding: 12, fontSize: 13 }}
              >
                Review order
              </button>
            </>
          )}
          <div style={{ fontSize: 11.5, color: '#9A9199', lineHeight: 1.5, marginTop: 14 }}>
            Cutoff {formatCutoff(community)}. Anything after that joins the next drop.
          </div>
        </div>
      </div>
    </>
  );
}
