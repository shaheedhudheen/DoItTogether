import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// 32-char alphabet without 0/O/1/I confusion. Codes are generated with
// crypto.randomInt → uniform, unpredictable (Math.random is NOT safe for
// secrets: invite codes are the only thing protecting a pending partnership).
const INVITE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export const generateInviteCode = (): string => {
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += INVITE_ALPHABET[crypto.randomInt(INVITE_ALPHABET.length)];
  }
  return code;
};

/** SHA-256 of a token — used to store refresh tokens server-side without keeping the raw value. */
export const sha256 = (value: string): string =>
  crypto.createHash('sha256').update(value).digest('hex');

/**
 * Active partnership takes precedence over a dangling pending invite so
 * data is never written into the wrong partnership.
 */
export const getActivePartnershipId = async (userId: string): Promise<string | null> => {
  const membership = {
    OR: [{ user1Id: userId }, { user2Id: userId }]
  };
  const active = await prisma.partnership.findFirst({
    where: { ...membership, status: 'active' }
  });
  if (active) return active.id;
  const pending = await prisma.partnership.findFirst({
    where: { ...membership, status: 'pending' }
  });
  return pending?.id || null;
};

export const getTodayUTC = (): Date => {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
};

/**
 * Wraps data in a standard { success, data } response envelope.
 */
export const ok = (data: any) => ({ success: true, data });

export const fail = (message: string) => ({ success: false, message });
