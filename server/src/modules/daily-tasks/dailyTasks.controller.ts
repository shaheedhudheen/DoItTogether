import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../../middleware/auth';
import { getActivePartnershipId, getTodayUTC, ok, fail } from '../../utils/helpers';
import { getIo } from '../../socket';

const prisma = new PrismaClient();

export const getDailyTasks = async (req: AuthRequest, res: Response) => {
  try {
    const pId = await getActivePartnershipId(req.user.id);
    if (!pId) return res.status(400).json(fail('No active partnership'));

    const tasks = await prisma.dailyTask.findMany({
      where: { partnershipId: pId, isActive: true },
      include: {
        completions: {
          where: { completionDate: getTodayUTC() }
        }
      },
      orderBy: { sortOrder: 'asc' }
    });
    res.json(ok({ tasks }));
  } catch (error) {
    res.status(500).json(fail('Server error'));
  }
};

export const createDailyTask = async (req: AuthRequest, res: Response) => {
  try {
    const pId = await getActivePartnershipId(req.user.id);
    if (!pId) return res.status(400).json(fail('No active partnership'));

    const count = await prisma.dailyTask.count({ where: { partnershipId: pId } });
    const { title, isShared, category } = req.body;
    const task = await prisma.dailyTask.create({
      data: {
        title,
        category: category || '',
        isShared: isShared ?? false,
        partnershipId: pId,
        createdById: req.user.id,
        sortOrder: count
      },
      include: {
        completions: {
          where: { completionDate: getTodayUTC() }
        }
      }
    });
    getIo().to(pId).emit('daily-task:created', task);
    res.json(ok({ task }));
  } catch (error) {
    res.status(500).json(fail('Server error'));
  }
};

export const updateDailyTask = async (req: AuthRequest, res: Response) => {
  try {
    const task = await prisma.dailyTask.update({
      where: { id: req.params.id },
      data: req.body,
      include: {
        completions: {
          where: { completionDate: getTodayUTC() }
        }
      }
    });
    getIo().to(task.partnershipId).emit('daily-task:updated', task);
    res.json(ok({ task }));
  } catch (error) {
    res.status(500).json(fail('Server error'));
  }
};

export const deleteDailyTask = async (req: AuthRequest, res: Response) => {
  try {
    const task = await prisma.dailyTask.findUnique({ where: { id: req.params.id } });
    if (!task) return res.status(404).json(fail('Task not found'));

    await prisma.dailyTask.delete({ where: { id: req.params.id } });
    getIo().to(task.partnershipId).emit('daily-task:deleted', task.id);
    res.json(ok(null));
  } catch (error) {
    res.status(500).json(fail('Server error'));
  }
};

export const completeDailyTask = async (req: AuthRequest, res: Response) => {
  try {
    const today = getTodayUTC();
    const existing = await prisma.dailyTaskCompletion.findUnique({
      where: {
        dailyTaskId_userId_completionDate: {
          dailyTaskId: req.params.id,
          userId: req.user.id,
          completionDate: today
        }
      }
    });

    if (!existing) {
      await prisma.dailyTaskCompletion.create({
        data: {
          dailyTaskId: req.params.id,
          userId: req.user.id,
          completionDate: today
        }
      });
    }

    const task = await prisma.dailyTask.findUnique({
      where: { id: req.params.id },
      include: {
        completions: {
          where: { completionDate: today }
        }
      }
    });

    if (task) {
      getIo().to(task.partnershipId).emit('daily-task:completed', { taskId: task.id, userId: req.user.id });
    }
    res.json(ok({ task }));
  } catch (error) {
    res.status(500).json(fail('Server error'));
  }
};

export const uncompleteDailyTask = async (req: AuthRequest, res: Response) => {
  try {
    const today = getTodayUTC();
    await prisma.dailyTaskCompletion.deleteMany({
      where: {
        dailyTaskId: req.params.id,
        userId: req.user.id,
        completionDate: today
      }
    });

    const task = await prisma.dailyTask.findUnique({
      where: { id: req.params.id },
      include: {
        completions: {
          where: { completionDate: today }
        }
      }
    });

    if (task) {
      getIo().to(task.partnershipId).emit('daily-task:uncompleted', { taskId: task.id, userId: req.user.id });
    }
    res.json(ok({ task }));
  } catch (error) {
    res.status(500).json(fail('Server error'));
  }
};
