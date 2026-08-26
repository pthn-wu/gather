import { useEffect, useMemo, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import logo from '../assets/gather-logo-web.png';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useOrders } from '../context/OrdersContext';
import { getAlerts } from '../api/endpoints';
import { CartButton } from './CartButton';
import { collectPoint, collectionWindow, cutoffIso, deliveryDay, formatCutoff } from '../utils/cycle';

function useCountdown(cutoffAt: string | undefined) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  return useMemo(() => {
    if (!cutoffAt) return '—';
    const left = Math.max(0, new Date(cutoffAt).getTime() - now);
    const dd = Math.floor(left / 86400000);
    const hh = Math.floor(left / 3600000) % 24;
    const mm = Math.floor(left / 60000) % 60;
    const ss = Math.floor(left / 1000) % 60;
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${dd}d ${pad(hh)}:${pad(mm)}:${pad(ss)}`;
  }, [cutoffAt, now]);
}

const NAV = [
  { key: 'shop', label: 'Shop', path: '/shop' },
  { key: 'cart', label: 'Your order', path: '/cart' },
  { key: 'orders', label: 'Orders', path: '/orders' },
  { key: 'updates', label: 'Updates', path: '/updates' },
  { key: 'community', label: 'Community', path: '/community' },
  { key: 'account', label: 'Account', path: '/account' },
] as const;

export function Shell() {
  const { user, community, signOut } = useAuth();
  const { count: cartCount } = useCart();
  const { orders } = useOrders();
  const [alertsCount, setAlertsCount] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    getAlerts()
      .then((data) => {
        if (!cancelled) setAlertsCount(data.length);
      })
      .catch(() => {
        /* badge just stays at 0 if unreachable */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const awaitingCount = useMemo(() => orders.filter((o) => o.status !== 'collected').length, [orders]);
  // Every cycle fact below comes from the community record the property office
  // edits in Cycle setup (CONTRACT.md §4.5) — nothing here is a constant.
  const countdown = useCountdown(cutoffIso(community));
  const dropDay = deliveryDay(community, 'Next');
  const window = collectionWindow(community);

  const badges: Record<string, number> = {
    cart: cartCount,
    orders: awaitingCount,
    updates: alertsCount,
  };

  const handleChangeCommunity = () => {
    signOut();
    navigate('/');
  };

  return (
    <div style={{ display: 'flex', flex: 1, minWidth: 0 }}>
      <div
        style={{
          width: 232,
          flex: 'none',
          background: '#FDFBF8',
          borderRight: '1px solid #EDE5DC',
          padding: '28px 22px',
          display: 'flex',
          flexDirection: 'column',
          position: 'sticky',
          top: 0,
          height: '100vh',
        }}
      >
        <img src={logo} alt="Gather" width={262} height={80} style={{ width: 98, height: 'auto', display: 'block' }} />
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 26 }}>
          <div style={{ flex: 1, minWidth: 0, fontSize: 14, fontWeight: 800, letterSpacing: '-.01em' }}>
            {community?.label ?? '—'}
          </div>
          <button
            onClick={handleChangeCommunity}
            style={{
              border: 0,
              background: 'transparent',
              padding: 0,
              cursor: 'pointer',
              fontSize: 11.5,
              fontWeight: 700,
              color: '#5B34D9',
            }}
          >
            Change
          </button>
        </div>
        <div style={{ fontSize: 12, color: '#7B7280', marginTop: 3, lineHeight: 1.5 }}>
          Blk {user?.block} #{user?.unit}
          <br />
          {user?.displayName}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', marginTop: 26 }}>
          {NAV.map((n) => (
            <NavLink
              key={n.key}
              to={n.path}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'baseline',
                gap: 10,
                width: '100%',
                textAlign: 'left',
                padding: '10px 0 10px 14px',
                borderTop: 0,
                borderRight: 0,
                borderBottom: 0,
                borderLeft: `2px solid ${isActive ? '#5B34D9' : '#EDE5DC'}`,
                background: 'transparent',
                color: isActive ? '#1E1926' : '#6F6678',
                fontSize: 13.5,
                fontWeight: isActive ? 800 : 600,
                cursor: 'pointer',
                textDecoration: 'none',
              })}
            >
              <span style={{ flex: 1 }}>{n.label}</span>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: '#A79E9E' }}>
                {badges[n.key] ? badges[n.key] : ''}
              </span>
            </NavLink>
          ))}
        </div>

        <div style={{ flex: 1 }} />
        <div style={{ paddingTop: 18, borderTop: '1px solid #EDE5DC' }}>
          <div style={{ fontSize: 11.5, color: '#7B7280' }}>{dropDay} drop closes in</div>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 14, marginTop: 3 }}>{countdown}</div>
          <div style={{ fontSize: 11.5, color: '#9A9199', lineHeight: 1.5, marginTop: 7 }}>
            Cutoff {formatCutoff(community)}
            <br />
            Cycle {community?.cycleNo ?? '—'} · collection at {collectPoint(community, '—')}
            {window ? `, ${window}` : ''}
          </div>
        </div>
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <CartButton />
        <Outlet />
      </div>
    </div>
  );
}
