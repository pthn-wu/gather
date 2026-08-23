import jwt from 'jsonwebtoken';

import { resolveJwtSecret } from './security';

/**
 * Fails closed in production: see resolveJwtSecret(). There is deliberately no
 * hard-coded fallback here — a default signing key is not a secret.
 */
const JWT_SECRET = resolveJwtSecret();

export type AdminRole = 'office' | 'retail';

export interface UserTokenPayload {
  sub: string;
  type: 'user';
}

export interface AdminTokenPayload {
  sub: string;
  type: 'admin';
  role: AdminRole;
  communityId: string | null;
}

export function signUserToken(userId: string): string {
  const payload: UserTokenPayload = { sub: userId, type: 'user' };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '30d' });
}

export function signAdminToken(adminId: string, role: AdminRole, communityId: string | null): string {
  const payload: AdminTokenPayload = { sub: adminId, type: 'admin', role, communityId };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '30d' });
}

export function verifyToken(token: string): UserTokenPayload | AdminTokenPayload {
  return jwt.verify(token, JWT_SECRET) as UserTokenPayload | AdminTokenPayload;
}
