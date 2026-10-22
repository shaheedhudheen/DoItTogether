import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const PRAYER_NAMES = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] as const;

/**
 * Returns the caller's active partnership, or their pending invite as a
 * fallback (the README's "zero-block dashboard" mode). An active partnership
 * always wins so data is never written into a stale pending room.
 */
export const findCurrentPartnership = async (userId: string) => {
  const membership = { OR: [{ user1Id: userId }, { user2Id: userId }] };
  const active = await prisma.partnership.findFirst({
    where: { ...membership, status: 'active' }
  });
  if (active) return active;
  return prisma.partnership.findFirst({
    where: { ...membership, status: 'pending' }
  });
};

/** Create any missing default prayer tasks for a room (idempotent). */
export const ensurePrayerTasks = async (partnershipId: string) => {
  const existing = await prisma.prayerTask.findMany({
    where: { partnershipId },
    select: { name: true }
  });
  const existingNames = new Set(existing.map((task) => task.name));
  const missing = PRAYER_NAMES.map((name, index) => ({ name, index })).filter(
    ({ name }) => !existingNames.has(name)
  );

  if (missing.length > 0) {
    await prisma.prayerTask.createMany({
      data: missing.map(({ name, index }) => ({
        partnershipId,
        name,
        sortOrder: index
      }))
    });
  }
};

/**
 * Prayer tracking is a room-level setting: changing it updates the room and
 * both members, so the joining partner automatically inherits the creator's
 * onboarding choice and both dashboards stay in sync.
 */
export const setPartnershipPrayerEnabled = async (
  partnershipId: string,
  prayerEnabled: boolean
) => {
  const partnership = await prisma.partnership.findUnique({
    where: { id: partnershipId }
  });
  if (!partnership) return null;

  const memberIds = [partnership.user1Id, partnership.user2Id].filter(
    (id): id is string => !!id
  );

  const [updated] = await prisma.$transaction([
    prisma.partnership.update({
      where: { id: partnershipId },
      data: { prayerEnabled }
    }),
    prisma.user.updateMany({
      where: { id: { in: memberIds } },
      data: { prayerEnabled }
    })
  ]);

  if (prayerEnabled) {
    await ensurePrayerTasks(partnershipId);
  }

  return updated;
};
