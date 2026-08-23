import { useToast } from '../context/ToastContext';

export function Toast() {
  const { toast } = useToast();
  if (!toast) return null;
  return (
    <div
      style={{
        position: 'fixed',
        left: '50%',
        bottom: 24,
        transform: 'translateX(-50%)',
        background: '#1E1926',
        color: '#fff',
        fontSize: 12.5,
        fontWeight: 600,
        padding: '11px 17px',
        borderRadius: 9,
        zIndex: 20,
      }}
    >
      {toast}
    </div>
  );
}
