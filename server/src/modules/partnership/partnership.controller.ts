import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../../middleware/auth';
import { generateInviteCode } from '../../utils/helpers';
import { getIo } from '../../socket';

const prisma = new PrismaClient();

// Only expose public profile fields for partners — never the full User row.
const publicUserSelect = {
  id: true,
  displayName: true,
  avatarUrl: true,
  prayerEnabled: true
} as const;

const partnershipInclude = {
  user1: { select: publicUserSelect },
  user2: { select: publicUserSelect }
} as const;

export const generateInvite = async (req: AuthRequest, res: Response) => {
  try {
    // Check if user already has a pending or active partnership
    const existing = await prisma.partnership.findFirst({
      where: {
        OR: [{ user1Id: req.user.id }, { user2Id: req.user.id }],
        status: { in: ['pending', 'active'] }
      },
      include: partnershipInclude
    });
    if (existing && existing.status === 'active') {
      return res.status(400).json({ success: false, message: 'You already have an active partnership' });
    }
    if (existing && existing.status === 'pending') {
      return res.json({ success: true, data: { code: existing.inviteCode, partnership: existing } });
    }

    const inviteCode = generateInviteCode();
    const created = await prisma.partnership.create({
      data: {
        user1Id: req.user.id,
        inviteCode,
        status: 'pending'
      },
      include: partnershipInclude
    });
    res.json({ success: true, data: { code: inviteCode, partnership: created } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const joinPartnership = async (req: AuthRequest, res: Response) => {
  try {
    const { inviteCode } = req.body;

    // The caller must not already be an active partner; a dangling pending
    // invite of their own is dissolved below if this join succeeds.
    const callerPartnership = await prisma.partnership.findFirst({
      where: {
        OR: [{ user1Id: req.user.id }, { user2Id: req.user.id }],
        status: { in: ['pending', 'active'] }
      }
    });
    if (callerPartnership?.status === 'active') {
      return res.status(400).json({ success: false, message: 'You already have an active partnership' });
    }

    const partnership = await prisma.partnership.findUnique({ where: { inviteCode } });

    if (!partnership || partnership.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Invalid or expired invite code' });
    }

    if (partnership.user1Id === req.user.id) {
      return res.status(400).json({ success: false, message: 'You cannot join your own partnership' });
    }

    // Atomic claim: only succeeds while the partnership is still pending and
    // unclaimed — prevents two concurrent joins both "winning" (last-write-wins
    // would silently put two different users into the same partnership).
    const claimed = await prisma.partnership.updateMany({
      where: { id: partnership.id, status: 'pending', user2Id: null },
      data: { user2Id: req.user.id, status: 'active' }
    });
    if (claimed.count === 0) {
      return res.status(400).json({ success: false, message: 'Invalid or expired invite code' });
    }

    // They chose to join someone else's partnership — drop their own pending
    // invite so only one partnership remains and data goes to the right one.
    if (callerPartnership?.status === 'pending') {
      await prisma.partnership.update({
        where: { id: callerPartnership.id },
        data: { status: 'dissolved' }
      });
    }

    const updated = await prisma.partnership.findUnique({
      where: { id: partnership.id },
      include: partnershipInclude
    });
    if (!updated) {
      return res.status(400).json({ success: false, message: 'Invalid or expired invite code' });
    }

    // Create default prayer tasks for the partnership
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    const partner = await prisma.user.findUnique({ where: { id: partnership.user1Id } });

    if (user?.prayerEnabled || partner?.prayerEnabled) {
      const existingCount = await prisma.prayerTask.count({ where: { partnershipId: updated.id } });
      if (existingCount === 0) {
        const prayerNames = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
        await prisma.prayerTask.createMany({
          data: prayerNames.map((name, index) => ({
            partnershipId: updated.id,
            name,
            sortOrder: index
          }))
        });
      }
    }

    // Notify the partner via socket
    getIo().to(updated.id).emit('partnership:joined', { partnership: updated });
    getIo().to(updated.user1Id).emit('partnership:joined', { partnership: updated });
    if (updated.user2Id) {
      getIo().to(updated.user2Id).emit('partnership:joined', { partnership: updated });
    }

    res.json({ success: true, data: { partnership: updated } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const getPartnership = async (req: AuthRequest, res: Response) => {
  try {
    const partnership = await prisma.partnership.findFirst({
      where: {
        OR: [{ user1Id: req.user.id }, { user2Id: req.user.id }],
        status: { in: ['pending', 'active'] }
      },
      include: partnershipInclude
    });
    res.json({ success: true, data: { partnership } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const dissolvePartnership = async (req: AuthRequest, res: Response) => {
  try {
    const partnership = await prisma.partnership.findFirst({
      where: {
        OR: [{ user1Id: req.user.id }, { user2Id: req.user.id }],
        status: 'active'
      }
    });

    if (!partnership) return res.status(404).json({ success: false, message: 'Partnership not found' });

    await prisma.partnership.update({
      where: { id: partnership.id },
      data: { status: 'dissolved' }
    });

    getIo().to(partnership.id).emit('partnership:dissolved');
    res.json({ success: true, data: null });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
