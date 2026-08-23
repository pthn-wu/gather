import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProducts } from '../context/ProductsContext';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useOrders } from '../context/OrdersContext';
import { createOrder } from '../api/endpoints';
import type { PaymentMethod } from '../api/types';
import qrImage from '../assets/mmqr-ctzpay.png';
import { money } from '../utils/format';
import { collectPoint, collectionWindow, deliveryLabel } from '../utils/cycle';
import { basketPromoLine } from '../utils/promo';
import { card, linkButton, mono, pageTitle, sectionLabel } from '../styles/shared';
import { CartLineList } from '../components/CartLineList';

export function Checkout() {
  const { byId, basketPromotions } = useProducts();
  const { cart, count, clear } = useCart();
  const { community, user } = useAuth();
  const { flash } = useToast();
  const { refetch } = useOrders();
  const navigate = useNavigate();

  const [pay, setPay] = useState<PaymentMethod>('mmqr');
  const [note, setNote] = useState('');
  const [placing, setPlacing] = useState(false);

  const keys = Object.keys(cart).filter((k) => cart[k] > 0 && byId[k]);
  const sub = keys.reduce((a, k) => a + byId[k].price * cart[k], 0);
  const ret = keys.reduce((a, k) => a + byId[k].retailPrice * cart[k], 0);

  const payOptions: { k: PaymentMethod; label: string; note: string }[] = [
    { k: 'mmqr', label: 'MMQR now', note: 'One QR for every bank and wallet, settled by CTZPay' },
    { k: 'collection', label: 'Pay on collection', note: 'Cash or MMQR at the collection table on delivery day' },
  ];

  const placeLabel = pay === 'mmqr' ? `Pay ${money(sub)} by MMQR` : 'Place order, pay at collection';

  const placeOrder = async () => {
    if (!count) {
      flash('Your order is empty');
      return;
    }
    setPlacing(true);
    try {
      const order = await createOrder({
        lines: keys.map((k) => ({ productId: k, qty: cart[k] })),
        paymentMethod: pay,
        note,
      });
      clear();
      refetch();
      navigate('/checkout/done', { state: { order } });
    } catch {
      flash('Could not place your order — try again');
    } finally {
      setPlacing(false);
    }
  };

  return (
    <div style={{ padding: '28px 36px 48px' }}>
      <button onClick={() => navigate('/cart')} style={{ ...linkButton, fontSize: 12.5 }}>
        ← Back to your order
      </button>
      <div style={{ ...pageTitle, marginTop: 16 }}>Checkout</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(640px,1fr) 372px', gap: 28, alignItems: 'start', marginTop: 22 }}>
        <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 26 }}>
          <div style={card}>
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.09em', textTransform: 'uppercase' }}>Collection</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginTop: 16 }}>
              <div>
                <div style={{ fontSize: 12, color: '#928892' }}>Where</div>
                <div style={{ fontSize: 14, fontWeight: 700, marginTop: 4 }}>{collectPoint(community, '—')}</div>
                <div style={{ fontSize: 12, color: '#6F6678', marginTop: 3 }}>
                  {community?.label} · Blk {user?.block} #{user?.unit}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: '#928892' }}>When</div>
                <div style={{ fontSize: 14, fontWeight: 700, marginTop: 4 }}>{deliveryLabel(community) ?? '—'}</div>
                <div style={{ fontSize: 12, color: '#6F6678', marginTop: 3 }}>
                  {collectionWindow(community)
                    ? `Collection window ${collectionWindow(community)} — bring a trolley for the bulk cases`
                    : 'Bring a trolley for the bulk cases'}
                </div>
              </div>
            </div>
          </div>

          <div style={card}>
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.09em', textTransform: 'uppercase' }}>Payment</div>
            <div style={{ display: 'flex', flexDirection: 'column', marginTop: 14 }}>
              {payOptions.map((o) => (
                <button
                  key={o.k}
                  onClick={() => setPay(o.k)}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 12,
                    textAlign: 'left',
                    width: '100%',
                    padding: '15px 0',
                    border: 0,
                    borderBottom: '1px solid #F3ECE4',
                    background: 'transparent',
                    cursor: 'pointer',
                  }}
                >
                  <div
                    style={{
                      width: 14,
                      height: 14,
                      borderRadius: '50%',
                      border: `1.5px solid ${pay === o.k ? '#5B34D9' : '#D6CEC6'}`,
                      background: pay === o.k ? '#5B34D9' : '#fff',
                      flex: 'none',
                      marginTop: 2,
                    }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 700, color: pay === o.k ? '#1E1926' : '#6F6678' }}>{o.label}</div>
                    <div style={{ fontSize: 12, color: '#6F6678', marginTop: 3, lineHeight: 1.5 }}>{o.note}</div>
                  </div>
                </button>
              ))}
            </div>
            {pay === 'mmqr' && (
              <div style={{ display: 'flex', gap: 20, alignItems: 'center', marginTop: 20, paddingTop: 20, borderTop: '1px solid #EFE8E0' }}>
                <img src={qrImage} alt="MMQR" style={{ width: 132, height: 'auto', display: 'block', border: '1px solid #EBE3DA', borderRadius: 8 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>Scan with any bank or wallet app</div>
                  <div style={{ fontSize: 12.5, color: '#6F6678', lineHeight: 1.55, marginTop: 5 }}>
                    One MMQR code, settled through CTZPay. Your payment is matched to your order automatically once
                    placed — no screenshot needed.
                  </div>
                </div>
              </div>
            )}
          </div>

          <div style={card}>
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.09em', textTransform: 'uppercase' }}>
              Note for the collection table
            </div>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. my husband will collect, unit A #14-07"
              style={{
                width: '100%',
                marginTop: 14,
                padding: '12px 14px',
                border: '1px solid #E5DCD3',
                borderRadius: 9,
                background: '#fff',
                fontSize: 13,
                color: '#1E1926',
                outline: 'none',
              }}
            />
          </div>
        </div>

        <div style={{ position: 'sticky', top: 28, ...card }}>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.09em', textTransform: 'uppercase' }}>{count} items</div>
          <CartLineList cart={cart} products={byId} showTierNote={false} gap={11} />
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              justifyContent: 'space-between',
              marginTop: 18,
              paddingTop: 16,
              borderTop: '1px solid #EFE8E0',
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 800 }}>To pay</div>
            <div style={{ ...mono, fontSize: 17, fontWeight: 500 }}>{money(sub)}</div>
          </div>
          <div style={{ fontSize: 12, color: '#0C7C58', fontWeight: 700, marginTop: 7 }}>You save {money(ret - sub)} against retail</div>
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
          <button
            onClick={placeOrder}
            disabled={placing}
            style={{
              marginTop: 18,
              width: '100%',
              padding: 14,
              border: 0,
              borderRadius: 9,
              background: '#1E1926',
              color: '#fff',
              fontSize: 13.5,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            {placing ? 'Placing order…' : placeLabel}
          </button>
          <div style={{ fontSize: 11.5, color: '#9A9199', lineHeight: 1.5, marginTop: 12 }}>
            You can edit or cancel this order until cutoff.
          </div>
        </div>
      </div>
    </div>
  );
}
