import { useEffect, useState, type CSSProperties } from 'react';

// Product imagery (CONTRACT.md §4.1). The retail console can now attach a real
// `imageUrl` (data URL or uploaded path); the striped slot the prototype used
// stays as the fallback — for products with no image, and for images that fail
// to load.

interface ProductImageProps {
  src: string | null | undefined;
  /** The `imageSlot` code printed on the striped placeholder. */
  slot: string;
  alt: string;
  aspectRatio: string;
  /** Stripe pitch, so the grid card and the detail hero keep their own scale. */
  stripe: number;
  slotFontSize: number;
  style?: CSSProperties;
}

export function ProductImage({ src, slot, alt, aspectRatio, stripe, slotFontSize, style }: ProductImageProps) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  const base: CSSProperties = { aspectRatio, ...style };

  if (src && !failed) {
    return (
      <div style={{ ...base, overflow: 'hidden', background: '#F8F3ED' }}>
        <img
          src={src}
          alt={alt}
          onError={() => setFailed(true)}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
      </div>
    );
  }

  return (
    <div
      style={{
        ...base,
        background: `repeating-linear-gradient(135deg,#F2EBE3 0 ${stripe}px,#F8F3ED ${stripe}px ${stripe * 2}px)`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: slotFontSize,
          color: '#A79E9E',
          letterSpacing: '.04em',
        }}
      >
        {slot}
      </div>
    </div>
  );
}
