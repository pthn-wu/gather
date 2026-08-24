import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import logo from '../assets/gather-logo-web.png';
import { getCommunities } from '../api/endpoints';
import type { Community } from '../api/types';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { linkButton, mono, primaryButton } from '../styles/shared';

export function Home() {
  const [query, setQuery] = useState('');
  const [communities, setCommunities] = useState<Community[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { setPendingCommunity } = useAuth();
  const { flash } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    getCommunities()
      .then((data) => {
        if (!cancelled) setCommunities(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not reach Gather');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return communities;
    return communities.filter((c) => `${c.label} ${c.address}`.toLowerCase().includes(q));
  }, [communities, query]);

  const towersLive = communities.filter((c) => c.isOpen).length;
  const householdsOrdering = communities.reduce((a, c) => a + (c.householdsCount || 0), 0);

  const pick = (c: Community) => {
    setPendingCommunity(c);
    navigate('/signin');
  };

  return (
    <div
      style={{
        flex: 1,
        display: 'grid',
        gridTemplateColumns: 'minmax(440px,1fr) minmax(520px,600px)',
        gap: 56,
        padding: '64px 72px',
        alignItems: 'start',
      }}
    >
      <div style={{ position: 'sticky', top: 64 }}>
        <img src={logo} alt="Gather" width={262} height={80} style={{ width: 132, height: 'auto', display: 'block' }} />
        <div
          style={{
            fontFamily: 'Poppins, sans-serif',
            fontSize: 38,
            fontWeight: 600,
            letterSpacing: '-.025em',
            lineHeight: 1.15,
            marginTop: 32,
          }}
        >
          Ordering together,
          <br />
          block by block
        </div>
        <div style={{ fontSize: 14, color: '#5B5364', lineHeight: 1.7, marginTop: 18, maxWidth: 440 }}>
          Pick your community, then sign in with the account your property office gave you. Group prices, cutoffs
          and collection points are set per property — the more households order, the less everyone pays.
        </div>
        <div
          style={{
            display: 'flex',
            gap: 36,
            marginTop: 32,
            paddingTop: 24,
            borderTop: '1.5px solid #1E1926',
          }}
        >
          <div>
            <div style={{ ...mono, fontSize: 22 }}>{towersLive}</div>
            <div style={{ fontSize: 12, color: '#6F6678', marginTop: 4 }}>towers live</div>
          </div>
          <div>
            <div style={{ ...mono, fontSize: 22 }}>{householdsOrdering}</div>
            <div style={{ fontSize: 12, color: '#6F6678', marginTop: 4 }}>households ordering</div>
          </div>
        </div>
      </div>

      <div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 0',
            borderBottom: `1.5px solid ${query ? '#5B34D9' : '#DED5CC'}`,
          }}
        >
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search condo, estate or street"
            style={{
              flex: 1,
              minWidth: 0,
              border: 0,
              background: 'transparent',
              fontSize: 14,
              fontWeight: 600,
              color: '#1E1926',
              outline: 'none',
              padding: 0,
            }}
          />
        </div>

        <div style={{ marginTop: 6 }}>
          {loading && <div style={{ padding: '18px 12px', fontSize: 13, color: '#6F6678' }}>Loading properties…</div>}
          {error && (
            <div style={{ padding: '18px 12px', fontSize: 13, color: '#B3253A' }}>
              {error}. Make sure the Gather server is running.
            </div>
          )}
          {!loading &&
            !error &&
            filtered.map((c) => (
              <div
                key={c.id}
                className="row"
                onClick={() => pick(c)}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '64px minmax(0,1fr) 128px 96px',
                  gap: 16,
                  alignItems: 'center',
                  padding: '18px 12px',
                  borderBottom: '1px solid #EFE8E0',
                  cursor: 'pointer',
                  background: '#fff',
                }}
              >
                <div style={{ ...mono, fontSize: 13, color: '#6F6678' }}>{c.abbr}</div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 14.5, fontWeight: 700, letterSpacing: '-.01em' }}>{c.label}</div>
                  <div style={{ fontSize: 12, color: '#928892', marginTop: 3 }}>{c.address}</div>
                </div>
                <div style={{ fontSize: 12, color: '#6F6678' }}>
                  {c.householdsCount} households · cycle {c.cycleNo}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: c.isOpen ? '#0C7C58' : '#B3253A',
                    textAlign: 'right',
                  }}
                >
                  {c.isOpen ? 'Open' : 'Filling'}
                </div>
              </div>
            ))}
          {!loading && !error && filtered.length === 0 && (
            <div style={{ padding: '18px 12px', fontSize: 13, color: '#6F6678' }}>No property matches “{query}”.</div>
          )}
        </div>

        <div style={{ marginTop: 26, paddingTop: 20, borderTop: '1px solid #E7DFD5' }}>
          <div style={{ fontSize: 13.5, fontWeight: 800 }}>Don't see your property?</div>
          <div style={{ fontSize: 12.5, color: '#6F6678', lineHeight: 1.6, marginTop: 5, maxWidth: 460 }}>
            Gather opens a property once 40 households register interest. Capital Retail then sets the delivery days
            with the office.
          </div>
          <button
            onClick={() => flash('Interest registered — the office will hear from Capital Retail')}
            style={{ ...primaryButton, marginTop: 14, padding: '11px 16px', fontSize: 12.5 }}
          >
            Register interest
          </button>
          <div style={{ marginTop: 20, fontSize: 12.5, color: '#8B8194' }}>
            Building office or retail team?{' '}
            <a href="/office" style={{ fontWeight: 700 }}>
              Staff sign in
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
