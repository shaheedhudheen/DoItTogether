import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export const generateInviteCode = (): string => {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
};

export const getActivePartnershipId = async (userId: string): Promise<string | null> => {
  const p = await prisma.partnership.findFirst({
    where: {
      OR: [{ user1Id: userId }, { user2Id: userId }],
      status: { in: ['active', 'pending'] }
    }
  });
  return p?.id || null;
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
