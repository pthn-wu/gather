import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { getBasketPromotions, getCategories, getProducts } from '../api/endpoints';
import type { BasketPromotion, Product } from '../api/types';
import { orderCategories } from '../utils/cutoff';
import { isBasketWide } from '../utils/promo';
import { useAuth } from './AuthContext';

// Fetches the resident's full product catalog once (unfiltered — the
// contract's category/q/sort params are for the Shop screen's own request,
// but every screen that needs live tier pricing — cart, checkout, order
// rail — shares this single fetch instead of re-querying per keystroke).
//
// v2 additions (CONTRACT.md §4.2–§4.4):
//  - `categories` is the community's category set, taken from the API rather
//    than a hardcoded list;
//  - the catalog is filtered to the products listed at the resident's
//    community (ProductCommunity), so a delisted item disappears;
//  - `basketPromotions` carries the bundle/threshold promotions surfaced as a
//    banner on the shop and a line on the cart.
interface ProductsContextValue {
  products: Product[];
  byId: Record<string, Product>;
  categories: string[];
  basketPromotions: BasketPromotion[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

const ProductsContext = createContext<ProductsContextValue | null>(null);

/**
 * Listing scope guard. The server already filters the catalog to the
 * resident's community; this drops anything that slipped through with an
 * explicit scope that excludes them, and anything the retail console has
 * deactivated.
 */
function isListedFor(p: Product, communityId: string | undefined): boolean {
  if (p.active === false) return false;
  if (!communityId || !p.communityIds || p.communityIds.length === 0) return true;
  return p.communityIds.includes(communityId);
}

export function ProductsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const communityId = user?.communityId;
  const [products, setProducts] = useState<Product[]>([]);
  const [apiCategories, setApiCategories] = useState<string[] | null>(null);
  const [basketPromotions, setBasketPromotions] = useState<BasketPromotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getProducts();
      setProducts(res.products);

      // The category set and the basket-wide promotions may ride along on the
      // catalog response; when they don't, ask for them separately. Both are
      // optional — a server that serves neither still renders correctly, with
      // tabs derived from the catalog and no promotion banner.
      if (res.categories) {
        setApiCategories(res.categories);
      } else {
        getCategories()
          .then((c) => setApiCategories(c.length ? c : null))
          .catch(() => setApiCategories(null));
      }

      if (res.promotions) {
        setBasketPromotions(res.promotions.filter(isBasketWide));
      } else {
        getBasketPromotions()
          .then((p) => setBasketPromotions(p.filter(isBasketWide)))
          .catch(() => setBasketPromotions([]));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load the sheet');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) refetch();
  }, [user, refetch]);

  const listed = useMemo(
    () => products.filter((p) => isListedFor(p, communityId)),
    [products, communityId],
  );

  const categories = useMemo(() => {
    const source = apiCategories ?? listed.map((p) => p.category);
    return orderCategories(source);
  }, [apiCategories, listed]);

  const byId = useMemo(() => {
    const map: Record<string, Product> = {};
    for (const p of listed) map[p.id] = p;
    return map;
  }, [listed]);

  const value = useMemo(
    () => ({ products: listed, byId, categories, basketPromotions, loading, error, refetch }),
    [listed, byId, categories, basketPromotions, loading, error, refetch],
  );

  return <ProductsContext.Provider value={value}>{children}</ProductsContext.Provider>;
}

export function useProducts() {
  const ctx = useContext(ProductsContext);
  if (!ctx) throw new Error('useProducts must be used within ProductsProvider');
  return ctx;
}
