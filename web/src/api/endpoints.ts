import { api } from './client';
import {
  isPublishedAlert,
  normalizeAlert,
  normalizeBasketPromotion,
  normalizeProduct,
  normalizeProductDetail,
} from './normalize';
import type {
  Activity,
  Alert,
  BasketPromotion,
  Community,
  Order,
  OrderStatus,
  PaymentMethod,
  Product,
  ProductDetail,
  Split,
  User,
  Wishlist,
} from './types';

// ---- Public ----
export const getCommunities = () => api.get<{ data: Community[] }>('/api/communities').then((r) => r.data);

// ---- Resident auth ----
export const login = (username: string, password: string) =>
  api.post<{ token: string; user: User; mustSetPassword: boolean }>('/api/auth/login', { username, password });

export const getMe = () => api.get<{ user: User; community: Community }>('/api/auth/me');

export const setupAccount = (payload: {
  displayName: string;
  username: string;
  password: string;
  avatarIndex?: number;
  avatarPhoto?: string | null;
}) => api.post<{ user: User }>('/api/auth/setup', payload);

export const updateProfile = (payload: {
  displayName?: string;
  username?: string;
  avatarIndex?: number;
  avatarPhoto?: string | null;
}) => api.patch<User>('/api/auth/profile', payload);

export const updatePassword = (password: string) => api.post<{ ok: boolean }>('/api/auth/password', { password });

// ---- Shop ----

/**
 * The catalog, already scoped by the server to the resident's community
 * (ProductCommunity listing scope) — a delisted item simply is not in `data`.
 *
 * The v2 server may also ride the community's category set and any basket-wide
 * promotions along on this response; both are optional and fetched separately
 * when missing (see `getCategories` / `getBasketPromotions`).
 */
export const getProducts = async (
  params: { category?: string; q?: string; sort?: 'pop' | 'price' | 'save' } = {},
): Promise<{ products: Product[]; categories?: string[]; promotions?: BasketPromotion[] }> => {
  const qs = new URLSearchParams();
  if (params.category && params.category !== 'All') qs.set('category', params.category);
  if (params.q) qs.set('q', params.q);
  if (params.sort) qs.set('sort', params.sort);
  const suffix = qs.toString() ? `?${qs.toString()}` : '';
  const raw = await api.get<{ data: unknown[]; categories?: unknown; promotions?: unknown }>(
    `/api/products${suffix}`,
  );
  return {
    products: (raw.data ?? []).map((p: unknown) => normalizeProduct<Product>(p)),
    categories: readCategoryList(raw.categories),
    promotions: readPromotionList(raw.promotions),
  };
};

function readCategoryList(raw: unknown): string[] | undefined {
  const rows = Array.isArray(raw) ? raw : Array.isArray((raw as any)?.data) ? (raw as any).data : null;
  if (!rows) return undefined;
  const out = rows
    .map((c: unknown) =>
      typeof c === 'string' ? c : typeof (c as any)?.name === 'string' ? (c as any).name : undefined,
    )
    .filter((c: unknown): c is string => typeof c === 'string' && c.trim().length > 0);
  return out.length ? out : undefined;
}

function readPromotionList(raw: unknown): BasketPromotion[] | undefined {
  const rows = Array.isArray(raw) ? raw : Array.isArray((raw as any)?.data) ? (raw as any).data : null;
  if (!rows) return undefined;
  return rows
    .map(normalizeBasketPromotion)
    .filter((p: BasketPromotion | null): p is BasketPromotion => p !== null);
}

/**
 * The 7-category set for this community. Optional endpoint — callers fall back
 * to deriving the tabs from the catalog itself when it is not served.
 */
export const getCategories = () =>
  api.get<unknown>('/api/categories').then((r) => readCategoryList(r) ?? []);

/**
 * Basket-wide (`bundle` / `threshold`) promotions live at the resident's
 * community. Optional endpoint — no banner is shown if it is not served.
 */
export const getBasketPromotions = () =>
  api.get<unknown>('/api/promotions').then((r) => readPromotionList(r) ?? []);

interface RawComment {
  id: string;
  productId: string;
  text: string;
  createdAt: string;
  user?: { id: string; displayName: string; block: string; unit: string; avatarIndex: number; avatarPhoto: string | null };
}

export const getProduct = (id: string): Promise<ProductDetail> =>
  api.get<Omit<ProductDetail, 'comments'> & { comments: RawComment[] }>(`/api/products/${id}`).then((p) => ({
    ...normalizeProductDetail(p),
    comments: (p.comments ?? []).map((c) => ({
      id: c.id,
      productId: c.productId,
      userId: c.user?.id ?? '',
      text: c.text,
      createdAt: c.createdAt,
      authorName: c.user?.displayName,
      authorUnit: c.user ? `Blk ${c.user.block} #${c.user.unit}` : undefined,
      authorAvatarIndex: c.user?.avatarIndex,
      authorAvatarPhoto: c.user?.avatarPhoto,
    })),
  }));

export const postComment = (productId: string, text: string) =>
  api.post<{ id: string }>(`/api/products/${productId}/comments`, { text });

// ---- Orders ----
export const createOrder = (payload: {
  lines: { productId: string; qty: number }[];
  paymentMethod: PaymentMethod;
  note: string;
}) => api.post<Order>('/api/orders', payload);

export const getOrders = (params: { query?: string; filter?: string; sort?: string } = {}) => {
  const qs = new URLSearchParams();
  if (params.query) qs.set('query', params.query);
  if (params.filter) qs.set('filter', params.filter);
  if (params.sort) qs.set('sort', params.sort);
  const suffix = qs.toString() ? `?${qs.toString()}` : '';
  return api.get<{ data: Order[] }>(`/api/orders${suffix}`).then((r) => r.data);
};

export const getOrder = (id: string) => api.get<Order>(`/api/orders/${id}`);

export const payOrder = (id: string) => api.post<Order>(`/api/orders/${id}/pay`);

export type { OrderStatus };

// ---- Community social ----
export const getWishlist = () => api.get<{ data: Wishlist[] }>('/api/wishlist').then((r) => r.data);
export const addWishlistItem = (name: string, note: string) =>
  api.post<Wishlist>('/api/wishlist', { name, note });
export const voteWishlistItem = (id: string) => api.post<Wishlist>(`/api/wishlist/${id}/vote`);

export const getSplits = () => api.get<{ data: Split[] }>('/api/splits').then((r) => r.data);
export const addSplit = (payload: { productId: string; detail: string; neededCount: number }) =>
  api.post<Split>('/api/splits', payload);
export const joinSplit = (id: string) => api.post<Split>(`/api/splits/${id}/join`);

export const getActivity = () => api.get<{ data: Activity[] }>('/api/activity').then((r) => r.data);

/**
 * Published announcements for this community. Drafts written in the office
 * console are filtered out here so no screen can render one by accident.
 */
export const getAlerts = () =>
  api
    .get<{ data: unknown[] }>('/api/alerts')
    .then((r) => (r.data ?? []).map(normalizeAlert).filter(isPublishedAlert));
