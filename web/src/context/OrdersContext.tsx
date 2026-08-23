import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { getOrders } from '../api/endpoints';
import type { Order } from '../api/types';
import { useAuth } from './AuthContext';

// Fetches the resident's full order history once (unfiltered) so both the
// sidebar's "Orders" badge and the Orders screen's tabs/search/sort — which
// mirror the prototype's fully client-side filtering — share one source of
// truth instead of re-fetching per filter click.
interface OrdersContextValue {
  orders: Order[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

const OrdersContext = createContext<OrdersContextValue | null>(null);

export function OrdersProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getOrders({ filter: 'all', sort: 'new' });
      setOrders(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load your orders');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) refetch();
  }, [user, refetch]);

  const value = useMemo(() => ({ orders, loading, error, refetch }), [orders, loading, error, refetch]);

  return <OrdersContext.Provider value={value}>{children}</OrdersContext.Provider>;
}

export function useOrders() {
  const ctx = useContext(OrdersContext);
  if (!ctx) throw new Error('useOrders must be used within OrdersProvider');
  return ctx;
}
