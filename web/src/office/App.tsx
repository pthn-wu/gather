import { AuthProvider, useAuth } from "./context/AuthContext";
import { StoreProvider, useStore } from "./context/store";
import { ToastProvider } from "./context/ToastContext";
import { ImportProvider } from "./components/ImportModal";
import Shell from "./components/Shell";
import ConsolePicker from "./pages/ConsolePicker";
import SignIn from "./pages/SignIn";

import "./styles.css";

import Overview from "./pages/retail/Overview";
import Catalog from "./pages/retail/Catalog";
import Promotions from "./pages/retail/Promotions";
import Fulfilment from "./pages/retail/Fulfilment";
import Cycles from "./pages/retail/Cycles";
import Demand from "./pages/retail/Demand";

import Verification from "./pages/office/Verification";
import Households from "./pages/office/Households";
import Orders from "./pages/office/Orders";
import Collection from "./pages/office/Collection";
import Payments from "./pages/office/Payments";
import CycleSetup from "./pages/office/CycleSetup";
import Announcements from "./pages/office/Announcements";

const RETAIL_SCREENS: Record<string, () => JSX.Element> = {
  overview: Overview,
  catalog: Catalog,
  promos: Promotions,
  fulfil: Fulfilment,
  cycles: Cycles,
  demand: Demand,
};

const OFFICE_SCREENS: Record<string, () => JSX.Element> = {
  verify: Verification,
  roster: Households,
  orders: Orders,
  collect: Collection,
  pay: Payments,
  setup: CycleSetup,
  announce: Announcements,
};

function Console() {
  const { role } = useAuth();
  const s = useStore();
  const retail = role === "retail";
  const key = retail ? s.retailScreen : s.officeScreen;
  const Screen = (retail ? RETAIL_SCREENS : OFFICE_SCREENS)[key] ?? (retail ? Overview : Verification);
  return (
    <Shell>
      <Screen />
    </Shell>
  );
}

/**
 * Gate: console picker -> sign-in -> the console itself. `stage` lives in
 * AuthContext so a stored session skips straight past the gate.
 */
function Router() {
  const { phase, admin } = useAuth();
  if (phase === "app" && admin) {
    return (
      <StoreProvider>
        <ImportProvider>
          <Console />
        </ImportProvider>
      </StoreProvider>
    );
  }
  return phase === "auth" ? <SignIn /> : <ConsolePicker />;
}

export function OfficeApp() {
  return (
    <AuthProvider>
      <ToastProvider>
        <Router />
      </ToastProvider>
    </AuthProvider>
  );
}
