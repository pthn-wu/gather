import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import logo from '../../assets/gather-logo-web.png';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { fieldLabel, outlineButton, primaryButton, textInput } from '../../styles/shared';
import { ApiError } from '../../api/client';

export function SignIn() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { pendingCommunity, signIn } = useAuth();
  const { flash } = useToast();
  const navigate = useNavigate();

  const communityLabel = pendingCommunity?.label ?? 'your property';

  const handleSignIn = async () => {
    if (!username.trim() || !password) {
      flash('Enter your username and password');
      return;
    }
    setSubmitting(true);
    try {
      const { mustSetPassword } = await signIn(username.trim(), password);
      navigate(mustSetPassword ? '/setup' : '/shop');
    } catch (err) {
      if (err instanceof ApiError && err.status === 0) {
        flash('Could not reach the Gather server');
      } else {
        flash('Username or password not recognised');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ flex: 1, display: 'flex', justifyContent: 'center', padding: '72px 36px' }}>
      <div style={{ width: 520 }}>
        <img src={logo} alt="Gather" width={262} height={80} style={{ width: 104, height: 'auto', display: 'block' }} />
        <div style={{ fontFamily: 'Poppins, sans-serif', fontSize: 30, fontWeight: 600, letterSpacing: '-.02em', marginTop: 28 }}>
          Sign in
        </div>
        <div style={{ fontSize: 13.5, color: '#5B5364', lineHeight: 1.65, marginTop: 8 }}>
          Accounts for {communityLabel} are created by the property office, which verifies your unit before you get
          access. No SMS codes.
        </div>

        <div style={{ background: '#fff', border: '1px solid #EBE3DA', borderRadius: 10, padding: 26, marginTop: 24 }}>
          <div style={fieldLabel}>Username</div>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="given by the property office"
            style={{ ...textInput, marginTop: 7 }}
          />
          <div style={{ ...fieldLabel, marginTop: 18 }}>Password</div>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            style={{ ...textInput, marginTop: 7 }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSignIn();
            }}
          />
          <div style={{ fontSize: 12.5, color: '#6F6678', lineHeight: 1.6, marginTop: 16 }}>
            First sign-in? Use the temporary password from the office — you'll set your own next.
          </div>
          <button
            onClick={handleSignIn}
            disabled={submitting}
            style={{ ...primaryButton, marginTop: 20, width: '100%', padding: 14, fontSize: 14 }}
          >
            {submitting ? 'Signing in…' : `Sign in to ${communityLabel}`}
          </button>
          <button
            onClick={() => navigate('/')}
            style={{ ...outlineButton, marginTop: 10, width: '100%', padding: 12, fontSize: 12.5 }}
          >
            Choose another property
          </button>
          <div style={{ marginTop: 18, textAlign: 'center', fontSize: 12, color: '#8B8194' }}>
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
