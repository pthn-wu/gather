import type { NextFunction, Request, Response } from 'express';
import { ZodError, ZodType, z } from 'zod';

/**
 * Strict input validation.
 *
 * Every route parses its input through a Zod schema before touching the
 * database. Three rules make this meaningful rather than decorative:
 *
 *  1. `.strict()` on every object — unknown keys are REJECTED, not stripped.
 *     A client cannot smuggle `{ role: "retail" }` or `{ paid: true }` into a
 *     PATCH body and hope a later `...req.body` spread picks it up.
 *  2. Parsed output replaces `req.body` / `req.query` / `req.params`, so route
 *     handlers can only ever see values that survived validation. There is no
 *     path where a handler reads the raw input by accident.
 *  3. Validation errors return field-level messages and a 400 — never a stack
 *     trace, never the raw value that was rejected.
 */

type Part = 'body' | 'query' | 'params';

export function validate(schemas: Partial<Record<Part, ZodType>>) {
  return (req: Request, res: Response, next: NextFunction) => {
    for (const part of ['params', 'query', 'body'] as Part[]) {
      const schema = schemas[part];
      if (!schema) continue;
      const result = schema.safeParse(req[part] ?? {});
      if (!result.success) {
        return res.status(400).json({
          error: 'Invalid request',
          details: fieldErrors(result.error),
        });
      }
      // Query/params are getter-only on some Express versions; assign defensively.
      try {
        (req as unknown as Record<string, unknown>)[part] = result.data;
      } catch {
        Object.defineProperty(req, part, { value: result.data, writable: true, configurable: true });
      }
    }
    return next();
  };
}

function fieldErrors(err: ZodError): { field: string; message: string }[] {
  return err.issues.slice(0, 20).map((i) => ({
    field: i.path.join('.') || '(root)',
    message: i.message,
  }));
}

// ---------------------------------------------------------------------------
// Primitives
// ---------------------------------------------------------------------------

/** Prisma cuid — the only id shape this API ever issues. */
export const id = z.string().trim().min(1).max(64).regex(/^[A-Za-z0-9_-]+$/, 'Invalid id');

/** A community may be addressed by id or by its short code (G1..G4). */
export const communityRef = z.string().trim().min(1).max(64).regex(/^[A-Za-z0-9_-]+$/, 'Invalid community');

export const idParam = z.object({ id }).strict();

/**
 * Usernames are used in URLs, logs and credential slips. Keep them to a
 * conservative charset so they can never be confused for a path or an id.
 */
export const username = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, 'Username must be at least 3 characters')
  .max(64)
  .regex(/^[a-z0-9._@-]+$/, 'Use letters, numbers, dot, dash, underscore or @ only');

/**
 * Password policy. Minimum 8 characters, matching the copy shown to residents
 * ("at least 8 characters"). Capped at 200 to bound bcrypt work — bcrypt only
 * reads the first 72 bytes anyway, but an unbounded field is a cheap DoS.
 */
export const password = z.string().min(8, 'Password must be at least 8 characters').max(200);

/** Sign-in accepts any non-empty password: policy is enforced when SETTING one. */
export const anyPassword = z.string().min(1, 'Password is required').max(200);

export const displayName = z.string().trim().min(1).max(80);
export const shortText = z.string().trim().max(200);
export const longText = z.string().trim().max(2000);

/** Myanmar Kyat: whole kyat only, never negative, bounded well above any real price. */
export const money = z.coerce.number().int('Amount must be a whole number of kyat').min(0).max(1_000_000_000);

export const qty = z.coerce.number().int().min(1, 'Quantity must be at least 1').max(999);
export const countFrom0 = z.coerce.number().int().min(0).max(100_000);

export const phone = z
  .string()
  .trim()
  .max(32)
  .regex(/^[0-9+()\s-]*$/, 'Phone can contain digits, spaces, +, - and brackets only');

export const isoDate = z.string().trim().max(40).refine((v) => !Number.isNaN(Date.parse(v)), 'Invalid date');

/**
 * Avatar photos arrive as data URLs. Validate the MIME type against an
 * allowlist and bound the size — an unchecked data URL is both a storage-abuse
 * vector and, if ever rendered into HTML unescaped, an XSS one. SVG is
 * deliberately NOT allowed: it can carry script.
 */
const MAX_PHOTO_BYTES = 2 * 1024 * 1024; // 2 MB decoded
export const dataUrlImage = z
  .string()
  .max(Math.ceil((MAX_PHOTO_BYTES * 4) / 3) + 128, 'Image is too large (max 2 MB)')
  .regex(/^data:image\/(png|jpeg|jpg|webp|gif);base64,[A-Za-z0-9+/]+=*$/, 'Image must be a PNG, JPEG, WebP or GIF data URL')
  .refine((v) => {
    const b64 = v.slice(v.indexOf(',') + 1);
    return Math.floor((b64.length * 3) / 4) <= MAX_PHOTO_BYTES;
  }, 'Image is too large (max 2 MB)');

export const avatarIndex = z.coerce.number().int().min(0).max(7);

/** The seven v2 categories — an allowlist, not free text. */
export const CATEGORY_VALUES = [
  'Grocery', 'Grocery Non-Food', 'Hardline', 'Softline', 'Homeline', 'Pharmacy', 'Fresh & Frozen',
] as const;
export const category = z.enum(CATEGORY_VALUES);

export const orderStatus = z.enum(['placed', 'packing', 'ready', 'collected']);
export const paymentMethod = z.enum(['mmqr', 'collection']);
export const promoMechanic = z.enum(['tier', 'percent', 'bundle', 'threshold']);
export const fulfilmentStage = z.enum(['open', 'confirmed', 'picking', 'packed', 'dispatched']);
export const accountState = z.enum(['none', 'issued', 'active', 'suspended']);
export const contractStatus = z.enum(['Signed', 'Pilot', 'Lapsed']);
export const verificationKind = z.enum(['New unit claim', 'Tenant change', 'Second login']);

/**
 * Free-text search. Bounded in length and stripped of control characters (which
 * only ever arrive from a malformed or hostile client, and pollute logs).
 *
 * Deliberately NOT stripping punctuation: product names contain commas, dashes
 * and ampersands ("Baby Wipes, 6 x 80s", "Grocery Non-Food", "Fresh & Frozen"),
 * so filtering those would quietly break legitimate searches. Prisma
 * parameterises the value, so punctuation is inert on the way to the database.
 */
export const searchTerm = z
  .string()
  .trim()
  .max(100)
  .transform((v) => Array.from(v).filter((ch) => ch.codePointAt(0)! >= 0x20 && ch !== '\u007f').join(''));

/** Spreadsheet import rows: bounded count, bounded keys, scalar values only. */
export const importRows = z
  .array(z.record(z.string().max(80), z.union([z.string().max(2000), z.number(), z.boolean(), z.null()])))
  .min(1, 'The sheet has no rows')
  .max(5000, 'Import is limited to 5000 rows per upload');

export { z };
