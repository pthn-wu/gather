import React, { createContext, useContext, useMemo, useState } from "react";

type Cart = Record<string, number>;

interface CartValue {
  cart: Cart;
  count: number;
  add: (productId: string, qty?: number) => void;
  dec: (productId: string) => void;
  remove: (productId: string) => void;
  clear: () => void;
}

const Ctx = createContext<CartValue | null>(null);

/** Client-side until checkout, exactly as the web build does (CONTRACT.md §5). */
export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<Cart>({});

  const value = useMemo<CartValue>(() => {
    const count = Object.values(cart).reduce((a, n) => a + n, 0);
    return {
      cart,
      count,
      add: (id, qty = 1) => setCart((c) => ({ ...c, [id]: (c[id] ?? 0) + qty })),
      dec: (id) =>
        setCart((c) => {
          const next = { ...c };
          const v = (next[id] ?? 0) - 1;
          if (v <= 0) delete next[id];
          else next[id] = v;
          return next;
        }),
      remove: (id) =>
        setCart((c) => {
          const next = { ...c };
          delete next[id];
          return next;
        }),
      clear: () => setCart({}),
    };
  }, [cart]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCart(): CartValue {
  const v = useContext(Ctx);
  if (!v) throw new Error("useCart must be used inside CartProvider");
  return v;
}
