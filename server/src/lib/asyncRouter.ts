import { Router, type RequestHandler } from 'express';

/**
 * A Router whose handlers may be `async` without swallowing their failures.
 *
 * Express 4 calls a handler and ignores what it returns. An `async` handler
 * returns a promise, so a rejection inside it -- a Prisma error, a bad
 * connection string, anything thrown after the first `await` -- becomes an
 * unhandled rejection. `next(err)` is never called, the error handler never
 * runs, and no response is ever sent. The client sees the request hang until
 * something upstream gives up: locally that is the browser, on Vercel it is a
 * 20-second function timeout returning 504 GATEWAY_TIMEOUT with no body.
 *
 * That failure mode is actively misleading. A malformed DATABASE_URL, which
 * Prisma reports instantly and precisely, presented as a gateway timeout --
 * which reads like the database is unreachable or the query is slow.
 *
 * Every route in this API is async and none of them wrap themselves in
 * try/catch, so this wrapper is what makes `errorHandler` reachable at all.
 * Use `createRouter()` in place of `Router()`; nothing else changes.
 */

const WRAPPED_METHODS = ['get', 'post', 'put', 'patch', 'delete', 'all', 'use'] as const;

function isSubRouter(fn: unknown): boolean {
  // An express Router is itself a function, so it reaches us looking like a
  // handler. Its `stack` is what distinguishes it, and wrapping one would break
  // mounting.
  return typeof fn === 'function' && 'stack' in (fn as object);
}

function wrap(handler: RequestHandler): RequestHandler {
  // Error-handling middleware takes (err, req, res, next). Wrapping it would
  // change its arity and Express would stop recognising it as an error handler.
  if (handler.length >= 4) return handler;

  return function wrapped(req, res, next) {
    try {
      const result: unknown = handler(req, res, next);
      if (result instanceof Promise) result.catch(next);
    } catch (err) {
      next(err);
    }
  };
}

export function createRouter(): Router {
  const router = Router();

  for (const method of WRAPPED_METHODS) {
    const original = router[method].bind(router) as (...args: unknown[]) => unknown;
    (router as unknown as Record<string, unknown>)[method] = (...args: unknown[]) =>
      original(
        ...args.map((arg) =>
          typeof arg === 'function' && !isSubRouter(arg) ? wrap(arg as RequestHandler) : arg,
        ),
      );
  }

  return router;
}
