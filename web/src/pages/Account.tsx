import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useOrders } from '../context/OrdersContext';
import { useToast } from '../context/ToastContext';
import { updateProfile, updatePassword } from '../api/endpoints';
import type { PaymentMethod } from '../api/types';
import { AVATARS, gradientCss, money, initialsFromName } from '../utils/format';
import { Avatar } from '../components/Avatar';
import { card, fieldLabel, outlineButton, primaryButton, textInput } from '../styles/shared';

const DEFAULT_PAY_KEY = 'gather_default_payment';

export function Account() {
  const { user, community, applyUser, signOut } = useAuth();
  const { orders } = useOrders();
  const { flash } = useToast();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);

  const [displayName, setDisplayName] = useState(user?.displayName ?? '');
  const [username, setUsername] = useState(user?.username ?? '');
  const [pw1, setPw1] = useState('');
  const [pw2, setPw2] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPw, setSavingPw] = useState(false);
  const [defaultPay, setDefaultPay] = useState<PaymentMethod>('mmqr');

  useEffect(() => {
    try {
      const saved = localStorage.getItem(DEFAULT_PAY_KEY) as PaymentMethod | null;
      if (saved === 'mmqr' || saved === 'collection') setDefaultPay(saved);
    } catch {
      /* ignore */
    }
  }, []);

  const pickPayment = (k: PaymentMethod) => {
    setDefaultPay(k);
    try {
      localStorage.setItem(DEFAULT_PAY_KEY, k);
    } catch {
      /* ignore */
    }
  };

  const pwMatch = pw1.length > 0 && pw1 === pw2;

  const saveProfile = async () => {
    setSavingProfile(true);
    try {
      const updated = await updateProfile({ displayName, username });
      applyUser(updated);
      flash('Account updated');
    } catch {
      flash('Could not save your details — try again');
    } finally {
      setSavingProfile(false);
    }
  };

  const pickAvatar = async (i: number) => {
    try {
      const updated = await updateProfile({ avatarIndex: i, avatarPhoto: null });
      applyUser(updated);
    } catch {
      flash('Could not update your avatar');
    }
  };

  const onPhoto = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const updated = await updateProfile({ avatarPhoto: reader.result as string });
        applyUser(updated);
      } catch {
        flash('Could not upload your photo');
      }
    };
    reader.readAsDataURL(file);
  };

  const removePhoto = async () => {
    try {
      const updated = await updateProfile({ avatarPhoto: null });
      applyUser(updated);
    } catch {
      flash('Could not remove your photo');
    }
  };

  const savePassword = async () => {
    if (!pwMatch) {
      flash('Enter the same password twice');
      return;
    }
    setSavingPw(true);
    try {
      await updatePassword(pw1);
      setPw1('');
      setPw2('');
      flash('Password updated');
    } catch {
      flash('Could not update your password');
    } finally {
      setSavingPw(false);
    }
  };

  const doSignOut = () => {
    signOut();
    navigate('/');
  };

  const payOptions: { k: PaymentMethod; label: string; note: string }[] = [
    { k: 'mmqr', label: 'MMQR now', note: 'One QR for every bank and wallet, settled by CTZPay' },
    { k: 'collection', label: 'Pay on collection', note: 'Cash or MMQR at the collection table on delivery day' },
  ];

  const ordersPlaced = orders.length;
  const collectedCount = orders.filter((o) => o.status === 'collected').length;
  const savedAgainstRetail = orders.reduce(
    (a, o) => a + o.lines.reduce((b, l) => b + ((l.product?.retailPrice ?? l.unitPrice) - l.unitPrice) * l.qty, 0),
    0,
  );

  const accountStats = [
    { label: 'Orders placed', value: String(ordersPlaced) },
    { label: 'Saved against retail', value: money(savedAgainstRetail) },
    { label: 'Collected so far', value: `${collectedCount} of ${ordersPlaced}` },
  ];

  const hasPhoto = !!user?.avatarPhoto;

  return (
    <div style={{ padding: '28px 36px 48px' }}>
      <div style={{ fontFamily: 'Poppins, sans-serif', fontSize: 27, fontWeight: 600, letterSpacing: '-.02em' }}>Account</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(520px,1fr) 372px', gap: 28, alignItems: 'start', marginTop: 22 }}>
        <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={card}>
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.09em', textTransform: 'uppercase' }}>Your details</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, marginTop: 16 }}>
              <div>
                <div style={fieldLabel}>Display name</div>
                <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} style={{ ...textInput, marginTop: 6, fontSize: 13.5 }} />
              </div>
              <div>
                <div style={fieldLabel}>Username</div>
                <input value={username} onChange={(e) => setUsername(e.target.value)} style={{ ...textInput, marginTop: 6, fontSize: 13.5 }} />
              </div>
              <div>
                <div style={fieldLabel}>Block</div>
                <input value={user?.block ?? ''} disabled style={{ ...textInput, marginTop: 6, fontSize: 13.5, background: '#FAF7F3', color: '#928892' }} />
              </div>
              <div>
                <div style={fieldLabel}>Unit</div>
                <input value={user?.unit ?? ''} disabled style={{ ...textInput, marginTop: 6, fontSize: 13.5, background: '#FAF7F3', color: '#928892' }} />
              </div>
            </div>
            <div style={{ fontSize: 11.5, color: '#9A9199', lineHeight: 1.5, marginTop: 14 }}>
              Your unit was verified by the {community?.label ?? 'property'} office. Ask them to change it if you
              move.
            </div>
            <button onClick={saveProfile} disabled={savingProfile} style={{ ...primaryButton, marginTop: 16, padding: '11px 16px', fontSize: 12.5 }}>
              {savingProfile ? 'Saving…' : 'Save changes'}
            </button>
          </div>

          <div style={card}>
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.09em', textTransform: 'uppercase' }}>Default payment</div>
            <div style={{ display: 'flex', flexDirection: 'column', marginTop: 12 }}>
              {payOptions.map((o) => (
                <button
                  key={o.k}
                  onClick={() => pickPayment(o.k)}
                  style={{ display: 'flex', alignItems: 'flex-start', gap: 12, textAlign: 'left', width: '100%', padding: '14px 0', border: 0, borderBottom: '1px solid #F3ECE4', background: 'transparent', cursor: 'pointer' }}
                >
                  <div style={{ width: 14, height: 14, borderRadius: '50%', border: `1.5px solid ${defaultPay === o.k ? '#5B34D9' : '#D6CEC6'}`, background: defaultPay === o.k ? '#5B34D9' : '#fff', flex: 'none', marginTop: 2 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 700, color: defaultPay === o.k ? '#1E1926' : '#6F6678' }}>{o.label}</div>
                    <div style={{ fontSize: 12, color: '#6F6678', marginTop: 3, lineHeight: 1.5 }}>{o.note}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div style={card}>
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.09em', textTransform: 'uppercase' }}>Avatar and password</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 16 }}>
              <Avatar displayName={displayName || 'You'} avatarIndex={user?.avatarIndex ?? 0} photo={user?.avatarPhoto} size={56} fontSize={18} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 700 }}>{displayName}</div>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: '#928892', marginTop: 3 }}>
                  @{username} · verified at Blk {user?.block} #{user?.unit}
                </div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(9,1fr)', gap: 10, marginTop: 18 }}>
              {AVATARS.map((a, i) => (
                <button
                  key={i}
                  onClick={() => pickAvatar(i)}
                  style={{
                    aspectRatio: '1',
                    borderRadius: '50%',
                    border: 0,
                    padding: 0,
                    cursor: 'pointer',
                    background: gradientCss(a[0], a[1]),
                    color: '#fff',
                    fontSize: 12,
                    fontWeight: 800,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: user?.avatarIndex === i && !hasPhoto ? '0 0 0 2px #fff, 0 0 0 4px #5B34D9' : 'none',
                  }}
                >
                  {hasPhoto ? '' : initialsFromName(displayName) || 'YOU'}
                </button>
              ))}
              <button
                onClick={() => fileRef.current?.click()}
                style={{
                  aspectRatio: '1',
                  borderRadius: '50%',
                  border: '1.5px dashed #D6CEC6',
                  padding: 0,
                  cursor: 'pointer',
                  background: hasPhoto ? `url(${user?.avatarPhoto}) center/cover no-repeat` : '#FBF8F4',
                  color: '#928892',
                  fontSize: 9,
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: hasPhoto ? '0 0 0 2px #fff, 0 0 0 4px #5B34D9' : 'none',
                }}
              >
                {hasPhoto ? '' : 'photo'}
              </button>
            </div>
            <input ref={fileRef} type="file" accept="image/*" onChange={onPhoto} style={{ display: 'none' }} />
            {hasPhoto && (
              <button onClick={removePhoto} style={{ marginTop: 12, border: 0, background: 'transparent', padding: 0, cursor: 'pointer', fontSize: 12, fontWeight: 700, color: '#5B34D9' }}>
                Remove photo
              </button>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 22 }}>
              <div>
                <div style={fieldLabel}>New password</div>
                <input type="password" value={pw1} onChange={(e) => setPw1(e.target.value)} placeholder="at least 8 characters" style={{ ...textInput, marginTop: 6, fontSize: 13.5 }} />
              </div>
              <div>
                <div style={fieldLabel}>Confirm password</div>
                <input
                  type="password"
                  value={pw2}
                  onChange={(e) => setPw2(e.target.value)}
                  placeholder="repeat it"
                  style={{ ...textInput, marginTop: 6, fontSize: 13.5, borderColor: pw2.length && !pwMatch ? '#D98A96' : '#E5DCD3' }}
                />
              </div>
            </div>
            <div style={{ fontSize: 12, fontWeight: 700, color: pw2.length === 0 ? '#928892' : pwMatch ? '#0C7C58' : '#B3253A', marginTop: 12 }}>
              {pw2.length === 0 ? 'Use something you can remember at the collection table.' : pwMatch ? 'Passwords match.' : 'Passwords do not match yet.'}
            </div>
            <button onClick={savePassword} disabled={savingPw} style={{ ...outlineButton, marginTop: 16, padding: '11px 16px', fontSize: 12.5, color: '#1E1926' }}>
              {savingPw ? 'Updating…' : 'Update password'}
            </button>
          </div>

          <div style={card}>
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.09em', textTransform: 'uppercase' }}>Since you joined</div>
            <div style={{ display: 'flex', flexDirection: 'column', marginTop: 14 }}>
              {accountStats.map((s, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', padding: '11px 0', borderBottom: '1px solid #F3ECE4' }}>
                  <div style={{ fontSize: 12.5, color: '#6F6678' }}>{s.label}</div>
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13.5, fontWeight: 500 }}>{s.value}</div>
                </div>
              ))}
            </div>
            <button onClick={doSignOut} style={{ ...outlineButton, marginTop: 20, width: '100%', padding: 12, fontSize: 12.5, color: '#B3253A' }}>
              Sign out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
