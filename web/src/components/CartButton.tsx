import { useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useProducts } from '../context/ProductsContext';
import { money } from '../utils/format';

/**
 * The order, always reachable from the top right.
 *
 * "Your order" already lives in the sidebar nav, but a shopper adding items on
 * the sheet looks up and to the right for their basket — every shop they have
 * ever used puts it there. This is the same destination (`/cart`), not a second
 * cart: one CartContext, one route, and the sidebar badge and this count are
 * the same number.
 *
 * Fixed rather than sticky, because the page headers it sits beside are
 * themselves sticky and would otherwise scroll it away. `stickyHeader` reserves
 * the room on its right so the two never overlap.
 */
export function CartButton() {
  const { cart, count } = useCart();
  const { byId } = useProducts();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const subtotal = useMemo(
    () =>
      Object.entries(cart).reduce((sum, [id, qty]) => {
        const p = byId[id];
        return p && qty > 0 ? sum + p.price * qty : sum;
      }, 0),
    [cart, byId],
  );

  // On the order itself, and while paying for it, the button would only point
  // at the page you are already reading.
  if (pathname === '/cart' || pathname.startsWith('/checkout')) return null;

  const empty = count === 0;
  const label = empty
    ? 'Your order is empty'
    : `Your order — ${count} ${count === 1 ? 'item' : 'items'}, ${money(subtotal)}`;

  return (
    <button
      onClick={() => navigate('/cart')}
      aria-label={label}
      // The count is what the button shows; the running total is one hover
      // away. Putting the money on the face of it cost ~80px of every page
      // header, which was enough to wrap "This week's sheet" onto two lines —
      // and the sheet already prints the subtotal in the panel beside it.
      title={label}
      style={{
        position: 'fixed',
        top: 22,
        right: 28,
        zIndex: 20,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: empty ? '9px 13px' : '9px 9px 9px 13px',
        border: `1px solid ${empty ? '#E5DCD3' : '#1E1926'}`,
        borderRadius: 999,
        background: empty ? '#FDFBF8' : '#1E1926',
        color: empty ? '#6F6678' : '#fff',
        fontFamily: 'inherit',
        fontSize: 12.5,
        fontWeight: 700,
        cursor: 'pointer',
        boxShadow: empty ? 'none' : '0 6px 20px rgba(30,25,38,.22)',
      }}
    >
      <BasketIcon color={empty ? '#928892' : '#fff'} />
      {empty && <span>Order</span>}
      {!empty && (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            minWidth: 22,
            height: 22,
            padding: '0 6px',
            borderRadius: 999,
            background: '#5B34D9',
            color: '#fff',
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 11.5,
            fontWeight: 500,
          }}
        >
          {count}
        </span>
      )}
    </button>
  );
}

function BasketIcon({ color }: { color: string }) {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden focusable="false">
      <path
        d="M2 4.75h12l-1.05 8.4a1.5 1.5 0 0 1-1.49 1.35H4.54a1.5 1.5 0 0 1-1.49-1.35L2 4.75Z"
        stroke={color}
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
      <path
        d="M5.5 6.75v-2a2.5 2.5 0 0 1 5 0v2"
        stroke={color}
        strokeWidth="1.3"
        strokeLinecap="round"
      />
    </svg>
  );
}
