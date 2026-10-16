import dotenv from 'dotenv';
import crypto from 'crypto';
dotenv.config();

const isProduction = process.env.NODE_ENV === 'production';

// Obvious placeholders that must never be accepted as secrets.
const WEAK_SECRETS = new Set([
  'access_secret_dev_only',
  'refresh_secret_dev_only',
  'secret',
  'changeme',
  'password'
]);

/**
 * Never fall back to weak/default secrets:
 *  - Production: a strong, explicitly-configured secret is REQUIRED (fail fast at boot).
 *  - Development: if missing or weak, a strong random ephemeral secret is
 *    generated for this process (sessions won't survive restarts — fine for dev).
 */
const requireSecret = (name: string): string => {
  const value = process.env[name];
  if (value && value.length >= 16 && !WEAK_SECRETS.has(value.toLowerCase())) {
    return value;
  }
  if (isProduction) {
    throw new Error(
      `[config] ${name} must be set to a strong random value (>= 16 chars) when NODE_ENV=production. ` +
      `Generate one with: node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`
    );
  }
  console.warn(`[security] ${name} is missing or weak — using an ephemeral random secret for this dev session.`);
  return crypto.randomBytes(48).toString('base64url');
};

if (isProduction && !process.env.CORS_ORIGIN) {
  console.warn('[security] CORS_ORIGIN is not set — cross-origin requests will be rejected.');
}

export const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: process.env.PORT || 3001,
  DATABASE_URL: process.env.DATABASE_URL || '',
  JWT_ACCESS_SECRET: requireSecret('JWT_ACCESS_SECRET'),
  JWT_REFRESH_SECRET: requireSecret('JWT_REFRESH_SECRET'),
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:5173',
  // Enable only when running behind a reverse proxy so req.ip (and rate
  // limiting keyed on it) resolves to the real client, not the proxy.
  TRUST_PROXY: process.env.TRUST_PROXY === 'true' || process.env.TRUST_PROXY === '1',
  isProduction
};
