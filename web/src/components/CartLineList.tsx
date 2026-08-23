import type { Product } from '../api/types';
import { money } from '../utils/format';
import { tierNoteForIndex } from '../utils/cutoff';
import { promoName } from '../utils/promo';
import type { CartMap } from '../context/CartContext';

interface CartLineListProps {
  cart: CartMap;
  products: Record<string, Product>;
  showTierNote?: boolean;
  gap?: number;
}

export function CartLineList({ cart, products, showTierNote = true, gap = 11 }: CartLineListProps) {
  const keys = Object.keys(cart).filter((k) => cart[k] > 0 && products[k]);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap, marginTop: 16 }}>
      {keys.map((k) => {
        const p = products[k];
        const qty = cart[k];
        return (
          <div key={k} style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.35 }}>{p.name}</div>
              <div style={{ fontSize: 11.5, color: '#9A9199', marginTop: 2 }}>
                {qty} × {money(p.price)}
                {showTierNote ? ` · ${tierNoteForIndex(p.tierIndex)}` : ''}
              </div>
              {promoName(p.promotion) && (
                <div style={{ fontSize: 11, fontWeight: 700, color: '#5B34D9', marginTop: 2 }}>
                  {promoName(p.promotion)}
                </div>
              )}
            </div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12.5, fontWeight: 500 }}>
              {money(p.price * qty)}
            </div>
          </div>
        );
      })}
    </div>
  );
}
