import type { CSSProperties } from 'react';
import { avatarGradient, initialsFromName } from '../utils/format';

interface AvatarProps {
  displayName: string;
  avatarIndex: number;
  photo?: string | null;
  size: number;
  fontSize?: number;
  ring?: boolean;
}

export function Avatar({ displayName, avatarIndex, photo, size, fontSize, ring }: AvatarProps) {
  const hasPhoto = !!photo;
  const style: CSSProperties = {
    width: size,
    height: size,
    borderRadius: '50%',
    flex: 'none',
    background: hasPhoto ? `url(${photo}) center/cover no-repeat` : avatarGradient(avatarIndex),
    color: '#fff',
    fontSize: fontSize ?? Math.round(size * 0.32),
    fontWeight: 800,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: ring ? '0 0 0 2px #fff, 0 0 0 4px #5B34D9' : 'none',
  };
  return <div style={style}>{hasPhoto ? '' : initialsFromName(displayName)}</div>;
}
