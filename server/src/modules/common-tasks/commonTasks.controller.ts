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

    const { title, description, emoji } = req.body;
    if (!title) return res.status(400).json(fail('Title is required'));

    const task = await prisma.commonTask.create({
      data: {
        title,
        description: description ?? null,
        emoji: emoji || '📋',
        partnershipId: pId,
        createdById: req.user.id,
        status: 'active'
      }
    });
    getIo().to(pId).emit('common-task:created', task);
    res.json(ok({ task }));
  } catch (error) {
    res.status(500).json(fail('Server error'));
  }
};

export const updateCommonTask = async (req: AuthRequest, res: Response) => {
  try {
    const pId = await getActivePartnershipId(req.user.id);
    if (!pId) return res.status(400).json(fail('No active partnership'));

    const existing = await prisma.commonTask.findUnique({ where: { id: req.params.id } });
    if (!existing || existing.partnershipId !== pId) {
      return res.status(404).json(fail('Task not found'));
    }

    // Whitelist updatable fields to prevent mass assignment
    const { title, description, emoji, status } = req.body;
    const data: { title?: string; description?: string | null; emoji?: string; status?: string; completedAt?: Date | null } = {};
    if (title !== undefined) data.title = title;
    if (description !== undefined) data.description = description;
    if (emoji !== undefined) data.emoji = emoji;
    if (status !== undefined) {
      data.status = status;
      if (status === 'completed' && existing.status !== 'completed') data.completedAt = new Date();
      if (status !== 'completed') data.completedAt = null;
    }

    const task = await prisma.commonTask.update({ where: { id: existing.id }, data });
    getIo().to(task.partnershipId).emit('common-task:updated', task);
    res.json(ok({ task }));
  } catch (error) {
    res.status(500).json(fail('Server error'));
  }
};

export const deleteCommonTask = async (req: AuthRequest, res: Response) => {
  try {
    const pId = await getActivePartnershipId(req.user.id);
    if (!pId) return res.status(400).json(fail('No active partnership'));

    const task = await prisma.commonTask.findUnique({ where: { id: req.params.id } });
    if (!task || task.partnershipId !== pId) {
      return res.status(404).json(fail('Task not found'));
    }

    await prisma.commonTask.delete({ where: { id: task.id } });
    getIo().to(task.partnershipId).emit('common-task:deleted', task.id);
    res.json(ok(null));
  } catch (error) {
    res.status(500).json(fail('Server error'));
  }
};

export const completeCommonTask = async (req: AuthRequest, res: Response) => {
  try {
    const pId = await getActivePartnershipId(req.user.id);
    if (!pId) return res.status(400).json(fail('No active partnership'));

    const existing = await prisma.commonTask.findUnique({ where: { id: req.params.id } });
    if (!existing || existing.partnershipId !== pId) {
      return res.status(404).json(fail('Task not found'));
    }

    const task = await prisma.commonTask.update({
      where: { id: existing.id },
      data: { status: 'completed', completedAt: new Date() }
    });
    getIo().to(task.partnershipId).emit('common-task:updated', task);
    res.json(ok({ task }));
  } catch (error) {
    res.status(500).json(fail('Server error'));
  }
};
