import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../../middleware/auth';
import { generateInviteCode } from '../../utils/helpers';
import {
  ensurePrayerTasks,
  findCurrentPartnership,
  setPartnershipPrayerEnabled
} from '../../utils/partnership';
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
      if (existing.prayerEnabled) {
        await ensurePrayerTasks(existing.id);
      }
      return res.json({ success: true, data: { code: existing.inviteCode, partnership: existing } });
    }

    const inviteCode = generateInviteCode();
    const created = await prisma.partnership.create({
      data: {
        user1Id: req.user.id,
        inviteCode,
        status: 'pending',
        // The room starts with the creator's current preference; the
        // creator can still change it on the onboarding prayer step.
        prayerEnabled: req.user.prayerEnabled
      },
      include: partnershipInclude
    });
    if (created.prayerEnabled) {
      await ensurePrayerTasks(created.id);
    }
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

    // The joining partner inherits the room creator's prayer choice — they
    // are never asked again during onboarding. This also covers rooms created
    // before the room-level setting existed (fallback to creator's preference).
    const creator = await prisma.user.findUnique({
      where: { id: partnership.user1Id },
      select: { prayerEnabled: true }
    });
    const inheritedPrayerSetting = partnership.prayerEnabled || creator?.prayerEnabled || false;
    await setPartnershipPrayerEnabled(partnership.id, inheritedPrayerSetting);

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
    const current = await findCurrentPartnership(req.user.id);
    const partnership = current
      ? await prisma.partnership.findUnique({
          where: { id: current.id },
          include: partnershipInclude
        })
      : null;
    res.json({ success: true, data: { partnership } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const updatePartnershipSettings = async (req: AuthRequest, res: Response) => {
  try {
    const { prayerEnabled } = req.body;
    const current = await findCurrentPartnership(req.user.id);
    if (!current) {
      return res.status(404).json({ success: false, message: 'Partnership not found' });
    }

    await setPartnershipPrayerEnabled(current.id, prayerEnabled);

    const partnership = await prisma.partnership.findUnique({
      where: { id: current.id },
      include: partnershipInclude
    });
    if (!partnership) {
      return res.status(404).json({ success: false, message: 'Partnership not found' });
    }

    // Keep both partners' dashboards in sync in real time.
    getIo().to(partnership.id).emit('partnership:settings', { partnership });
    getIo().to(partnership.user1Id).emit('partnership:settings', { partnership });
    if (partnership.user2Id) {
      getIo().to(partnership.user2Id).emit('partnership:settings', { partnership });
    }

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
