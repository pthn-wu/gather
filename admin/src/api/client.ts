import type {
  AdminUser,
  Announcement,
  CashUp,
  Community,
  FulfilmentRun,
  Household,
  LoginResponse,
  Order,
  Product,
  Promotion,
  VerificationRequest,
  WishlistRow,
} from "./types";

const API_URL = (import.meta.env.VITE_API_URL || "http://localhost:4000").replace(/\/$/, "");
const TOKEN_KEY = "gather_admin_token";
const ADMIN_KEY = "gather_admin_user";

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function getStoredAdmin(): AdminUser | null {
  try {
    const raw = localStorage.getItem(ADMIN_KEY);
    return raw ? (JSON.parse(raw) as AdminUser) : null;
  } catch {
    return null;
  }
}

export function setSession(token: string, admin: AdminUser, remember: boolean) {
  try {
    if (remember) {
      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(ADMIN_KEY, JSON.stringify(admin));
    } else {
      sessionStorage.setItem(TOKEN_KEY, token);
    }
  } catch {
    /* storage unavailable — session stays in memory only */
  }
}

export function clearSession() {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(ADMIN_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

/** Thrown when the API host cannot be reached at all (backend not running). */
export class OfflineError extends Error {}

let memoryToken: string | null = null;
export const setMemoryToken = (t: string | null) => {
  memoryToken = t;
};

async function request<T>(
  path: string,
  options: { method?: string; body?: unknown } = {}
): Promise<T> {
  const token = memoryToken || getToken() || sessionStorage.getItem(TOKEN_KEY);
  let res: Response;
  try {
    res = await fetch(API_URL + path, {
      method: options.method ?? "GET",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });
  } catch {
    throw new OfflineError(`Cannot reach the API at ${API_URL}`);
  }

  if (res.status === 401) clearSession();

  if (!res.ok) {
    let message = res.statusText || `Request failed (${res.status})`;
    try {
      const data = await res.json();
      if (data?.error) message = data.error;
    } catch {
      /* not JSON */
    }
    throw new ApiError(message, res.status);
  }

  if (res.status === 204) return undefined as T;
  const text = await res.text();
  return text ? (JSON.parse(text) as T) : (undefined as T);
}

function qs(params: Record<string, string | undefined>): string {
  const entries = Object.entries(params).filter(([, v]) => v !== undefined && v !== "");
  if (!entries.length) return "";
  return "?" + new URLSearchParams(entries as [string, string][]).toString();
}


/**
 * The v2 server and this console disagree on two field names. Normalising here,
 * at the single boundary, keeps every screen free of defensive reads:
 *   product.units      -> unitsThisCycle
 *   demand.households  -> householdCount, demand.communities[] -> communitiesLabel
 */
const normProduct = (p: any): Product => ({
  ...p,
  unitsThisCycle: p.unitsThisCycle ?? p.units ?? 0,
  prices: p.prices ?? [p.price0, p.price1, p.price2, p.price3],
  communityIds: p.communityIds ?? [],
});

const normDemand = (w: any): WishlistRow => ({
  ...w,
  householdCount: w.householdCount ?? w.households ?? 0,
  communitiesLabel:
    w.communitiesLabel ?? (Array.isArray(w.communities) ? w.communities.join(", ") : ""),
});

const list = <T>(path: string) => request<{ data: T[] }>(path).then((r) => r?.data ?? []);

export interface OverviewPayload {
  kpis: { value: string; label: string; note: string; tone?: string }[];
  board: {
    communityId: string;
    community: string;
    sub?: string;
    orders: number;
    units: number;
    value: number;
    margin?: number;
    marginPct?: number;
    stage: string;
  }[];
  todos: { id: string; title: string; body: string; cta: string; target?: string }[];
  movers: { name: string; note: string; units: number }[];
}

export const api = {
  login(username: string, password: string, communityId?: string) {
    return request<LoginResponse>("/api/admin/login", {
      method: "POST",
      body: { username, password, ...(communityId ? { communityId } : {}) },
    });
  },

  retail: {
    overview: (scope: string) => request<OverviewPayload>(`/api/admin/retail/overview${qs({ scope })}`),

    products: (params: { q?: string; category?: string } = {}) =>
      list<any>(`/api/admin/retail/products${qs(params)}`).then((r) => r.map(normProduct)),
    createProduct: (input: Partial<Product>) =>
      request<any>("/api/admin/retail/products", { method: "POST", body: input }).then(normProduct),
    updateProduct: (id: string, input: Partial<Product> & { communityIds?: string[] }) =>
      request<any>(`/api/admin/retail/products/${id}`, { method: "PATCH", body: input }).then(normProduct),
    deleteProduct: (id: string) =>
      request<void>(`/api/admin/retail/products/${id}`, { method: "DELETE" }),
    bulkProducts: (rows: Record<string, unknown>[]) =>
      request<{ updated: number; created: number }>("/api/admin/retail/products/bulk", {
        method: "POST",
        body: { rows },
      }),

    promotions: () => list<Promotion>("/api/admin/retail/promotions"),
    createPromotion: (input: Partial<Promotion>) =>
      request<Promotion>("/api/admin/retail/promotions", { method: "POST", body: input }),
    updatePromotion: (id: string, input: Partial<Promotion>) =>
      request<Promotion>(`/api/admin/retail/promotions/${id}`, { method: "PATCH", body: input }),
    bulkPromotions: (rows: Record<string, unknown>[]) =>
      request<{ created: number }>("/api/admin/retail/promotions/bulk", {
        method: "POST",
        body: { rows },
      }),

    fulfilment: (communityId: string) =>
      request<FulfilmentRun>(`/api/admin/retail/fulfilment/${communityId}`),
    updatePickLines: (communityId: string, lines: { productId: string; pickedQty: number }[]) =>
      request<void>(`/api/admin/retail/fulfilment/${communityId}/lines`, {
        method: "PATCH",
        body: { lines },
      }),
    advanceStage: (communityId: string) =>
      request<{ stage: string }>(`/api/admin/retail/fulfilment/${communityId}/advance`, {
        method: "POST",
      }),

    cycles: () => list<Community>("/api/admin/retail/cycles"),
    updateCycle: (
      communityId: string,
      input: { cutoffDate?: string; deliveryDate?: string; collectPoint?: string }
    ) => request<Community>(`/api/admin/retail/cycles/${communityId}`, { method: "PATCH", body: input }),
    publishCycle: (communityId: string) =>
      request<void>(`/api/admin/retail/cycles/${communityId}/publish`, { method: "POST" }),
    bulkCycles: (rows: Record<string, unknown>[]) =>
      request<void>("/api/admin/retail/cycles/bulk", { method: "POST", body: { rows } }),

    demand: () => list<any>("/api/admin/retail/demand").then((r) => r.map(normDemand)),
    addToCatalog: (id: string) =>
      request<any>(`/api/admin/retail/demand/${id}/add-to-catalog`, { method: "POST" }).then(normProduct),
  },

  office: {
    verifications: () => list<VerificationRequest>("/api/admin/office/verifications"),
    verificationLog: () =>
      list<{ text: string; when: string; tone: string }>("/api/admin/office/verifications/log"),
    approveVerification: (id: string) =>
      request<{ tempPassword: string; household: Household }>(
        `/api/admin/office/verifications/${id}/approve`,
        { method: "POST" }
      ),
    holdVerification: (id: string) =>
      request<void>(`/api/admin/office/verifications/${id}/hold`, { method: "POST" }),
    rejectVerification: (id: string) =>
      request<void>(`/api/admin/office/verifications/${id}/reject`, { method: "POST" }),

    roster: (q?: string) => list<Household>(`/api/admin/office/roster${qs({ q })}`),
    createHousehold: (input: Partial<Household>) =>
      request<Household>("/api/admin/office/roster", { method: "POST", body: input }),
    updateHousehold: (id: string, input: Partial<Household>) =>
      request<Household>(`/api/admin/office/roster/${id}`, { method: "PATCH", body: input }),
    bulkRoster: (rows: Record<string, unknown>[]) =>
      request<{ added: number; updated: number }>("/api/admin/office/roster/bulk", {
        method: "POST",
        body: { rows },
      }),
    issueAccounts: (userIds: string[]) =>
      request<{ data: { userId: string; username: string; tempPassword: string }[] }>(
        "/api/admin/office/roster/issue-accounts",
        { method: "POST", body: { userIds } }
      ),
    resetPassword: (id: string) =>
      request<{ tempPassword: string }>(`/api/admin/office/roster/${id}/reset-password`, {
        method: "POST",
      }),
    suspend: (id: string) =>
      request<Household>(`/api/admin/office/roster/${id}/suspend`, { method: "POST" }),

    orders: (filter: string) => list<Order>(`/api/admin/office/orders${qs({ filter })}`),

    collection: () =>
      request<{ stats: { label: string; value: string }[]; rows: Order[] }>(
        "/api/admin/office/collection"
      ),
    tickCollection: (orderIds: string[], collected: boolean, collectedBy?: string) =>
      request<void>("/api/admin/office/collection/tick", {
        method: "POST",
        body: { orderIds, collected, ...(collectedBy ? { collectedBy } : {}) },
      }),
    closeCollection: () =>
      request<void>("/api/admin/office/collection/close", { method: "POST" }),

    payments: () => list<Order>("/api/admin/office/payments"),
    markPaid: (orderId: string) =>
      request<Order>(`/api/admin/office/payments/${orderId}/mark-paid`, { method: "POST" }),
    bulkReconcile: (rows: { orderCode: string; amount: number; method: string }[]) =>
      request<{ matched: number }>("/api/admin/office/payments/bulk-reconcile", {
        method: "POST",
        body: { rows },
      }),
    cashup: () => request<CashUp>("/api/admin/office/cashup"),
    submitCashup: (countedAmount: number) =>
      request<CashUp>("/api/admin/office/cashup", { method: "POST", body: { countedAmount } }),

    setup: () => request<Community>("/api/admin/office/setup"),
    updateSetup: (input: Partial<Community>) =>
      request<Community>("/api/admin/office/setup", { method: "PATCH", body: input }),

    announcements: () => list<Announcement>("/api/admin/office/announcements"),
    createAnnouncement: (input: { title: string; body: string; isDraft: boolean }) =>
      request<Announcement>("/api/admin/office/announcements", { method: "POST", body: input }),
    updateAnnouncement: (id: string, input: Partial<Announcement>) =>
      request<Announcement>(`/api/admin/office/announcements/${id}`, {
        method: "PATCH",
        body: input,
      }),
  },
};

export { API_URL };
