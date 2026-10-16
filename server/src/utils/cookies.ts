import { Request, Response } from 'express';

export const REFRESH_COOKIE = 'dit_refresh_token';

const REFRESH_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // matches refresh JWT expiry

const cookieOptions = () => ({
  httpOnly: true,                                     // unreadable by JS (XSS-safe)
  sameSite: 'strict' as const,                        // never sent cross-site (CSRF-safe)
  secure: process.env.NODE_ENV === 'production',      // https-only in production
  path: '/api/auth',                                  // only sent to auth endpoints
  maxAge: REFRESH_MAX_AGE_MS
});

/** Store the refresh token in an httpOnly cookie — never expose it to JavaScript. */
export const setRefreshCookie = (res: Response, token: string) => {
  res.cookie(REFRESH_COOKIE, token, cookieOptions());
};

export const clearRefreshCookie = (res: Response) => {
  res.clearCookie(REFRESH_COOKIE, { ...cookieOptions(), maxAge: undefined });
};

/** Minimal cookie reader (avoids adding cookie-parser for a single cookie). */
export const readRefreshCookie = (req: Request): string | null => {
  const header = req.headers.cookie;
  if (!header) return null;
  for (const part of header.split(';')) {
    const eq = part.indexOf('=');
    if (eq === -1) continue;
    if (part.slice(0, eq).trim() !== REFRESH_COOKIE) continue;
    const value = part.slice(eq + 1).trim();
    try {
      return decodeURIComponent(value);
    } catch {
      return value;
    }
  }
  return null;
};

/** Refresh token from cookie first, request body as fallback (non-browser clients/tests). */
export const getRefreshTokenFromRequest = (req: Request): string | null => {
  const fromCookie = readRefreshCookie(req);
  if (fromCookie) return fromCookie;
  const body = req.body?.refreshToken;
  return typeof body === 'string' && body.length > 0 ? body : null;
};
