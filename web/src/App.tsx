import { Suspense, lazy, type ReactNode } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { CartProvider } from './context/CartContext';
import { ProductsProvider } from './context/ProductsContext';
import { OrdersProvider } from './context/OrdersContext';
import { Shell } from './components/Shell';
import { Toast } from './components/Toast';
import { Home } from './pages/Home';
import { SignIn } from './pages/Auth/SignIn';
import { AccountSetup } from './pages/Auth/AccountSetup';
import { Shop } from './pages/Shop';
import { Product } from './pages/Product';
import { Cart } from './pages/Cart';
import { Checkout } from './pages/Checkout';
import { OrderPlaced } from './pages/OrderPlaced';
import { Orders } from './pages/Orders';
import { Updates } from './pages/Updates';
import { Community } from './pages/Community';
import { Account } from './pages/Account';

/**
 * The back office is a separate audience on the same domain, so residents
 * should not pay to download it. Lazily loaded, it stays out of the bundle
 * every shopper fetches and arrives only when someone opens /office.
 */
const OfficeApp = lazy(() =>
  import('./office/App').then((m) => ({ default: m.OfficeApp })),
);

function Splash() {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', color: '#6F6678', fontSize: 13 }}>
      Loading Gather…
    </div>
  );
}

function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <Splash />;
  if (!user) return <Navigate to="/" replace state={{ from: location }} />;
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <div style={{ display: 'flex', minWidth: 1280, minHeight: '100vh', background: '#F8F5F1' }}>
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/signin" element={<SignIn />} />
      <Route
        path="/setup"
        element={
          <RequireAuth>
            <AccountSetup />
          </RequireAuth>
        }
      />
      <Route
        element={
          <RequireAuth>
            <Shell />
          </RequireAuth>
        }
      >
        <Route path="/shop" element={<Shop />} />
        <Route path="/shop/:id" element={<Product />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/checkout/done" element={<OrderPlaced />} />
        <Route path="/orders" element={<Orders />} />
        <Route path="/updates" element={<Updates />} />
        <Route path="/community" element={<Community />} />
        <Route path="/account" element={<Account />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </div>
  );
}

/**
 * The resident storefront, with its providers. They wrap only this subtree:
 * the back office has its own auth and store, fetches nothing a resident
 * needs, and mounting the resident providers around it would have every
 * office page quietly loading a product catalogue on the side.
 */
function ResidentApp() {
  return (
    <AuthProvider>
      <ToastProvider>
        <CartProvider>
          <ProductsProvider>
            <OrdersProvider>
              <AppRoutes />
              <Toast />
            </OrdersProvider>
          </ProductsProvider>
        </CartProvider>
      </ToastProvider>
    </AuthProvider>
  );
}

/**
 * One site, two audiences. `/office` is the back office — retail and community
 * consoles behind their own sign-in — and everything else is the resident
 * storefront. They share a domain, a build and the API, and nothing else: the
 * two sessions use different localStorage keys, so a resident staying signed in
 * on the same browser does not disturb an office session, or vice versa.
 */
export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/office/*"
          element={
            <Suspense fallback={<Splash />}>
              <OfficeApp />
            </Suspense>
          }
        />
        <Route path="/*" element={<ResidentApp />} />
      </Routes>
    </BrowserRouter>
  );
}
