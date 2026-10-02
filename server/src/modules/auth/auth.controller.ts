import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { env } from '../../config/env';
import { AuthRequest } from '../../middleware/auth';

const prisma = new PrismaClient();

const generateTokens = (userId: string) => {
  const accessToken = jwt.sign({ id: userId }, env.JWT_ACCESS_SECRET, { expiresIn: '15m' });
  const refreshToken = jwt.sign({ id: userId }, env.JWT_REFRESH_SECRET, { expiresIn: '7d' });
  return { accessToken, refreshToken };
};

const sanitizeUser = (user: any, partnershipId: string | null = null) => {
  const { passwordHash, ...rest } = user;
  return { ...rest, partnershipId };
};

export const register = async (req: Request, res: Response) => {
  try {
    const { email, password, displayName } = req.body;
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(400).json({ success: false, message: 'Email already in use' });

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { email, passwordHash, displayName }
    });

    const tokens = generateTokens(user.id);
    res.json({ success: true, data: { user: sanitizeUser(user), tokens } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const tokens = generateTokens(user.id);
    const partnership = await prisma.partnership.findFirst({
      where: {
        OR: [{ user1Id: user.id }, { user2Id: user.id }],
        status: { in: ['pending', 'active'] }
      }
    });

    res.json({
      success: true,
      data: {
        user: sanitizeUser(user, partnership?.id ?? null),
        tokens,
        partnership
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const refresh = async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ success: false, message: 'Refresh token required' });

    const decoded = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET) as { id: string };
    const user = await prisma.user.findUnique({ where: { id: decoded.id } });
    if (!user) return res.status(401).json({ success: false, message: 'User not found' });

    const tokens = generateTokens(decoded.id);
    const partnership = await prisma.partnership.findFirst({
      where: {
        OR: [{ user1Id: decoded.id }, { user2Id: decoded.id }],
        status: { in: ['pending', 'active'] }
      }
    });

    res.json({
      success: true,
      data: { user: sanitizeUser(user, partnership?.id ?? null), tokens }
    });
  } catch (error) {
    res.status(401).json({ success: false, message: 'Invalid refresh token' });
  }
};

export const getMe = async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const partnership = await prisma.partnership.findFirst({
      where: {
        OR: [{ user1Id: user.id }, { user2Id: user.id }],
        status: { in: ['pending', 'active'] }
      }
    });

    res.json({ success: true, data: { user: sanitizeUser(user, partnership?.id ?? null) } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const updateProfile = async (req: AuthRequest, res: Response) => {
  try {
    const { displayName, avatarUrl, prayerEnabled } = req.body;
    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: { displayName, avatarUrl, prayerEnabled }
    });

    const partnership = await prisma.partnership.findFirst({
      where: {
        OR: [{ user1Id: user.id }, { user2Id: user.id }],
        status: { in: ['pending', 'active'] }
      }
    });

    if (prayerEnabled && partnership) {
      const count = await prisma.prayerTask.count({ where: { partnershipId: partnership.id } });
      if (count === 0) {
        const prayerNames = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
        await prisma.prayerTask.createMany({
          data: prayerNames.map((name, index) => ({
            partnershipId: partnership.id,
            name,
            sortOrder: index
          }))
        });
      }
    }

    res.json({ success: true, data: { user: sanitizeUser(user, partnership?.id ?? null) } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
