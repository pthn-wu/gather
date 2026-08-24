import { useEffect, useRef, useState } from 'react';
import { submitPropertyEnquiry, type PropertyEnquiry } from '../api/endpoints';
import { fieldLabel, mono, outlineButton, primaryButton, textInput } from '../styles/shared';

/**
 * "Register interest" for a property Gather does not serve yet.
 *
 * Two things it needs to get right: enough about the property for Capital
 * Retail to judge whether it clears the 40-household bar, and a person to ring.
 * Everything else is optional, because a longer form on a public page costs
 * more leads than the extra fields are worth.
 */

const ROLES: { value: PropertyEnquiry['contactRole']; label: string }[] = [
  { value: 'office', label: 'Building / property office' },
  { value: 'committee', label: 'Residents’ committee' },
  { value: 'resident', label: 'Resident' },
  { value: 'developer', label: 'Developer or owner' },
  { value: 'other', label: 'Something else' },
];

type Draft = {
  propertyName: string;
  township: string;
  address: string;
  householdCount: string;
  blockCount: string;
  contactName: string;
  contactRole: PropertyEnquiry['contactRole'];
  contactPhone: string;
  contactEmail: string;
  note: string;
};

const EMPTY: Draft = {
  propertyName: '',
  township: '',
  address: '',
  householdCount: '',
  blockCount: '',
  contactName: '',
  contactRole: 'office',
  contactPhone: '',
  contactEmail: '',
  note: '',
};

const digits = (v: string) => v.replace(/\D/g, '').length;

export function RegisterInterest({ onClose }: { onClose: () => void }) {
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const firstField = useRef<HTMLInputElement>(null);

  useEffect(() => {
    firstField.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  // Mirrors the server's schema. The server is the one that decides — this only
  // saves someone a round trip to be told a required field is blank.
  const problem = (): string | null => {
    if (!draft.propertyName.trim()) return 'Property name is required.';
    if (!draft.township.trim()) return 'Township is required.';
    const households = Number(draft.householdCount);
    if (!draft.householdCount.trim() || !Number.isInteger(households) || households < 1)
      return 'Enter roughly how many households the property has.';
    if (draft.blockCount.trim() && !Number.isInteger(Number(draft.blockCount)))
      return 'Blocks or towers must be a whole number.';
    if (!draft.contactName.trim()) return 'We need a name to ask for.';
    if (digits(draft.contactPhone) < 7) return 'Enter a phone number we can reach you on.';
    if (draft.contactEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.contactEmail.trim()))
      return 'That email address does not look right.';
    return null;
  };

  const handleSubmit = async () => {
    const bad = problem();
    if (bad) {
      setError(bad);
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await submitPropertyEnquiry({
        propertyName: draft.propertyName.trim(),
        township: draft.township.trim(),
        address: draft.address.trim() || undefined,
        householdCount: Number(draft.householdCount),
        blockCount: draft.blockCount.trim() ? Number(draft.blockCount) : undefined,
        contactName: draft.contactName.trim(),
        contactRole: draft.contactRole,
        contactPhone: draft.contactPhone.trim(),
        contactEmail: draft.contactEmail.trim() || undefined,
        note: draft.note.trim() || undefined,
      });
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send that just now. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(30,25,38,.44)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: '56px 24px',
        overflowY: 'auto',
        zIndex: 60,
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Register interest in Gather"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 560,
          maxWidth: '100%',
          background: '#fff',
          borderRadius: 14,
          border: '1px solid #E7DFD5',
          padding: '28px 30px 26px',
          boxShadow: '0 24px 60px rgba(30,25,38,.18)',
        }}
      >
        {done ? (
          <Confirmation contactName={draft.contactName.trim()} onClose={onClose} />
        ) : (
          <>
            <div style={{ fontSize: 19, fontWeight: 800, letterSpacing: '-.02em' }}>
              Bring Gather to your property
            </div>
            <div style={{ fontSize: 12.5, color: '#6F6678', lineHeight: 1.6, marginTop: 7 }}>
              Tell us where you are and who to speak to. Capital Retail opens a property once
              around 40 households are interested, and sets the delivery days with the office.
            </div>

            <Section>The property</Section>
            <Field label="Property name">
              <input
                ref={firstField}
                value={draft.propertyName}
                onChange={(e) => set('propertyName', e.target.value)}
                placeholder="Gems Residences Tower 5"
                style={textInput}
              />
            </Field>
            <Two>
              <Field label="Township">
                <input
                  value={draft.township}
                  onChange={(e) => set('township', e.target.value)}
                  placeholder="Hlaing"
                  style={textInput}
                />
              </Field>
              <Field label="Street address" optional>
                <input
                  value={draft.address}
                  onChange={(e) => set('address', e.target.value)}
                  placeholder="No. 12, Pyay Road"
                  style={textInput}
                />
              </Field>
            </Two>
            <Two>
              <Field label="Households, roughly">
                <input
                  value={draft.householdCount}
                  onChange={(e) => set('householdCount', e.target.value.replace(/[^\d]/g, ''))}
                  inputMode="numeric"
                  placeholder="240"
                  style={{ ...textInput, ...mono }}
                />
              </Field>
              <Field label="Blocks or towers" optional>
                <input
                  value={draft.blockCount}
                  onChange={(e) => set('blockCount', e.target.value.replace(/[^\d]/g, ''))}
                  inputMode="numeric"
                  placeholder="2"
                  style={{ ...textInput, ...mono }}
                />
              </Field>
            </Two>

            <Section>Who we should contact</Section>
            <Two>
              <Field label="Your name">
                <input
                  value={draft.contactName}
                  onChange={(e) => set('contactName', e.target.value)}
                  placeholder="Daw Thida"
                  style={textInput}
                />
              </Field>
              <Field label="You are the">
                <select
                  value={draft.contactRole}
                  onChange={(e) => set('contactRole', e.target.value as Draft['contactRole'])}
                  style={{ ...textInput, appearance: 'auto' }}
                >
                  {ROLES.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </Field>
            </Two>
            <Two>
              <Field label="Phone">
                <input
                  value={draft.contactPhone}
                  onChange={(e) => set('contactPhone', e.target.value)}
                  placeholder="09 771 204 118"
                  style={{ ...textInput, ...mono }}
                />
              </Field>
              <Field label="Email" optional>
                <input
                  value={draft.contactEmail}
                  onChange={(e) => set('contactEmail', e.target.value)}
                  placeholder="office@property.mm"
                  style={textInput}
                />
              </Field>
            </Two>
            <Field label="Anything else" optional>
              <textarea
                value={draft.note}
                onChange={(e) => set('note', e.target.value)}
                rows={3}
                placeholder="Best time to call, how many households have already asked, and so on."
                style={{ ...textInput, resize: 'vertical', lineHeight: 1.55 }}
              />
            </Field>

            {error && (
              <div
                role="alert"
                style={{
                  marginTop: 16,
                  padding: '10px 13px',
                  borderRadius: 8,
                  background: '#FBEBE9',
                  border: '1px solid #F0C9CD',
                  color: '#B3253A',
                  fontSize: 12.5,
                  fontWeight: 700,
                }}
              >
                {error}
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                style={{ ...primaryButton, flex: 1, padding: 13, fontSize: 13.5 }}
              >
                {submitting ? 'Sending…' : 'Register interest'}
              </button>
              <button onClick={onClose} style={{ ...outlineButton, padding: '13px 20px', fontSize: 13 }}>
                Cancel
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Confirmation({ contactName, onClose }: { contactName: string; onClose: () => void }) {
  // Address people by the name they gave, whole and unedited. Burmese names have
  // no surname and often carry an honorific (Daw, U, Ko, Ma), so picking a token
  // out of "Daw Thida Aung" to sound friendly lands on the wrong word — this
  // greeted her as "Aung". Long names are dropped rather than truncated.
  const name = contactName.trim().length <= 40 ? contactName.trim() : '';
  return (
    <div style={{ padding: '10px 0 4px' }}>
      <div
        aria-hidden
        style={{
          width: 44,
          height: 44,
          borderRadius: '50%',
          background: '#E7F4EE',
          color: '#0C7C58',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 22,
          fontWeight: 800,
        }}
      >
        ✓
      </div>
      <div style={{ fontSize: 19, fontWeight: 800, letterSpacing: '-.02em', marginTop: 16 }}>
        Thanks{name && `, ${name}`} — that's with us
      </div>
      <div style={{ fontSize: 13, color: '#6F6678', lineHeight: 1.65, marginTop: 9 }}>
        One of Gather's representatives will contact you on the number you gave us to talk through
        how a cycle would work at your property.
      </div>
      <div style={{ fontSize: 12.5, color: '#928892', lineHeight: 1.6, marginTop: 12 }}>
        If your neighbours are keen too, tell them to register as well — a property opens sooner the
        more households ask for it.
      </div>
      <button onClick={onClose} style={{ ...primaryButton, marginTop: 22, padding: '12px 20px', fontSize: 13 }}>
        Done
      </button>
    </div>
  );
}

function Section({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 11,
        fontWeight: 800,
        letterSpacing: '.09em',
        textTransform: 'uppercase',
        color: '#A79E9E',
        marginTop: 24,
        paddingTop: 16,
        borderTop: '1px solid #F0EAE3',
      }}
    >
      {children}
    </div>
  );
}

function Two({ children }: { children: React.ReactNode }) {
  return <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>{children}</div>;
}

function Field({
  label,
  optional,
  children,
}: {
  label: string;
  optional?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label style={{ display: 'block', marginTop: 14 }}>
      <div style={{ ...fieldLabel, marginBottom: 6 }}>
        {label}
        {optional && <span style={{ fontWeight: 600, color: '#BDB4B4' }}> · optional</span>}
      </div>
      {children}
    </label>
  );
}
