import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../../middleware/auth';
import { getActivePartnershipId, getTodayUTC, ok, fail } from '../../utils/helpers';
import { getIo } from '../../socket';

const prisma = new PrismaClient();

const PRAYER_NAMES = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] as const;

const isValidPrayerName = (name: string): name is typeof PRAYER_NAMES[number] =>
  (PRAYER_NAMES as readonly string[]).includes(name);


const getOrCreatePrayerTask = async (partnershipId: string, name: string, sortOrder: number) => {
  let task = await prisma.prayerTask.findFirst({ where: { partnershipId, name } });
  if (!task) {
    task = await prisma.prayerTask.create({ data: { partnershipId, name, sortOrder } });
  }
  return task;
};

export const getTodayPrayers = async (req: AuthRequest, res: Response) => {
  try {
    const pId = await getActivePartnershipId(req.user.id);
    if (!pId) return res.status(400).json(fail('No active partnership'));

    const prayers = await prisma.prayerTask.findMany({
      where: { partnershipId: pId },
      include: {
        completions: {
          where: { completionDate: getTodayUTC() }
        }
      },
      orderBy: { sortOrder: 'asc' }
    });
    res.json(ok({ prayers }));
  } catch (error) {
    res.status(500).json(fail('Server error'));
  }
};

export const completePrayer = async (req: AuthRequest, res: Response) => {
  try {
    const pId = await getActivePartnershipId(req.user.id);
    if (!pId) return res.status(400).json(fail('No active partnership'));

    if (!isValidPrayerName(req.params.name)) {
      return res.status(400).json(fail('Invalid prayer name'));
    }

    const prayerNames = PRAYER_NAMES;
    const sortOrder = prayerNames.indexOf(req.params.name);

    const task = await getOrCreatePrayerTask(pId, req.params.name, sortOrder >= 0 ? sortOrder : 0);
    const today = getTodayUTC();

    const existing = await prisma.prayerCompletion.findUnique({
      where: {
        prayerTaskId_userId_completionDate: {
          prayerTaskId: task.id,
          userId: req.user.id,
          completionDate: today
        }
      }
    });

    if (!existing) {
      await prisma.prayerCompletion.create({
        data: {
          prayerTaskId: task.id,
          userId: req.user.id,
          completionDate: today
        }
      });
    }

    const updatedTask = await prisma.prayerTask.findUnique({
      where: { id: task.id },
      include: {
        completions: {
          where: { completionDate: today }
        }
      }
    });

    getIo().to(pId).emit('prayer:completed', { prayerName: req.params.name, userId: req.user.id });
    res.json(ok({ prayer: updatedTask }));
  } catch (error) {
    res.status(500).json(fail('Server error'));
  }
};

export const uncompletePrayer = async (req: AuthRequest, res: Response) => {
  try {
    const pId = await getActivePartnershipId(req.user.id);
    if (!pId) return res.status(400).json(fail('No active partnership'));

    if (!isValidPrayerName(req.params.name)) {
      return res.status(400).json(fail('Invalid prayer name'));
    }

    const task = await prisma.prayerTask.findFirst({ where: { partnershipId: pId, name: req.params.name } });
    if (!task) return res.status(404).json(fail('Prayer not found'));

    const today = getTodayUTC();
    await prisma.prayerCompletion.deleteMany({
      where: {
        prayerTaskId: task.id,
        userId: req.user.id,
        completionDate: today
      }
    });

    const updatedTask = await prisma.prayerTask.findUnique({
      where: { id: task.id },
      include: {
        completions: {
          where: { completionDate: today }
        }
      }
    });

    getIo().to(pId).emit('prayer:uncompleted', { prayerName: req.params.name, userId: req.user.id });
    res.json(ok({ prayer: updatedTask }));
  } catch (error) {
    res.status(500).json(fail('Server error'));
  }
};
