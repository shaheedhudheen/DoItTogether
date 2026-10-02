import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../../middleware/auth';
import { getActivePartnershipId, ok, fail } from '../../utils/helpers';
import { getIo } from '../../socket';

const prisma = new PrismaClient();

export const getCommonTasks = async (req: AuthRequest, res: Response) => {
  try {
    const pId = await getActivePartnershipId(req.user.id);
    if (!pId) return res.status(400).json(fail('No active partnership'));

    const tasks = await prisma.commonTask.findMany({
      where: { partnershipId: pId, status: 'active' },
      orderBy: { createdAt: 'desc' }
    });
    res.json(ok({ tasks }));
  } catch (error) {
    res.status(500).json(fail('Server error'));
  }
};

export const createCommonTask = async (req: AuthRequest, res: Response) => {
  try {
    const pId = await getActivePartnershipId(req.user.id);
    if (!pId) return res.status(400).json(fail('No active partnership'));

    const task = await prisma.commonTask.create({
      data: { ...req.body, partnershipId: pId, createdById: req.user.id, status: 'active' }
    });
    getIo().to(pId).emit('common-task:created', task);
    res.json(ok({ task }));
  } catch (error) {
    res.status(500).json(fail('Server error'));
  }
};

export const updateCommonTask = async (req: AuthRequest, res: Response) => {
  try {
    const task = await prisma.commonTask.update({
      where: { id: req.params.id },
      data: req.body
    });
    getIo().to(task.partnershipId).emit('common-task:updated', task);
    res.json(ok({ task }));
  } catch (error) {
    res.status(500).json(fail('Server error'));
  }
};

export const deleteCommonTask = async (req: AuthRequest, res: Response) => {
  try {
    const task = await prisma.commonTask.delete({ where: { id: req.params.id } });
    getIo().to(task.partnershipId).emit('common-task:deleted', task.id);
    res.json(ok(null));
  } catch (error) {
    res.status(500).json(fail('Server error'));
  }
};

export const completeCommonTask = async (req: AuthRequest, res: Response) => {
  try {
    const task = await prisma.commonTask.update({
      where: { id: req.params.id },
      data: { status: 'completed', completedAt: new Date() }
    });
    getIo().to(task.partnershipId).emit('common-task:updated', task);
    res.json(ok({ task }));
  } catch (error) {
    res.status(500).json(fail('Server error'));
  }
};
