import { NextFunction, Request, Response } from 'express';
import { AdminUser, User } from '@prisma/client';
import { AdminRole, verifyToken } from '../lib/jwt';
import { prisma } from '../lib/prisma';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: User & { community: any };
      admin?: AdminUser;
    }
  }
}

function extractToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return null;
  return header.slice('Bearer '.length).trim();
}

export async function requireUser(req: Request, res: Response, next: NextFunction) {
  const token = extractToken(req);
  if (!token) return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  try {
    const payload = verifyToken(token);
    if (payload.type !== 'user') return res.status(401).json({ error: 'Invalid token type' });
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      include: { community: true },
    });
    if (!user) return res.status(401).json({ error: 'User not found' });
    if (user.accountState === 'suspended') {
      return res.status(403).json({ error: 'This account is suspended — contact the property office' });
    }
    req.user = user as any;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

/**
 * Back-office auth. `role` is the console the router belongs to:
 *   'retail' — Capital Retail, every contracted community, sees cost & margin
 *   'office' — one property office, its own community only, never sees cost or margin
 * A token for the wrong console gets 403, not 401 — it is a valid login, wrong door.
 */
export function requireAdmin(role?: AdminRole) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const token = extractToken(req);
    if (!token) return res.status(401).json({ error: 'Missing or invalid Authorization header' });
    let payload;
    try {
      payload = verifyToken(token);
    } catch (err) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    if (payload.type !== 'admin') return res.status(401).json({ error: 'Invalid token type' });
    const admin = await prisma.adminUser.findUnique({ where: { id: payload.sub } });
    if (!admin) return res.status(401).json({ error: 'Admin not found' });
    if (role && admin.role !== role) {
      return res.status(403).json({ error: `Forbidden — this is a ${role} console endpoint` });
    }
    if (admin.role === 'office' && !admin.communityId) {
      return res.status(403).json({ error: 'Office admin is not attached to a community' });
    }
    req.admin = admin;
    next();
  };
}

/** The community an office admin is scoped to. Only valid behind requireAdmin('office'). */
export function officeCommunityId(req: Request): string {
  return req.admin!.communityId!;
}
