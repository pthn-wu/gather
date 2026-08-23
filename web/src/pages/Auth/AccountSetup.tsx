import { useRef, useState, type ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import logo from '../../assets/gather-logo-web.png';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { setupAccount } from '../../api/endpoints';
import { AVATARS, gradientCss, initialsFromName } from '../../utils/format';
import { fieldLabel, outlineButton, primaryButton, textInput } from '../../styles/shared';

export function AccountSetup() {
  const { user, applyUser, setMustSetPassword } = useAuth();
  const { flash } = useToast();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);

  const [avatar, setAvatar] = useState(user?.avatarIndex ?? 0);
  const [photo, setPhoto] = useState<string | null>(user?.avatarPhoto ?? null);
  const [username, setUsername] = useState(user?.username ?? '');
  const [displayName, setDisplayName] = useState(user?.displayName ?? '');
  const [pw1, setPw1] = useState('');
  const [pw2, setPw2] = useState('');
  const [saving, setSaving] = useState(false);

  const hasPhoto = !!photo;
  const myInitials = hasPhoto ? '' : initialsFromName(displayName) || 'YOU';
  const pwMatch = pw1.length > 0 && pw1 === pw2;

  const onPhoto = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPhoto(reader.result as string);
    reader.readAsDataURL(file);
  };

  const finishToShop = () => {
    setMustSetPassword(false);
    navigate('/shop');
  };

  const save = async () => {
    if (pw1.length && !pwMatch) {
      flash('Enter the same password twice to continue');
      return;
    }
    if (!pw1.length) {
      flash('Set a password to continue');
      return;
    }
    setSaving(true);
    try {
      const res = await setupAccount({
        displayName,
        username,
        password: pw1,
        avatarIndex: hasPhoto ? undefined : avatar,
        avatarPhoto: hasPhoto ? photo : null,
      });
      applyUser(res.user);
      finishToShop();
    } catch {
      flash('Could not save your account — try again');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ flex: 1, display: 'flex', justifyContent: 'center', padding: '72px 36px' }}>
      <div style={{ width: 520 }}>
        <img src={logo} alt="Gather" width={262} height={80} style={{ width: 104, height: 'auto', display: 'block' }} />
        <div style={{ fontFamily: 'Poppins, sans-serif', fontSize: 30, fontWeight: 600, letterSpacing: '-.02em', marginTop: 28 }}>
          Set up your account
        </div>
        <div style={{ fontSize: 13.5, color: '#5B5364', lineHeight: 1.65, marginTop: 8 }}>
          Choose an avatar, then set the username and password you will use from now on.
        </div>

        <div style={{ background: '#fff', border: '1px solid #EBE3DA', borderRadius: 10, padding: 26, marginTop: 24 }}>
          <div style={fieldLabel}>Pick an avatar</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 12, marginTop: 12 }}>
            {AVATARS.map((a, i) => (
              <button
                key={i}
                onClick={() => {
                  setAvatar(i);
                  setPhoto(null);
                }}
                style={{
                  aspectRatio: '1',
                  borderRadius: '50%',
                  border: 0,
                  padding: 0,
                  cursor: 'pointer',
                  background: gradientCss(a[0], a[1]),
                  color: '#fff',
                  fontSize: 14,
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: avatar === i && !hasPhoto ? '0 0 0 2px #fff, 0 0 0 4px #5B34D9' : 'none',
                }}
              >
                {myInitials || 'YOU'}
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
                background: hasPhoto ? `url(${photo}) center/cover no-repeat` : '#FBF8F4',
                color: '#928892',
                fontSize: 10.5,
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
            <button onClick={() => setPhoto(null)} style={{ marginTop: 12, ...linkStyle }}>
              Remove photo
            </button>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 22 }}>
            <div>
              <div style={fieldLabel}>Username</div>
              <input value={username} onChange={(e) => setUsername(e.target.value)} style={{ ...textInput, marginTop: 7 }} />
            </div>
            <div>
              <div style={fieldLabel}>Display name</div>
              <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} style={{ ...textInput, marginTop: 7 }} />
            </div>
            <div>
              <div style={fieldLabel}>New password</div>
              <input
                type="password"
                value={pw1}
                onChange={(e) => setPw1(e.target.value)}
                placeholder="at least 8 characters"
                style={{ ...textInput, marginTop: 7 }}
              />
            </div>
            <div>
              <div style={fieldLabel}>Confirm password</div>
              <input
                type="password"
                value={pw2}
                onChange={(e) => setPw2(e.target.value)}
                placeholder="repeat it"
                style={{ ...textInput, marginTop: 7, borderColor: pw2.length && !pwMatch ? '#D98A96' : '#E5DCD3' }}
              />
            </div>
          </div>
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: pw2.length === 0 ? '#928892' : pwMatch ? '#0C7C58' : '#B3253A',
              marginTop: 12,
            }}
          >
            {pw2.length === 0
              ? 'Use something you can remember at the collection table.'
              : pwMatch
                ? 'Passwords match.'
                : 'Passwords do not match yet.'}
          </div>
          <button onClick={save} disabled={saving} style={{ ...primaryButton, marginTop: 20, width: '100%', padding: 14, fontSize: 14 }}>
            {saving ? 'Saving…' : 'Save and start ordering'}
          </button>
          <button onClick={finishToShop} style={{ ...outlineButton, marginTop: 10, width: '100%', padding: 12, fontSize: 12.5 }}>
            Do this later
          </button>
        </div>
      </div>
    </div>
  );
}

const linkStyle = {
  border: 0,
  background: 'transparent',
  padding: 0,
  cursor: 'pointer',
  fontSize: 12,
  fontWeight: 700,
  color: '#5B34D9',
} as const;
