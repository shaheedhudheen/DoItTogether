import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../../middleware/auth';
import { generateInviteCode } from '../../utils/helpers';
import { getIo } from '../../socket';

const prisma = new PrismaClient();

export const generateInvite = async (req: AuthRequest, res: Response) => {
  try {
    // Check if user already has a pending or active partnership
    const existing = await prisma.partnership.findFirst({
      where: {
        OR: [{ user1Id: req.user.id }, { user2Id: req.user.id }],
        status: { in: ['pending', 'active'] }
      },
      include: { user1: true, user2: true }
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
      include: { user1: true, user2: true }
    });
    res.json({ success: true, data: { code: inviteCode, partnership: created } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const joinPartnership = async (req: AuthRequest, res: Response) => {
  try {
    const { inviteCode } = req.body;
    const partnership = await prisma.partnership.findUnique({ where: { inviteCode } });

    if (!partnership || partnership.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Invalid or expired invite code' });
    }

    if (partnership.user1Id === req.user.id) {
      return res.status(400).json({ success: false, message: 'You cannot join your own partnership' });
    }

    const updated = await prisma.partnership.update({
      where: { id: partnership.id },
      data: {
        user2Id: req.user.id,
        status: 'active'
      },
      include: { user1: true, user2: true }
    });

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
      include: { user1: true, user2: true }
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
