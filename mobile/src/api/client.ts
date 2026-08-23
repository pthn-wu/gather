import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

/**
 * On a simulator `localhost` reaches the host machine. On a physical device it
 * does not — set EXPO_PUBLIC_API_URL to the host's LAN IP (see README).
 */
export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:4000";

const TOKEN_KEY = "gather.token";

/* SecureStore is unavailable on web; fall back to localStorage there so the
   Expo web build (which is how this app gets smoke-tested in CI) still works. */
const store = {
  async get(): Promise<string | null> {
    if (Platform.OS === "web") {
      try {
        return globalThis.localStorage?.getItem(TOKEN_KEY) ?? null;
      } catch {
        return null;
      }
    }
    try {
      return await SecureStore.getItemAsync(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  async set(v: string) {
    if (Platform.OS === "web") {
      try {
        globalThis.localStorage?.setItem(TOKEN_KEY, v);
      } catch {
        /* private mode */
      }
      return;
    }
    try {
      await SecureStore.setItemAsync(TOKEN_KEY, v);
    } catch {
      /* keychain unavailable */
    }
  },
  async clear() {
    if (Platform.OS === "web") {
      try {
        globalThis.localStorage?.removeItem(TOKEN_KEY);
      } catch {
        /* ignore */
      }
      return;
    }
    try {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
    } catch {
      /* ignore */
    }
  },
};

let memoryToken: string | null = null;
let onUnauthorized: (() => void) | null = null;

export const setUnauthorizedHandler = (fn: (() => void) | null) => {
  onUnauthorized = fn;
};

export async function loadToken(): Promise<string | null> {
  if (memoryToken) return memoryToken;
  memoryToken = await store.get();
  return memoryToken;
}

export async function saveToken(token: string) {
  memoryToken = token;
  await store.set(token);
}

export async function clearToken() {
  memoryToken = null;
  await store.clear();
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(
  path: string,
  opts: { method?: string; body?: unknown } = {}
): Promise<T> {
  const token = await loadToken();
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method: opts.method ?? "GET",
      headers: {
        ...(opts.body ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    });
  } catch {
    throw new ApiError(`Cannot reach Gather at ${API_URL}`, 0);
  }

  if (res.status === 401) {
    await clearToken();
    onUnauthorized?.();
    throw new ApiError("Your session expired — sign in again", 401);
  }

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    throw new ApiError(data?.error ?? `Request failed (${res.status})`, res.status);
  }
  return data as T;
}

export const http = {
  get: <T>(p: string) => request<T>(p),
  post: <T>(p: string, body?: unknown) => request<T>(p, { method: "POST", body }),
  patch: <T>(p: string, body?: unknown) => request<T>(p, { method: "PATCH", body }),
};
