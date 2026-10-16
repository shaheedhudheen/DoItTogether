import { Request, Response, NextFunction } from 'express';

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

// Unique prefix per limiter instance — without it, every limiter that keys
// on req.ip would share one bucket in the module-level map (a global
// 2000-req limiter would silently exhaust the register limiter's budget).
let limiterSeq = 0;

/**
 * Lightweight in-memory rate limiter (single-instance).
 * For multi-instance deployments, back this with a shared store (e.g. Redis).
 */
export const rateLimit = (options: {
  windowMs?: number;
  max?: number;
  key?: (req: Request) => string;
} = {}) => {
  const windowMs = options.windowMs ?? 15 * 60 * 1000;
  const max = options.max ?? 30;
  const limiterId = `rl${++limiterSeq}`;
  const keyFn = options.key
    ? (req: Request) => `${limiterId}:${options.key!(req)}`
    : (req: Request) => `${limiterId}:${req.ip}`;

  return (req: Request, res: Response, next: NextFunction) => {
    const now = Date.now();
    const key = keyFn(req);
    let bucket = buckets.get(key);

    if (!bucket || bucket.resetAt <= now) {
      bucket = { count: 0, resetAt: now + windowMs };
      buckets.set(key, bucket);
    }

    bucket.count += 1;

    if (bucket.count > max) {
      const retryAfterSec = Math.ceil((bucket.resetAt - now) / 1000);
      res.setHeader('Retry-After', String(retryAfterSec));
      return res.status(429).json({
        success: false,
        message: 'Too many attempts. Please try again later.'
      });
    }

    // Opportunistic cleanup to avoid unbounded growth
    if (buckets.size > 5000) {
      for (const [k, b] of buckets) {
        if (b.resetAt <= now) buckets.delete(k);
      }
    }

    next();
  };
};
