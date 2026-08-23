import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAlerts } from '../api/endpoints';
import type { Alert } from '../api/types';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { relativeTime } from '../utils/relativeTime';
import { linkButton, pageTitle } from '../styles/shared';

export function Updates() {
  const { community } = useAuth();
  const { flash } = useToast();
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getAlerts()
      .then((data) => {
        if (!cancelled) setAlerts(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load updates');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const act = (a: Alert) => {
    if (a.ctaType === 'orders') navigate('/orders');
    else if (a.ctaType === 'cart') navigate('/cart');
    else if (a.ctaType === 'product' && a.ctaRef) navigate(`/shop/${a.ctaRef}`);
    else navigate('/shop');
  };

  return (
    <div style={{ padding: '28px 36px 48px' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 24 }}>
        <div style={pageTitle}>Updates</div>
        <div style={{ fontSize: 12.5, color: '#7B7280' }}>
          Price drops, cutoffs and collection notices for {community?.label ?? 'your community'}
        </div>
        <div style={{ flex: 1 }} />
        <button onClick={() => flash('All updates marked read')} style={{ ...linkButton, fontSize: 12.5 }}>
          Mark all read
        </button>
      </div>
      <div style={{ maxWidth: 820, marginTop: 22 }}>
        {loading && <div style={{ padding: '18px 12px', fontSize: 13, color: '#6F6678' }}>Loading updates…</div>}
        {error && <div style={{ padding: '18px 12px', fontSize: 13, color: '#B3253A' }}>{error}. Make sure the Gather server is running.</div>}
        {!loading && !error && alerts.length === 0 && (
          <div style={{ padding: '18px 12px', fontSize: 13, color: '#6F6678' }}>Nothing new yet — check back after the next cutoff.</div>
        )}
        {!loading &&
          !error &&
          alerts.map((n, i) => (
            <div
              key={n.id}
              style={{
                display: 'grid',
                gridTemplateColumns: '120px minmax(0,1fr)',
                gap: 20,
                padding: '18px 12px',
                borderBottom: '1px solid #EFE8E0',
                background: i === 0 ? '#FDFBF7' : '#fff',
                boxShadow: `inset 2px 0 0 ${i === 0 ? '#5B34D9' : 'transparent'}`,
              }}
            >
              <div style={{ fontSize: 11.5, color: '#928892', fontWeight: 600 }}>{relativeTime(n.createdAt)}</div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 800, letterSpacing: '-.01em' }}>{n.title}</div>
                <div style={{ fontSize: 13, color: '#3F3947', lineHeight: 1.6, marginTop: 5 }}>{n.body}</div>
                <button onClick={() => act(n)} style={{ ...linkButton, marginTop: 9, fontSize: 12.5 }}>
                  {n.ctaLabel}
                </button>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}
