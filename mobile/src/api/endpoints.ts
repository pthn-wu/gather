import { http, saveToken } from "./client";
import type {
  Activity, Alert, AppliedPromotion, Category, Community, Order, PaymentMethod,
  Product, ProductDetail, Split, User, Wishlist,
} from "./types";

const unwrap = <T>(r: { data: T[] }) => r.data ?? [];

// ---- public ----
export const getCommunities = () =>
  http.get<{ data: Community[] }>("/api/communities").then(unwrap);

// ---- auth ----
export const login = async (username: string, password: string) => {
  const res = await http.post<{ token: string; user: User; mustSetPassword: boolean }>(
    "/api/auth/login",
    { username, password }
  );
  await saveToken(res.token);
  return res;
};

export const getMe = () => http.get<{ user: User; community: Community }>("/api/auth/me");

export const setupAccount = (payload: {
  displayName: string; username: string; password: string;
  avatarIndex?: number; avatarPhoto?: string | null;
}) => http.post<{ user: User }>("/api/auth/setup", payload);

export const updateProfile = (payload: {
  displayName?: string; username?: string; avatarIndex?: number; avatarPhoto?: string | null;
}) => http.patch<User>("/api/auth/profile", payload);

export const updatePassword = (password: string) =>
  http.post<{ ok: boolean }>("/api/auth/password", { password });

// ---- shop ----
/** Already scoped by the server to this resident's community listing. */
export const getProducts = (params: { category?: string; q?: string; sort?: string } = {}) => {
  const qs = new URLSearchParams();
  if (params.category && params.category !== "All") qs.set("category", params.category);
  if (params.q) qs.set("q", params.q);
  if (params.sort) qs.set("sort", params.sort);
  const suffix = qs.toString() ? `?${qs}` : "";
  return http.get<{ data: Product[] }>(`/api/products${suffix}`).then(unwrap);
};

/** The seven v2 categories with live counts for this community. */
export const getCategories = () =>
  http.get<{ data: Category[] }>("/api/categories").then(unwrap);

/** Basket-wide (bundle / threshold) promotions — shown as a banner, not per line. */
export const getBasketPromotions = () =>
  http.get<{ data: AppliedPromotion[] }>("/api/promotions").then(unwrap);

export const getProduct = (id: string) => http.get<ProductDetail>(`/api/products/${id}`);

export const postComment = (productId: string, text: string) =>
  http.post(`/api/products/${productId}/comments`, { text });

// ---- orders ----
export const createOrder = (payload: {
  lines: { productId: string; qty: number }[];
  paymentMethod: PaymentMethod;
  note: string;
}) => http.post<Order>("/api/orders", payload);

export const getOrders = (params: { query?: string; filter?: string; sort?: string } = {}) => {
  const qs = new URLSearchParams();
  if (params.query) qs.set("query", params.query);
  if (params.filter) qs.set("filter", params.filter);
  if (params.sort) qs.set("sort", params.sort);
  const suffix = qs.toString() ? `?${qs}` : "";
  return http.get<{ data: Order[] }>(`/api/orders${suffix}`).then(unwrap);
};

export const payOrder = (id: string) => http.post<Order>(`/api/orders/${id}/pay`);

// ---- community ----
export const getWishlist = () => http.get<{ data: Wishlist[] }>("/api/wishlist").then(unwrap);
export const addWishlistItem = (name: string, note: string) =>
  http.post<Wishlist>("/api/wishlist", { name, note });
export const voteWishlistItem = (id: string) => http.post<Wishlist>(`/api/wishlist/${id}/vote`);

export const getSplits = () => http.get<{ data: Split[] }>("/api/splits").then(unwrap);
export const addSplit = (payload: { productId: string; detail: string; neededCount: number }) =>
  http.post<Split>("/api/splits", payload);
export const joinSplit = (id: string) => http.post<Split>(`/api/splits/${id}/join`);

export const getActivity = () => http.get<{ data: Activity[] }>("/api/activity").then(unwrap);

/** Published announcements only — drafts are filtered server-side and again here. */
export const getAlerts = () =>
  http.get<{ data: Alert[] }>("/api/alerts").then((r) => unwrap(r).filter((a) => !a.isDraft));
