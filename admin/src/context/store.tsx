import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";
import { api, OfflineError } from "../api/client";
import * as fx from "../api/fixtures";
import type {
  Announcement,
  Community,
  FulfilmentStage,
  Household,
  Order,
  Product,
  Promotion,
  VerificationLogEntry,
  VerificationRequest,
  WishlistRow,
} from "../api/types";
import { useAuth } from "./AuthContext";

interface Store {
  /** true once a request has failed with a network error — fixtures are showing. */
  offline: boolean;

  communities: Community[];
  setCommunities: React.Dispatch<React.SetStateAction<Community[]>>;
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  promotions: Promotion[];
  setPromotions: React.Dispatch<React.SetStateAction<Promotion[]>>;
  households: Household[];
  setHouseholds: React.Dispatch<React.SetStateAction<Household[]>>;
  verifications: VerificationRequest[];
  setVerifications: React.Dispatch<React.SetStateAction<VerificationRequest[]>>;
  verificationLog: VerificationLogEntry[];
  setVerificationLog: React.Dispatch<React.SetStateAction<VerificationLogEntry[]>>;
  orders: Order[];
  setOrders: React.Dispatch<React.SetStateAction<Order[]>>;
  wishlist: WishlistRow[];
  setWishlist: React.Dispatch<React.SetStateAction<WishlistRow[]>>;
  announcements: Announcement[];
  setAnnouncements: React.Dispatch<React.SetStateAction<Announcement[]>>;

  /** Navigation: which screen each console is on, and the top-bar scope. */
  retailScreen: string;
  setRetailScreen: (k: string) => void;
  officeScreen: string;
  setOfficeScreen: (k: string) => void;
  /** Office console scope — always exactly one community. */
  scope: string;
  setScope: (v: string) => void;
  /** Retail console scope — "all" or a community id. */
  retailScope: string;
  setRetailScope: (v: string) => void;
  /** Community whose pick sheet the Fulfilment screen is showing. */
  fulComm: string;
  setFulComm: (v: string) => void;

  fulStage: Record<string, FulfilmentStage>;
  setFulStage: React.Dispatch<React.SetStateAction<Record<string, FulfilmentStage>>>;
  pickedQty: Record<string, string>;
  setPickedQty: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  ticked: string[];
  setTicked: React.Dispatch<React.SetStateAction<string[]>>;
  cashCount: string;
  setCashCount: (v: string) => void;

  /** Fire a contract call; network failures degrade to local-only state. */
  push: <T>(fn: () => Promise<T>) => Promise<T | undefined>;
  communityById: (id: string) => Community;
}

const StoreContext = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const { admin } = useAuth();
  const role = admin?.role ?? "retail";

  const [offline, setOffline] = useState(false);
  const [communities, setCommunities] = useState<Community[]>(fx.COMMUNITIES);
  const [products, setProducts] = useState<Product[]>(() =>
    role === "retail" ? fx.PRODUCTS : fx.PRODUCTS.map(stripCost)
  );
  const [promotions, setPromotions] = useState<Promotion[]>(fx.PROMOTIONS);
  const [households, setHouseholds] = useState<Household[]>(fx.HOUSEHOLDS);
  const [verifications, setVerifications] = useState<VerificationRequest[]>(fx.VERIFICATIONS);
  const [verificationLog, setVerificationLog] = useState<VerificationLogEntry[]>(
    fx.VERIFICATION_LOG
  );
  const [orders, setOrders] = useState<Order[]>(fx.ORDERS);
  const [wishlist, setWishlist] = useState<WishlistRow[]>(fx.WISHLIST);
  const [announcements, setAnnouncements] = useState<Announcement[]>(fx.ANNOUNCEMENTS);

  const [retailScreen, setRetailScreen] = useState("overview");
  const [officeScreen, setOfficeScreen] = useState("verify");
  const [scope, setScope] = useState(admin?.communityId ?? "G1");
  const [retailScope, setRetailScope] = useState("all");
  const [fulComm, setFulComm] = useState("G1");

  const [fulStage, setFulStage] = useState<Record<string, FulfilmentStage>>({
    G1: "picking",
    G2: "confirmed",
    G3: "open",
    G4: "open",
  });
  const [pickedQty, setPickedQty] = useState<Record<string, string>>({});
  const [ticked, setTicked] = useState<string[]>(["1", "4"]);
  const [cashCount, setCashCount] = useState("");

  const push = useCallback(async <T,>(fn: () => Promise<T>): Promise<T | undefined> => {
    try {
      return await fn();
    } catch (e) {
      if (e instanceof OfflineError) {
        setOffline(true);
        return undefined;
      }
      // Contract-level errors are surfaced by the caller's own toast copy.
      return undefined;
    }
  }, []);

  /* Hydrate from the v2 API. Anything that fails keeps its fixture value and
     flips the offline banner on, so the console stays walkable.

     NOTE: no `hydrated` ref guard here. Under React StrictMode the effect runs,
     is cleaned up (which flips `alive` false, discarding the first run's
     in-flight results), then runs again — so a ref guard that blocks the second
     run leaves every screen showing fixtures while the real API data is thrown
     away. Re-running on `admin` is cheap and correct; `alive` alone is enough to
     stop a stale response from landing after unmount. */
  useEffect(() => {
    if (!admin) return;
    let alive = true;

    const load = async <T,>(fn: () => Promise<T>, apply: (v: T) => void) => {
      try {
        const v = await fn();
        if (alive && v !== undefined && v !== null) apply(v);
      } catch (e) {
        if (e instanceof OfflineError) setOffline(true);
      }
    };

    void load(
      () => (admin.role === "retail" ? api.retail.cycles() : api.office.setup().then((c) => [c])),
      (v) => v.length && setCommunities(v)
    );

    if (admin.role === "retail") {
      void load(
        () => api.retail.products(),
        (v) => v.length && setProducts(v)
      );
      void load(
        () => api.retail.promotions(),
        (v) => v.length && setPromotions(v)
      );
      void load(
        () => api.retail.demand(),
        (v) => v.length && setWishlist(v)
      );
    } else {
      void load(
        () => api.office.roster(),
        (v) => v.length && setHouseholds(v)
      );
      void load(
        () => api.office.verifications(),
        (v) => setVerifications(v)
      );
      void load(
        () => api.office.verificationLog(),
        (v) =>
          v.length &&
          setVerificationLog(
            v.map((l) => ({ text: l.text, when: l.when, tone: (l.tone as "ok") ?? "ok" }))
          )
      );
      void load(
        () => api.office.orders("all"),
        (v) => v.length && setOrders(v)
      );
      void load(
        () => api.office.announcements(),
        (v) => v.length && setAnnouncements(v)
      );
    }

    return () => {
      alive = false;
    };
  }, [admin]);

  const communityById = useCallback(
    (id: string) => communities.find((c) => c.id === id) ?? communities[0],
    [communities]
  );

  const value = useMemo<Store>(
    () => ({
      offline,
      communities, setCommunities,
      products, setProducts,
      promotions, setPromotions,
      households, setHouseholds,
      verifications, setVerifications,
      verificationLog, setVerificationLog,
      orders, setOrders,
      wishlist, setWishlist,
      announcements, setAnnouncements,
      retailScreen, setRetailScreen,
      officeScreen, setOfficeScreen,
      scope, setScope,
      retailScope, setRetailScope,
      fulComm, setFulComm,
      fulStage, setFulStage,
      pickedQty, setPickedQty,
      ticked, setTicked,
      cashCount, setCashCount,
      push,
      communityById,
    }),
    [
      offline, communities, products, promotions, households, verifications, verificationLog,
      orders, wishlist, announcements, fulStage, pickedQty, ticked, cashCount, push, communityById,
      retailScreen, officeScreen, scope, retailScope, fulComm,
    ]
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

function stripCost(p: Product): Product {
  const { cost: _cost, ...rest } = p;
  return rest as Product;
}

export function useStore(): Store {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}
