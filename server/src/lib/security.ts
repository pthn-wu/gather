import type { NextFunction, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

const isProd = process.env.NODE_ENV === 'production';

/**
 * Secrets must fail closed.
 *
 * A JWT secret with a fallback default is not a secret: every deployment that
 * forgets to set it shares a signing key with the README, and anyone can mint an
 * admin token. In production we refuse to boot without a strong secret rather
 * than start up quietly insecure. In development a random per-process secret is
 * generated, which invalidates tokens on restart — noisy, but never a shared key.
 */
export function resolveJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (isProd) {
    if (!secret || secret.length < 32) {
      throw new Error(
        'JWT_SECRET must be set to at least 32 characters in production. ' +
          'Generate one with: openssl rand -base64 48'
      );
    }
    if (/change|example|secret|dev|test|placeholder/i.test(secret)) {
      throw new Error('JWT_SECRET looks like a placeholder. Use a real random value.');
    }
    return secret;
  }
  if (secret && secret.length >= 16) return secret;
  // eslint-disable-next-line global-require, @typescript-eslint/no-var-requires
  const random = require('crypto').randomBytes(48).toString('base64');
  console.warn('[security] JWT_SECRET unset — using a random development secret. Tokens reset on restart.');
  return random;
}

/**
 * CORS allowlist. The previous implementation called `callback(null, true)`
 * unconditionally, which allowed every origin — with `credentials: true` that
 * lets any site on the internet make authenticated requests on a signed-in
 * user's behalf. Now: an explicit allowlist, localhost only outside production.
 */
export function corsMiddleware() {
  const allowed = (process.env.CORS_ORIGINS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  return cors({
    origin(origin, callback) {
      // Same-origin / curl / mobile apps send no Origin header.
      if (!origin) return callback(null, true);
      if (allowed.includes(origin)) return callback(null, true);
      if (!isProd && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
        return callback(null, true);
      }
      return callback(new Error('Origin not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    maxAge: 600,
  });
}

/** Security headers. This is a JSON API, so the CSP is maximally restrictive. */
export function securityHeaders() {
  return helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'none'"],
        frameAncestors: ["'none'"],
        baseUri: ["'none'"],
        formAction: ["'none'"],
      },
    },
    crossOriginResourcePolicy: { policy: 'same-site' },
    referrerPolicy: { policy: 'no-referrer' },
    hsts: isProd ? { maxAge: 31_536_000, includeSubDomains: true, preload: true } : false,
  });
}

/**
 * Rate limits. Credential endpoints get a tight limit because they are the ones
 * worth brute-forcing; everything else gets a generous ceiling that only a
 * runaway client or a scraper would reach.
 */
const limiter = (
  windowMs: number,
  max: number,
  message: string,
  opts: { skipFailedRequests?: boolean } = {}
) =>
  rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: message },
    ...opts,
    // Deliberately using the library's default key generator. A hand-rolled
    // `req.ip` key silently lets IPv6 clients bypass the limit by rotating
    // addresses within their /64 — the default normalises the prefix. What
    // req.ip resolves to behind a proxy is governed by `trust proxy` below,
    // so a spoofed X-Forwarded-For cannot shift the key either.
  });

/** 10 sign-in attempts per 15 minutes per IP. */
export const authLimiter = limiter(
  15 * 60 * 1000,
  Number(process.env.RATE_LIMIT_AUTH ?? 10),
  'Too many sign-in attempts. Wait a few minutes and try again.'
);

/** Writes: 120 per minute. Bulk imports are a handful of calls, not hundreds. */
export const writeLimiter = limiter(
  60 * 1000,
  Number(process.env.RATE_LIMIT_WRITE ?? 120),
  'Too many requests. Slow down.'
);

/**
 * The public enquiry form: 5 per hour. It is the only write on the API that
 * needs no session, so it is the only one a passer-by can spam. A property
 * office submits this once.
 */
export const enquiryLimiter = limiter(
  60 * 60 * 1000,
  Number(process.env.RATE_LIMIT_ENQUIRY ?? 5),
  'Thanks — we already have your enquiry. Give us a little time to come back to you.',
  // Count submissions that were actually stored, not attempts. Rejected bodies
  // are the ones a person makes by mistyping a phone number, and locking them
  // out for an hour — with a message saying we already have their enquiry —
  // would lose exactly the lead this form exists to collect. Invalid requests
  // write nothing and are still bounded by the global write ceiling.
  { skipFailedRequests: true }
);

/** Everything else: 600 per minute. */
export const generalLimiter = limiter(
  60 * 1000,
  Number(process.env.RATE_LIMIT_GENERAL ?? 600),
  'Too many requests. Slow down.'
);

/**
 * Error handler that never leaks internals.
 *
 * The previous handler returned `err.message` to the client, which surfaces
 * Prisma constraint text, file paths and query fragments to anyone who can
 * trigger a 500. Now the detail goes to the server log with a correlation id and
 * the client gets that id plus a generic message.
 */
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  const ref = Math.random().toString(36).slice(2, 10);

  if (err instanceof Error && err.message === 'Origin not allowed by CORS') {
    return res.status(403).json({ error: 'Origin not allowed' });
  }
  // body-parser raises this for oversized or malformed JSON.
  const status = (err as { status?: number; statusCode?: number })?.status
    ?? (err as { statusCode?: number })?.statusCode;
  if (status === 400 || status === 413) {
    return res.status(status).json({
      error: status === 413 ? 'Request body too large' : 'Malformed request body',
    });
  }

  console.error(`[error ${ref}] ${req.method} ${req.path}`, err);
  return res.status(500).json({ error: 'Internal server error', ref });
}

/** Strip fingerprinting headers Express adds by default. */
export function hardenApp(app: { disable: (s: string) => void; set: (k: string, v: unknown) => void }) {
  app.disable('x-powered-by');
  // Behind Vercel/a load balancer, trust exactly one proxy hop so req.ip is the
  // real client rather than a spoofable header value.
  app.set('trust proxy', Number(process.env.TRUST_PROXY_HOPS ?? (isProd ? 1 : 0)));
}
