import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

// Cart is client-side only until checkout, per CONTRACT.md's non-goals —
// checkout is what actually creates the real Order server-side.
export type CartMap = Record<string, number>;

const STORAGE_KEY = 'gather_cart';

function loadCart(): CartMap {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as CartMap) : {};
  } catch {
    return {};
  }
}

interface CartContextValue {
  cart: CartMap;
  addTo: (productId: string, n: number) => void;
  setQty: (productId: string, qty: number) => void;
  remove: (productId: string) => void;
  clear: () => void;
  count: number;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<CartMap>(() => loadCart());

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
    } catch {
      // ignore storage errors
    }
  }, [cart]);

  const addTo = useCallback((productId: string, n: number) => {
    setCart((prev) => {
      const next = { ...prev };
      next[productId] = (next[productId] || 0) + n;
      return next;
    });
  }, []);

  const setQty = useCallback((productId: string, qty: number) => {
    setCart((prev) => {
      const next = { ...prev };
      if (qty <= 0) delete next[productId];
      else next[productId] = qty;
      return next;
    });
  }, []);

  const remove = useCallback((productId: string) => {
    setCart((prev) => {
      const next = { ...prev };
      delete next[productId];
      return next;
    });
  }, []);

  const clear = useCallback(() => setCart({}), []);

  const count = useMemo(() => Object.values(cart).reduce((a, b) => a + b, 0), [cart]);

  const value = useMemo(
    () => ({ cart, addTo, setQty, remove, clear, count }),
    [cart, addTo, setQty, remove, clear, count],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
