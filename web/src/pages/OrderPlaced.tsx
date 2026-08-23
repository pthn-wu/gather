import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useOrders } from '../context/OrdersContext';
import { useToast } from '../context/ToastContext';
import { payOrder } from '../api/endpoints';
import type { Order } from '../api/types';
import { money } from '../utils/format';
import { collectPoint, deliveryDay, deliveryLabel } from '../utils/cycle';
import { card, mono, outlineButton, primaryButton } from '../styles/shared';

export function OrderPlaced() {
  const location = useLocation();
  const navigate = useNavigate();
  const { community } = useAuth();
  const { orders, refetch } = useOrders();
  const { flash } = useToast();
  const [paying, setPaying] = useState(false);

  const stateOrder = (location.state as { order?: Order } | null)?.order;
  const [order, setOrder] = useState<Order | null>(stateOrder ?? null);

  useEffect(() => {
    if (!order && orders.length) setOrder(orders[0]);
  }, [order, orders]);

  if (!order) {
    return (
      <div style={{ padding: '56px 36px 48px', display: 'flex', justifyContent: 'center' }}>
        <div style={{ width: 720, fontSize: 13, color: '#6F6678' }}>
          No recent order found. <button onClick={() => navigate('/shop')} style={{ ...outlineButton, marginLeft: 8, padding: '8px 12px' }}>Back to the sheet</button>
        </div>
      </div>
    );
  }

  const count = order.lines.reduce((a, l) => a + l.qty, 0);
  const total = order.lines.reduce((a, l) => a + l.unitPrice * l.qty, 0);
  const needsMmqrPay = order.paymentMethod === 'mmqr' && !order.paid;
  const donePay = order.paymentMethod === 'mmqr' ? (order.paid ? 'Paid by MMQR · CTZPay' : 'Awaiting MMQR payment') : 'Pay at collection';

  const markPaid = async () => {
    setPaying(true);
    try {
      const updated = await payOrder(order.id);
      setOrder(updated);
      refetch();
      flash('Marked as paid');
    } catch {
      flash('Could not confirm payment — try again');
    } finally {
      setPaying(false);
    }
  };

  return (
    <div style={{ padding: '56px 36px 48px', display: 'flex', justifyContent: 'center' }}>
      <div style={{ width: 720 }}>
        <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '.09em', textTransform: 'uppercase', color: '#0C7C58' }}>
          Order placed
        </div>
        <div style={{ fontFamily: 'Poppins, sans-serif', fontSize: 32, fontWeight: 600, letterSpacing: '-.02em', marginTop: 12 }}>
          You're in the {deliveryDay(community, 'next')} drop
        </div>
        <div style={{ fontSize: 13.5, color: '#5B5364', lineHeight: 1.65, marginTop: 8, maxWidth: 560 }}>
          Your order is locked into the {community?.label ?? 'community'} drop. Prices can still fall until cutoff —
          if they do, the difference comes back to you at the table.
        </div>

        <div style={{ ...card, marginTop: 26, padding: 26 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,minmax(0,1fr))', gap: 20 }}>
            <div>
              <div style={{ fontSize: 11.5, color: '#928892' }}>Order</div>
              <div style={{ ...mono, fontSize: 14, marginTop: 5 }}>{order.code}</div>
            </div>
            <div>
              <div style={{ fontSize: 11.5, color: '#928892' }}>Items</div>
              <div style={{ fontSize: 14, fontWeight: 700, marginTop: 5 }}>{count}</div>
            </div>
            <div>
              <div style={{ fontSize: 11.5, color: '#928892' }}>Total</div>
              <div style={{ ...mono, fontSize: 14, marginTop: 5 }}>{money(total)}</div>
            </div>
            <div>
              <div style={{ fontSize: 11.5, color: '#928892' }}>Payment</div>
              <div style={{ fontSize: 13, fontWeight: 700, marginTop: 5, lineHeight: 1.4 }}>{donePay}</div>
            </div>
          </div>

          {needsMmqrPay && (
            <button onClick={markPaid} disabled={paying} style={{ ...primaryButton, marginTop: 18, padding: '11px 16px', fontSize: 12.5 }}>
              {paying ? 'Confirming…' : "I've paid by MMQR"}
            </button>
          )}

          <div style={{ marginTop: 22, paddingTop: 20, borderTop: '1px solid #EFE8E0', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              `Cutoff — Capital Retail confirms final tier prices for the block.`,
              `${deliveryLabel(community) ?? 'Collection'} — collect at ${collectPoint(community, 'the collection point')}. Bring a trolley for bulk cases.`,
              `Show your name or unit at the table; the office ticks you off the collection sheet.`,
            ].map((text, i) => (
              <div key={i} style={{ display: 'flex', gap: 11, alignItems: 'flex-start' }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#1E1926', flex: 'none', marginTop: 6 }} />
                <div style={{ fontSize: 13, color: '#3F3947', lineHeight: 1.55 }}>{text}</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
            <button onClick={() => navigate('/orders')} style={{ ...primaryButton, padding: '13px 18px', fontSize: 13 }}>
              Track this order
            </button>
            <button
              onClick={() => navigate('/shop')}
              style={{ padding: '13px 18px', border: '1px solid #E5DCD3', borderRadius: 9, background: '#fff', color: '#1E1926', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
            >
              Keep shopping
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
