import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';
import { env } from '../../config/env';
import { AuthRequest } from '../../middleware/auth';
import { sha256 } from '../../utils/helpers';
import { findCurrentPartnership, setPartnershipPrayerEnabled } from '../../utils/partnership';
import { getIo } from '../../socket';
import {
  setRefreshCookie,
  clearRefreshCookie,
  getRefreshTokenFromRequest
} from '../../utils/cookies';

const prisma = new PrismaClient();

// Cost 12: materially slows offline brute-force of leaked hashes.
const BCRYPT_ROUNDS = 12;
// One refresh token per logged-in device; oldest are rotated out.
const MAX_REFRESH_TOKENS = 5;

// Lazily-computed dummy hash so login for a non-existent user performs the
// same bcrypt work as a real login (prevents user-enumeration via timing).
let dummyHashPromise: Promise<string> | null = null;
const getDummyHash = (): Promise<string> =>
  (dummyHashPromise ??= bcrypt.hash('timing-equalizer-not-a-real-password', BCRYPT_ROUNDS));

const generateTokens = (userId: string) => {
  const accessToken = jwt.sign({ id: userId }, env.JWT_ACCESS_SECRET, { expiresIn: '15m' });
  // jti makes every refresh token unique so rotation always invalidates the
  // previous one, even when issued within the same second.
  const refreshToken = jwt.sign({ id: userId, jti: crypto.randomUUID() }, env.JWT_REFRESH_SECRET, { expiresIn: '7d' });
  return { accessToken, refreshToken };
};

// Never expose passwordHash or refresh-token bookkeeping to clients.
const sanitizeUser = (user: any, partnershipId: string | null = null) => {
  const { passwordHash, refreshTokenHashes, ...rest } = user;
  return { ...rest, partnershipId };
};

export const register = async (req: Request, res: Response) => {
  try {
    const { password, displayName } = req.body;
    // Emails are case-insensitive; store/compare one canonical form.
    const email = String(req.body.email).trim().toLowerCase();
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(400).json({ success: false, message: 'Email already in use' });

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    const user = await prisma.user.create({
      data: { email, passwordHash, displayName }
    });

    // Issue tokens bound to the real user id, store their hash server-side
    // so the refresh token can only be used from the response cookie.
    const tokens = generateTokens(user.id);
    await prisma.user.update({
      where: { id: user.id },
      data: { refreshTokenHashes: [sha256(tokens.refreshToken)] }
    });
    setRefreshCookie(res, tokens.refreshToken);

    res.json({
      success: true,
      data: {
        user: sanitizeUser(user, null),
        tokens: { accessToken: tokens.accessToken }
      }
    });
  } catch (error: any) {
    // Concurrent register with the same email → unique-constraint violation.
    if (error?.code === 'P2002') {
      return res.status(400).json({ success: false, message: 'Email already in use' });
    }
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { password } = req.body;
    const email = String(req.body.email).trim().toLowerCase();
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      // Equalize timing with the real bcrypt.compare path.
      await bcrypt.compare(password, await getDummyHash());
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
    if (!(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const tokens = generateTokens(user.id);
    // Rotate-in: keep at most MAX_REFRESH_TOKENS valid refresh tokens per user.
    const hashes = [...(user.refreshTokenHashes ?? []), sha256(tokens.refreshToken)].slice(
      -MAX_REFRESH_TOKENS
    );
    await prisma.user.update({ where: { id: user.id }, data: { refreshTokenHashes: hashes } });
    setRefreshCookie(res, tokens.refreshToken);

    const partnership = await findCurrentPartnership(user.id);

    res.json({
      success: true,
      data: {
        user: sanitizeUser(user, partnership?.id ?? null),
        // Refresh token is ONLY in the httpOnly cookie — never in the body.
        tokens: { accessToken: tokens.accessToken },
        partnership
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const refresh = async (req: Request, res: Response) => {
  try {
    const refreshToken = getRefreshTokenFromRequest(req);
    if (!refreshToken) {
      return res.status(401).json({ success: false, message: 'Refresh token required' });
    }

    let decoded: { id: string };
    try {
      decoded = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET) as { id: string };
    } catch {
      return res.status(401).json({ success: false, message: 'Invalid refresh token' });
    }

    const user = await prisma.user.findUnique({ where: { id: decoded.id } });
    if (!user) return res.status(401).json({ success: false, message: 'Invalid refresh token' });

    // Server-side session check: the presented token must be one we issued
    // and haven't rotated out. Replayed/stolen/revoked tokens fail here.
    const presentedHash = sha256(refreshToken);
    const storedHashes = user.refreshTokenHashes ?? [];
    if (!storedHashes.includes(presentedHash)) {
      return res.status(401).json({ success: false, message: 'Invalid refresh token' });
    }

    // Rotation: invalidate the used token, issue a fresh pair.
    const tokens = generateTokens(decoded.id);
    const newHash = sha256(tokens.refreshToken);
    const hashes = storedHashes.map((h) => (h === presentedHash ? newHash : h));
    await prisma.user.update({ where: { id: user.id }, data: { refreshTokenHashes: hashes } });
    setRefreshCookie(res, tokens.refreshToken);

    const partnership = await findCurrentPartnership(decoded.id);

    res.json({
      success: true,
      data: {
        user: sanitizeUser(user, partnership?.id ?? null),
        tokens: { accessToken: tokens.accessToken }
      }
    });
  } catch (error) {
    res.status(401).json({ success: false, message: 'Invalid refresh token' });
  }
};

export const logout = async (req: Request, res: Response) => {
  try {
    const refreshToken = getRefreshTokenFromRequest(req);
    if (refreshToken) {
      try {
        const decoded = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET) as { id: string };
        const user = await prisma.user.findUnique({ where: { id: decoded.id } });
        if (user) {
          // Revoke just this device's refresh token.
          const hash = sha256(refreshToken);
          const hashes = (user.refreshTokenHashes ?? []).filter((h) => h !== hash);
          if (hashes.length !== (user.refreshTokenHashes ?? []).length) {
            await prisma.user.update({ where: { id: user.id }, data: { refreshTokenHashes: hashes } });
          }
        }
      } catch {
        // Invalid/expired token — nothing to revoke.
      }
    }
    clearRefreshCookie(res);
    res.json({ success: true, data: null });
  } catch (error) {
    clearRefreshCookie(res);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const getMe = async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const partnership = await findCurrentPartnership(user.id);

    res.json({ success: true, data: { user: sanitizeUser(user, partnership?.id ?? null) } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const updateProfile = async (req: AuthRequest, res: Response) => {
  try {
    const { displayName, avatarUrl, prayerEnabled } = req.body;
    let user = await prisma.user.update({
      where: { id: req.user.id },
      data: { displayName, avatarUrl }
    });

    const partnership = await findCurrentPartnership(user.id);

    if (prayerEnabled !== undefined) {
      if (partnership) {
        // Prayer tracking is a room-level setting, so a legacy client toggling
        // it here still updates both partners and creates the prayer tasks.
        await setPartnershipPrayerEnabled(partnership.id, prayerEnabled);
        const refreshed = await prisma.user.findUnique({ where: { id: user.id } });
        if (refreshed) user = refreshed;

        const settingsPayload = { partnership: { ...partnership, prayerEnabled } };
        getIo().to(partnership.id).emit('partnership:settings', settingsPayload);
        getIo().to(partnership.user1Id).emit('partnership:settings', settingsPayload);
        if (partnership.user2Id) {
          getIo().to(partnership.user2Id).emit('partnership:settings', settingsPayload);
        }
      } else {
        user = await prisma.user.update({
          where: { id: user.id },
          data: { prayerEnabled }
        });
      }
    }

    res.json({ success: true, data: { user: sanitizeUser(user, partnership?.id ?? null) } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
