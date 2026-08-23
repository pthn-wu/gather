import { COMMUNITIES } from "../api/fixtures";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { C, F } from "../theme";

const label: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: C.faint };
const input: React.CSSProperties = {
  width: "100%", marginTop: 7, padding: "12px 14px", border: `1px solid ${C.input}`,
  borderRadius: 9, background: "#fff", fontSize: 14, fontWeight: 600, color: C.ink,
};

export default function SignIn() {
  const a = useAuth();
  const flash = useToast();
  const isOffice = a.authRole === "office";
  const comm = COMMUNITIES.find((c) => c.id === a.authCommunityId) ?? COMMUNITIES[0];

  const submit = async () => {
    const ok = await a.signIn();
    if (ok) flash(isOffice ? `Signed in · ${comm.name} office` : "Signed in · Capital Retail");
  };

  return (
    <div style={{ display: "flex", justifyContent: "center", padding: "76px 36px", minHeight: "100vh" }}>
      <div style={{ width: 520 }}>
        <img src="/gather-logo.png" alt="Gather" width={262} height={80}
          style={{ width: 104, height: "auto", display: "block" }} />
        <div
          style={{
            fontSize: 11, fontWeight: 800, letterSpacing: ".09em", textTransform: "uppercase",
            color: C.purple, marginTop: 26,
          }}
        >
          {isOffice ? "Property office" : "Capital Retail"}
        </div>
        <div
          style={{
            fontFamily: F.head, fontSize: 30, fontWeight: 600, letterSpacing: "-.02em", marginTop: 10,
          }}
        >
          {isOffice ? "Office console" : "Retail console"}
        </div>
        <div style={{ fontSize: 13.5, color: "#5B5364", lineHeight: 1.65, marginTop: 8, textWrap: "pretty" }}>
          {isOffice
            ? `Signing in as the ${comm.name} office. This console only sees its own households, orders and collection days.`
            : "Signing in across every contracted community. Catalog, tier pricing and dispatch for all four towers."}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
          style={{
            background: "#fff", border: `1px solid ${C.border}`, borderRadius: 11,
            padding: 26, marginTop: 24,
          }}
        >
          {isOffice ? (
            <>
              <div style={label}>Community</div>
              <select
                value={a.authCommunityId}
                onChange={(e) => a.setAuthCommunityId(e.target.value)}
                style={{
                  width: "100%", marginTop: 7, padding: "12px", border: `1px solid ${C.input}`,
                  borderRadius: 9, background: "#fff", fontSize: 13.5, fontWeight: 600, color: C.ink,
                }}
              >
                {COMMUNITIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} · {c.households} households
                  </option>
                ))}
              </select>
            </>
          ) : null}

          <div style={{ ...label, marginTop: 18 }}>{isOffice ? "Office username" : "Work email"}</div>
          <input
            value={a.username}
            onChange={(e) => a.setUsername(e.target.value)}
            placeholder={isOffice ? "gems1.office" : "name@capitalretail.mm"}
            autoComplete="username"
            style={input}
          />

          <div style={{ ...label, marginTop: 18 }}>Password</div>
          <input
            type="password"
            value={a.password}
            onChange={(e) => a.setPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete="current-password"
            style={input}
          />

          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 18 }}>
            <button
              type="button"
              onClick={a.toggleRemember}
              aria-pressed={a.remember}
              style={{
                width: 17, height: 17, flex: "none", borderRadius: 5,
                border: `1.5px solid ${a.remember ? C.purple : C.check}`,
                background: a.remember ? C.purple : "#fff", cursor: "pointer", padding: 0,
                color: "#fff", fontSize: 11, fontWeight: 800, display: "flex",
                alignItems: "center", justifyContent: "center",
              }}
            >
              {a.remember ? "✓" : ""}
            </button>
            <div style={{ fontSize: 12.5, color: C.muted }}>
              {isOffice
                ? "Keep this guardhouse laptop signed in for 12 hours"
                : "Remember this device for 30 days"}
            </div>
          </div>

          <div style={{ fontSize: 12.5, fontWeight: 700, color: C.red, marginTop: 14, minHeight: 16 }}>
            {a.error}
          </div>

          <button
            type="submit"
            disabled={a.busy}
            style={{
              marginTop: 16, width: "100%", padding: 14, border: 0, borderRadius: 9,
              background: C.ink, color: "#fff", fontFamily: F.body, fontSize: 14,
              fontWeight: 700, cursor: a.busy ? "wait" : "pointer",
            }}
          >
            {a.busy
              ? "Signing in…"
              : isOffice
                ? `Open ${comm.short ?? comm.name} office console`
                : "Open retail console"}
          </button>
          <button
            type="button"
            onClick={a.fillDemo}
            style={{
              marginTop: 10, width: "100%", padding: 12, border: `1px solid ${C.input}`,
              borderRadius: 9, background: "#fff", color: C.purple, fontFamily: F.body,
              fontSize: 12.5, fontWeight: 700, cursor: "pointer",
            }}
          >
            Fill the demo credentials
          </button>
          <button
            type="button"
            onClick={a.goHome}
            style={{
              marginTop: 10, width: "100%", padding: 12, border: 0, background: "transparent",
              color: C.muted, fontFamily: F.body, fontSize: 12.5, fontWeight: 700, cursor: "pointer",
            }}
          >
            ← Back to console picker
          </button>
        </form>

        <div style={{ fontSize: 12, color: C.faint2, lineHeight: 1.6, marginTop: 18, textWrap: "pretty" }}>
          {isOffice
            ? "Resident accounts are created inside this console, never here. Residents sign in on the Gather app with the slip you hand them."
            : "Every price change and promotion is logged against your staff account and visible to the property offices."}
        </div>
      </div>
    </div>
  );
}
