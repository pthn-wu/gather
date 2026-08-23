interface StepperProps {
  qty: number;
  onDec: () => void;
  onInc: () => void;
  size?: 'md' | 'sm';
}

export function Stepper({ qty, onDec, onInc, size = 'md' }: StepperProps) {
  const btnSize = size === 'md' ? { width: 38, height: 40, fontSize: 16 } : { width: 36, height: 34, fontSize: 15 };
  const numSize = size === 'md' ? 14 : 13;
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        border: '1px solid #E5DCD3',
        borderRadius: 9,
        overflow: 'hidden',
      }}
    >
      <button
        onClick={onDec}
        style={{
          width: btnSize.width,
          height: btnSize.height,
          border: 0,
          background: '#fff',
          fontSize: btnSize.fontSize,
          fontWeight: 600,
          color: '#1E1926',
          cursor: 'pointer',
        }}
      >
        &minus;
      </button>
      <div
        style={{
          width: 44,
          textAlign: 'center',
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: numSize,
        }}
      >
        {qty}
      </div>
      <button
        onClick={onInc}
        style={{
          width: btnSize.width,
          height: btnSize.height,
          border: 0,
          background: '#fff',
          fontSize: btnSize.fontSize,
          fontWeight: 600,
          color: '#1E1926',
          cursor: 'pointer',
        }}
      >
        +
      </button>
    </div>
  );
}
