import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useProducts } from '../context/ProductsContext';
import { useToast } from '../context/ToastContext';
import {
  getCommunities,
  getSplits,
  joinSplit,
  getWishlist,
  addWishlistItem,
  voteWishlistItem,
  getActivity,
} from '../api/endpoints';
import type { Activity, Community as CommunityT, Split, Wishlist } from '../api/types';
import { Avatar } from '../components/Avatar';
import { money, hashToAvatarIndex, initialsFromName } from '../utils/format';
import { relativeTime } from '../utils/relativeTime';
import { card, mono, pageTitle } from '../styles/shared';
import { collectPoint, collectionWindow } from '../utils/cycle';

export function Community() {
  const { community: myCommunity } = useAuth();
  const { products } = useProducts();
  const { flash } = useToast();

  const [publicInfo, setPublicInfo] = useState<CommunityT | null>(null);
  const [splits, setSplits] = useState<Split[]>([]);
  const [wishlist, setWishlist] = useState<Wishlist[]>([]);
  const [activity, setActivity] = useState<Activity[]>([]);
  const [wish, setWish] = useState('');
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    Promise.allSettled([getCommunities(), getSplits(), getWishlist(), getActivity()]).then(
      ([comms, sp, wl, act]) => {
        if (comms.status === 'fulfilled' && myCommunity) {
          setPublicInfo(comms.value.find((c) => c.id === myCommunity.id) ?? null);
        }
        if (sp.status === 'fulfilled') setSplits(sp.value);
        if (wl.status === 'fulfilled') setWishlist(wl.value);
        if (act.status === 'fulfilled') setActivity(act.value);
        setLoading(false);
      },
    );
  };

  useEffect(load, [myCommunity?.id]);

  const householdsCount = publicInfo?.householdsCount ?? 0;
  const unitsOnSheet = useMemo(() => products.reduce((a, p) => a + p.joined, 0), [products]);
  const savedTogether = useMemo(() => products.reduce((a, p) => a + (p.retailPrice - p.price) * p.joined, 0), [products]);

  const stats = [
    { value: String(householdsCount), label: 'households ordering this cycle' },
    { value: String(unitsOnSheet), label: 'units on the sheet so far' },
    { value: money(savedTogether), label: 'saved together this cycle' },
    { value: String(myCommunity?.cycleNo ?? 0), label: 'cycles run without a miss' },
  ];

  const toggleSplit = async (s: Split) => {
    try {
      await joinSplit(s.id);
      flash(s.joinedByMe ? 'Left the split' : `You joined ${s.initiatorName}'s split`);
      load();
    } catch {
      flash('Could not update the split — try again');
    }
  };

  const vote = async (w: Wishlist) => {
    try {
      await voteWishlistItem(w.id);
      load();
    } catch {
      flash('Could not vote — try again');
    }
  };

  const addWish = async () => {
    if (!wish.trim()) return;
    const name = wish.trim();
    setWish('');
    try {
      await addWishlistItem(name, '');
      flash('Added to the wishlist — neighbours can vote now');
      load();
    } catch {
      flash('Could not add that item — try again');
    }
  };

  return (
    <div style={{ padding: '28px 36px 48px' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 24 }}>
        <div style={pageTitle}>{myCommunity?.label ?? '—'}</div>
        <div style={{ fontSize: 12.5, color: '#7B7280' }}>
          {householdsCount} households · cycle {myCommunity?.cycleNo ?? '—'} · collection at{' '}
          {collectPoint(myCommunity, '—')}
          {collectionWindow(myCommunity) ? `, ${collectionWindow(myCommunity)}` : ''}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,minmax(0,1fr))', gap: 0, marginTop: 22, borderTop: '1.5px solid #1E1926', borderBottom: '1px solid #EFE8E0' }}>
        {stats.map((s, i) => (
          <div key={i} style={{ padding: '18px 20px 18px 0' }}>
            <div style={{ ...mono, fontSize: 22, fontWeight: 500 }}>{s.value}</div>
            <div style={{ fontSize: 12, color: '#6F6678', marginTop: 4, lineHeight: 1.45 }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(420px,1fr) minmax(360px,420px)', gap: 32, alignItems: 'start', marginTop: 32 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.09em', textTransform: 'uppercase', paddingBottom: 11, borderBottom: '1.5px solid #1E1926' }}>
            Splits open on the block
          </div>
          {!loading && splits.length === 0 && <div style={{ padding: '16px 12px', fontSize: 13, color: '#6F6678' }}>No splits open right now.</div>}
          {splits.map((sp) => {
            const leftN = Math.max(0, sp.neededCount - sp.joinedCount);
            return (
              <div key={sp.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 12px', borderBottom: '1px solid #EFE8E0' }}>
                <Avatar displayName={sp.initiatorName} avatarIndex={hashToAvatarIndex(sp.initiatorName)} size={34} fontSize={12} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 700, lineHeight: 1.35 }}>{sp.product?.name ?? 'Item'}</div>
                  <div style={{ fontSize: 11.5, color: '#928892', marginTop: 3 }}>
                    {sp.initiatorName} · {sp.detail}
                  </div>
                </div>
                <div style={{ width: 120, flex: 'none', fontSize: 11.5, fontWeight: 700, color: leftN === 0 ? '#0C7C58' : '#928892', textAlign: 'right' }}>
                  {leftN === 0 ? 'Split complete' : `${leftN} household${leftN === 1 ? '' : 's'} needed`}
                </div>
                <button
                  onClick={() => toggleSplit(sp)}
                  style={{
                    width: 96,
                    flex: 'none',
                    padding: '8px 0',
                    border: `1px solid ${sp.joinedByMe ? '#0C7C58' : '#1E1926'}`,
                    borderRadius: 8,
                    background: sp.joinedByMe ? '#fff' : '#1E1926',
                    color: sp.joinedByMe ? '#0C7C58' : '#fff',
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  {sp.joinedByMe ? 'Joined' : 'Join'}
                </button>
              </div>
            );
          })}

          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.09em', textTransform: 'uppercase', paddingBottom: 11, borderBottom: '1.5px solid #1E1926', marginTop: 36 }}>
            Live from the block
          </div>
          {!loading && activity.length === 0 && <div style={{ padding: '13px 12px', fontSize: 13, color: '#6F6678' }}>Nothing yet this cycle.</div>}
          {activity.map((a) => (
            <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 12px', borderBottom: '1px solid #EFE8E0' }}>
              <Avatar
                displayName={(a.userId ?? 'NB').slice(0, 2).toUpperCase()}
                avatarIndex={hashToAvatarIndex(a.userId ?? a.text)}
                size={28}
                fontSize={10.5}
              />
              <div style={{ flex: 1, fontSize: 12.5, color: '#3F3947', lineHeight: 1.5 }}>{a.text}</div>
              <div style={{ fontSize: 11, color: '#A79E9E', fontWeight: 600, flex: 'none' }}>{relativeTime(a.createdAt)}</div>
            </div>
          ))}
        </div>

        <div style={{ minWidth: 0 }}>
          <div style={card}>
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.09em', textTransform: 'uppercase' }}>Wishlist for next sheet</div>
            <div style={{ fontSize: 12.5, color: '#6F6678', lineHeight: 1.55, marginTop: 7 }}>
              Most-wanted items go to Capital Retail before they set the next sheet.
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', marginTop: 16 }}>
              {wishlist.map((w) => (
                <div key={w.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 0', borderBottom: '1px solid #F3ECE4' }}>
                  <button
                    onClick={() => vote(w)}
                    style={{
                      width: 46,
                      flex: 'none',
                      padding: '7px 0',
                      border: `1px solid ${w.votedByMe ? '#5B34D9' : '#E5DCD3'}`,
                      borderRadius: 8,
                      background: w.votedByMe ? '#F5F1FD' : '#fff',
                      color: w.votedByMe ? '#5B34D9' : '#6F6678',
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: 12,
                      fontWeight: 500,
                      cursor: 'pointer',
                    }}
                  >
                    {w.votes}
                  </button>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>{w.name}</div>
                    <div style={{ fontSize: 11.5, color: '#928892', marginTop: 2 }}>{w.note}</div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 9, marginTop: 16 }}>
              <input
                value={wish}
                onChange={(e) => setWish(e.target.value)}
                placeholder="Suggest an item…"
                style={{ flex: 1, minWidth: 0, padding: '11px 13px', border: '1px solid #E5DCD3', borderRadius: 9, background: '#fff', fontSize: 13, color: '#1E1926', outline: 'none' }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') addWish();
                }}
              />
              <button onClick={addWish} style={{ padding: '0 15px', border: 0, borderRadius: 9, background: '#1E1926', color: '#fff', fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}>
                Add
              </button>
            </div>
          </div>

          <div style={{ ...card, marginTop: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.09em', textTransform: 'uppercase' }}>Collection buddy</div>
            <div style={{ fontSize: 12.5, color: '#6F6678', lineHeight: 1.6, marginTop: 8 }}>
              Away on delivery day? Ask a neighbour to collect for you — the office logs who picked up and the
              receipt still comes to you.
            </div>
            <button
              onClick={() => flash('Buddy request sent to the block chat')}
              style={{ marginTop: 14, padding: '11px 15px', border: '1px solid #E5DCD3', borderRadius: 9, background: '#fff', color: '#5B34D9', fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}
            >
              Ask a neighbour
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
