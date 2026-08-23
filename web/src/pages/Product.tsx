import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getProduct, postComment, addSplit } from '../api/endpoints';
import type { ProductDetail } from '../api/types';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import { Avatar } from '../components/Avatar';
import { Stepper } from '../components/Stepper';
import { ProductImage } from '../components/ProductImage';
import { money, hashToAvatarIndex } from '../utils/format';
import { collectPoint, collectionWindow, deliveryDay, deliveryLabel } from '../utils/cycle';
import { promoMarker } from '../utils/promo';
import { card, linkButton, mono, outlineButton, primaryButton, sectionLabel } from '../styles/shared';

export function Product() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { community, user } = useAuth();
  const { addTo } = useCart();
  const { flash } = useToast();

  const [prod, setProd] = useState<ProductDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [qty, setQty] = useState(1);
  const [draft, setDraft] = useState('');
  const [posting, setPosting] = useState(false);

  const load = () => {
    setLoading(true);
    setError(null);
    getProduct(id)
      .then((data) => {
        setProd(data);
        setQty(1);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load this item'))
      .finally(() => setLoading(false));
  };

  useEffect(load, [id]);

  if (loading) {
    return (
      <div style={{ padding: '28px 36px 48px' }}>
        <BackLink navigate={navigate} />
        <div style={{ marginTop: 20, fontSize: 13, color: '#6F6678' }}>Loading item…</div>
      </div>
    );
  }

  if (error || !prod) {
    return (
      <div style={{ padding: '28px 36px 48px' }}>
        <BackLink navigate={navigate} />
        <div style={{ marginTop: 20, fontSize: 13, color: '#B3253A' }}>
          {error ?? 'Item not found'}. Make sure the Gather server is running.
        </div>
      </div>
    );
  }

  // Listing scope (CONTRACT.md §4.3) — a product the retail console delisted
  // for this community is not orderable here, even by direct link.
  const listedHere =
    prod.active !== false &&
    (!prod.communityIds || prod.communityIds.length === 0 || !user?.communityId
      ? true
      : prod.communityIds.includes(user.communityId));

  if (!listedHere) {
    return (
      <div style={{ padding: '28px 36px 48px' }}>
        <BackLink navigate={navigate} />
        <div style={{ marginTop: 24, maxWidth: 460 }}>
          <div style={{ fontSize: 15, fontWeight: 800 }}>Not on this cycle's sheet</div>
          <div style={{ fontSize: 13, color: '#6F6678', marginTop: 7, lineHeight: 1.55 }}>
            Capital Retail isn't listing {prod.name} at {community?.label ?? 'your community'} this cycle. Ask for it
            on the Community wishlist and the office will pass it on.
          </div>
        </div>
      </div>
    );
  }

  const nextTierPrice = prod.progress.next != null ? ([prod.price0, prod.price1, prod.price2, prod.price3][prod.tierIndex + 1] ?? prod.price) : undefined;
  const nextText =
    prod.progress.next != null
      ? `${community?.label ?? 'This community'} has ${prod.joined} units in this cycle. ${prod.progress.unitsToNext} more and the price drops to ${money(nextTierPrice!)} for everyone who ordered — including you, refunded at the table.`
      : 'The block already unlocked the deepest tier for this cycle, so this is the lowest price Capital Retail will quote.';

  const tierLabel = prod.tierIndex === 0 ? 'Group price' : prod.tierIndex === 1 ? '1 tier unlocked' : `${prod.tierIndex} tiers unlocked`;
  const social = `${prod.joined} units from ${Math.round(prod.joined / 1.8)} neighbours`;

  const postDraft = async () => {
    if (!draft.trim() || posting) return;
    setPosting(true);
    const text = draft.trim();
    setDraft('');
    try {
      await postComment(prod.id, text);
      flash('Posted to the block');
      load();
    } catch {
      flash('Could not post — try again');
    } finally {
      setPosting(false);
    }
  };

  const startSplit = async () => {
    try {
      await addSplit({ productId: prod.id, detail: 'Looking for neighbours to split this with', neededCount: 1 });
      flash('Split offered — neighbours will see it on Community');
    } catch {
      flash('Could not start a split right now');
    }
  };

  const addProd = () => {
    addTo(prod.id, qty);
    flash(`Added to your ${deliveryDay(community)} order`);
  };

  // Merchandising facts the retail console writes (CONTRACT.md §4.1). Each is
  // optional — the row simply drops out until the console fills it in.
  const specs = [
    prod.brand ? { label: 'Brand', value: prod.brand } : null,
    prod.size ? { label: 'Size', value: prod.size } : null,
    prod.grossWeight ? { label: 'Gross weight', value: prod.grossWeight } : null,
    { label: 'Sold as', value: prod.unit },
  ].filter((s): s is { label: string; value: string } => s !== null);

  return (
    <div style={{ padding: '28px 36px 48px' }}>
      <BackLink navigate={navigate} />
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(560px,1fr) 400px', gap: 32, alignItems: 'start', marginTop: 20 }}>
        <div style={{ minWidth: 0 }}>
          <ProductImage
            src={prod.imageUrl}
            slot={prod.imageSlot}
            alt={prod.name}
            aspectRatio="16/10"
            stripe={10}
            slotFontSize={12}
            style={{ border: '1px solid #EBE3DA', borderRadius: 10 }}
          />
          <div style={{ fontFamily: 'Poppins, sans-serif', fontSize: 26, fontWeight: 600, letterSpacing: '-.02em', marginTop: 24 }}>
            {prod.name}
          </div>
          <div style={{ fontSize: 13, color: '#6F6678', marginTop: 5 }}>
            {[prod.brand, prod.size || prod.unit, prod.category].filter(Boolean).join(' · ')} · supplied by Capital
            Retail
          </div>
          {prod.details && (
            <div style={{ fontSize: 13.5, color: '#3F3947', lineHeight: 1.65, marginTop: 18, maxWidth: 620 }}>
              {prod.details}
            </div>
          )}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '10px 32px',
              marginTop: 18,
              paddingTop: 16,
              borderTop: '1px solid #EFE8E0',
              maxWidth: 620,
            }}
          >
            {specs.map((s) => (
              <div key={s.label}>
                <div style={{ fontSize: 11.5, color: '#928892' }}>{s.label}</div>
                <div style={{ fontSize: 13, fontWeight: 700, marginTop: 3 }}>{s.value}</div>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 13.5, color: '#3F3947', lineHeight: 1.65, marginTop: 18, maxWidth: 620 }}>{nextText}</div>

          <div style={{ marginTop: 28, paddingTop: 20, borderTop: '1.5px solid #1E1926' }}>
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.09em', textTransform: 'uppercase' }}>
              Neighbours on this item
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 16, maxWidth: 640 }}>
              {prod.comments.length === 0 && (
                <div style={{ fontSize: 13, color: '#928892' }}>No questions yet — be the first to ask.</div>
              )}
              {prod.comments.map((c) => (
                <div key={c.id} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <Avatar
                    displayName={c.authorName ?? 'Neighbour'}
                    avatarIndex={c.authorAvatarIndex ?? hashToAvatarIndex(c.userId)}
                    photo={c.authorAvatarPhoto}
                    size={32}
                    fontSize={11}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 700 }}>
                      {c.authorName ?? 'Neighbour'} <span style={{ color: '#9A9199', fontWeight: 600 }}>{c.authorUnit ?? ''}</span>
                    </div>
                    <div style={{ fontSize: 13, color: '#3F3947', lineHeight: 1.55, marginTop: 3 }}>{c.text}</div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 9, marginTop: 18, maxWidth: 640 }}>
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Ask the block a question…"
                style={{
                  flex: 1,
                  padding: '11px 13px',
                  border: '1px solid #E5DCD3',
                  borderRadius: 9,
                  background: '#fff',
                  fontSize: 13,
                  color: '#1E1926',
                  outline: 'none',
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') postDraft();
                }}
              />
              <button onClick={postDraft} style={{ ...primaryButton, padding: '0 16px', fontSize: 12.5 }}>
                Post
              </button>
            </div>
          </div>
        </div>

        <div style={{ position: 'sticky', top: 28, ...card, padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 9 }}>
            <div style={{ ...mono, fontSize: 22, fontWeight: 500 }}>{money(prod.price)}</div>
            <div style={{ fontSize: 12.5, color: '#928892', textDecoration: 'line-through' }}>{money(prod.retailPrice)}</div>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: '#0C7C58' }}>&minus;{prod.savePct}%</div>
          </div>
          <div style={{ fontSize: 12, color: '#6F6678', marginTop: 5 }}>
            {tierLabel} · {social}
          </div>
          {prod.promotion && (
            <div
              style={{
                marginTop: 12,
                padding: '10px 12px',
                borderRadius: 8,
                background: '#F6F2FF',
                borderLeft: '2px solid #5B34D9',
              }}
            >
              <div style={{ ...sectionLabel, fontSize: 10, color: '#5B34D9' }}>Promotion applied</div>
              <div style={{ fontSize: 12.5, fontWeight: 700, marginTop: 4, lineHeight: 1.45 }}>
                {promoMarker(prod.promotion)}
              </div>
              {prod.basePrice != null && (
                <div style={{ fontSize: 11.5, color: '#6F6678', marginTop: 3 }}>
                  Was {money(prod.basePrice)} at this tier.
                </div>
              )}
            </div>
          )}

          <div style={{ marginTop: 18, paddingTop: 16, borderTop: '1px solid #EFE8E0' }}>
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.09em', textTransform: 'uppercase', color: '#928892' }}>
              Price tiers this cycle
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', marginTop: 12 }}>
              {prod.tiers.map((t) => (
                <div
                  key={t.index}
                  style={{ display: 'flex', alignItems: 'baseline', gap: 10, padding: '9px 0', borderBottom: '1px solid #F3ECE4' }}
                >
                  <div
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: '50%',
                      border: `1.5px solid ${t.unlocked ? '#5B34D9' : '#D6CEC6'}`,
                      background: t.unlocked ? '#5B34D9' : '#fff',
                      flex: 'none',
                    }}
                  />
                  <div style={{ flex: 1, fontSize: 12.5, fontWeight: t.unlocked ? 700 : 600, color: t.unlocked ? '#1E1926' : '#9A9199' }}>
                    {t.label}
                  </div>
                  <div style={{ ...mono, fontSize: 12.5, color: t.unlocked ? '#1E1926' : '#9A9199' }}>{money(t.price)}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 20 }}>
            <Stepper qty={qty} onDec={() => setQty((q) => Math.max(1, q - 1))} onInc={() => setQty((q) => q + 1)} />
            <div style={{ flex: 1, textAlign: 'right' }}>
              <div style={{ fontSize: 11.5, color: '#928892' }}>Line total</div>
              <div style={{ ...mono, fontSize: 15, fontWeight: 500 }}>{money(prod.price * qty)}</div>
            </div>
          </div>
          <button onClick={addProd} style={{ ...primaryButton, marginTop: 14, width: '100%', padding: 13, fontSize: 13.5 }}>
            Add to {deliveryDay(community)} order
          </button>
          <button onClick={startSplit} style={{ ...outlineButton, marginTop: 9, width: '100%', padding: 12, fontSize: 12.5, color: '#5B34D9' }}>
            Offer to split this
          </button>
          <div style={{ fontSize: 11.5, color: '#9A9199', lineHeight: 1.5, marginTop: 14 }}>
            Collect at {collectPoint(community)} on {deliveryLabel(community) ?? 'delivery day'}
            {collectionWindow(community) && !deliveryLabel(community)?.includes(collectionWindow(community)!)
              ? `, ${collectionWindow(community)}`
              : ''}
            . Pay now by MMQR or with cash at the table.
          </div>
        </div>
      </div>
    </div>
  );
}

function BackLink({ navigate }: { navigate: ReturnType<typeof useNavigate> }) {
  return (
    <button onClick={() => navigate('/shop')} style={{ ...linkButton, fontSize: 12.5 }}>
      ← Back to the sheet
    </button>
  );
}
