import { useNavigate } from 'react-router-dom';
import { useProducts } from '../context/ProductsContext';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { money } from '../utils/format';
import { tierNoteForIndex } from '../utils/cutoff';
import { collectPoint, deliveryDay, deliveryLabel, formatCutoff } from '../utils/cycle';
import { basketPromoLine, prePromoPrice, promoMarker } from '../utils/promo';
import { Stepper } from '../components/Stepper';
import { card, linkButton, mono, pageTitle, primaryButton, sectionLabel } from '../styles/shared';

export function Cart() {
  const { byId, basketPromotions } = useProducts();
  const { cart, addTo, setQty, remove, count } = useCart();
  const { community } = useAuth();
  const { flash } = useToast();
  const navigate = useNavigate();

  const keys = Object.keys(cart).filter((k) => cart[k] > 0 && byId[k]);
  const sub = keys.reduce((a, k) => a + byId[k].price * cart[k], 0);
  const ret = keys.reduce((a, k) => a + byId[k].retailPrice * cart[k], 0);

  const goCheckout = () => {
    if (!count) {
      flash('Add something to your order first');
      return;
    }
    navigate('/checkout');
  };

  return (
    <div style={{ padding: '28px 36px 48px' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 24 }}>
        <div style={pageTitle}>Your {deliveryDay(community)} order</div>
        <div style={{ fontSize: 12.5, color: '#7B7280' }}>
          {count} {count === 1 ? 'item' : 'items'} · cutoff {formatCutoff(community)}
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(300px,348px)', gap: 26, alignItems: 'start', marginTop: 22 }}>
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(0,1fr) 120px 132px 110px 40px',
              gap: 14,
              alignItems: 'baseline',
              padding: '0 12px 11px',
              borderBottom: '1.5px solid #1E1926',
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: '.09em',
              textTransform: 'uppercase',
              color: '#928892',
            }}
          >
            <div>Item</div>
            <div style={{ textAlign: 'right' }}>Unit price</div>
            <div style={{ textAlign: 'center' }}>Quantity</div>
            <div style={{ textAlign: 'right' }}>Total</div>
            <div />
          </div>
          {keys.map((k) => {
            const p = byId[k];
            const qty = cart[k];
            return (
              <div
                key={k}
                className="row"
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'minmax(0,1fr) 120px 132px 110px 40px',
                  gap: 14,
                  alignItems: 'center',
                  padding: '15px 12px',
                  borderBottom: '1px solid #EFE8E0',
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 700, lineHeight: 1.35 }}>{p.name}</div>
                  <div style={{ fontSize: 11.5, color: '#928892', marginTop: 3 }}>
                    {[p.brand, p.size || p.unit].filter(Boolean).join(' · ')} · {tierNoteForIndex(p.tierIndex)}
                  </div>
                  {promoMarker(p.promotion) && (
                    <div style={{ fontSize: 11.5, fontWeight: 700, color: '#5B34D9', marginTop: 3 }}>
                      {promoMarker(p.promotion)}
                    </div>
                  )}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ ...mono, fontSize: 12.5 }}>{money(p.price)}</div>
                  {prePromoPrice(p) != null && (
                    <div style={{ ...mono, fontSize: 11, color: '#928892', textDecoration: 'line-through', marginTop: 2 }}>
                      {money(prePromoPrice(p)!)}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', justifyContent: 'center', width: 118, margin: '0 auto' }}>
                  <Stepper
                    qty={qty}
                    onDec={() => setQty(k, qty - 1)}
                    onInc={() => addTo(k, 1)}
                    size="sm"
                  />
                </div>
                <div style={{ textAlign: 'right', ...mono, fontSize: 13.5, fontWeight: 500 }}>{money(p.price * qty)}</div>
                <button
                  onClick={() => {
                    remove(k);
                    flash(`${p.name} removed`);
                  }}
                  style={{ border: 0, background: 'transparent', padding: 0, cursor: 'pointer', fontSize: 11.5, fontWeight: 700, color: '#928892' }}
                >
                  Remove
                </button>
              </div>
            );
          })}
          {keys.length === 0 && (
            <div style={{ padding: '56px 12px' }}>
              <div style={{ fontSize: 15, fontWeight: 800 }}>Your order is empty</div>
              <div style={{ fontSize: 13, color: '#6F6678', marginTop: 7, maxWidth: 430, lineHeight: 1.55 }}>
                Add anything from this week's sheet before cutoff and it arrives with the next drop.
              </div>
              <button onClick={() => navigate('/shop')} style={{ ...linkButton, marginTop: 14, fontSize: 13 }}>
                Browse the sheet
              </button>
            </div>
          )}
        </div>

        <div style={{ position: 'sticky', top: 28, ...card }}>
          <div style={sectionLabel}>Summary</div>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 16 }}>
            <div style={{ fontSize: 12.5, color: '#6F6678' }}>Retail value</div>
            <div style={{ ...mono, fontSize: 12.5, color: '#6F6678', textDecoration: 'line-through' }}>{money(ret)}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 8 }}>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: '#0C7C58' }}>Group saving</div>
            <div style={{ ...mono, fontSize: 12.5, color: '#0C7C58' }}>&minus;{money(ret - sub)}</div>
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              justifyContent: 'space-between',
              marginTop: 16,
              paddingTop: 14,
              borderTop: '1px solid #EFE8E0',
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 800 }}>Total</div>
            <div style={{ ...mono, fontSize: 17, fontWeight: 500 }}>{money(sub)}</div>
          </div>
          {basketPromotions.length > 0 && (
            <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid #EFE8E0' }}>
              <div style={{ ...sectionLabel, fontSize: 10, color: '#5B34D9' }}>On the whole basket</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 9 }}>
                {basketPromotions.map((promo) => (
                  <div key={promo.id} style={{ fontSize: 11.5, color: '#6F6678', lineHeight: 1.5 }}>
                    <span style={{ fontWeight: 800, color: '#1E1926' }}>{promo.name}</span> — {basketPromoLine(promo)}
                  </div>
                ))}
              </div>
            </div>
          )}
          <div style={{ fontSize: 12, color: '#6F6678', lineHeight: 1.55, marginTop: 14 }}>
            Collect at {collectPoint(community)}
            {deliveryLabel(community) ? `, ${deliveryLabel(community)}` : ''}. Prices can still fall if more
            neighbours join before cutoff — you pay the lower price.
          </div>
          <button onClick={goCheckout} style={{ ...primaryButton, marginTop: 18, width: '100%', padding: 13, fontSize: 13.5 }}>
            Continue to payment
          </button>
          <button
            onClick={() => navigate('/shop')}
            style={{
              marginTop: 9,
              width: '100%',
              padding: 12,
              border: '1px solid #E5DCD3',
              borderRadius: 9,
              background: '#fff',
              color: '#6F6678',
              fontSize: 12.5,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Keep shopping
          </button>
        </div>
      </div>
    </div>
  );
}
