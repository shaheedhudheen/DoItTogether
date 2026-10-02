import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../../middleware/auth';
import { getActivePartnershipId, ok, fail } from '../../utils/helpers';
import { getIo } from '../../socket';

const prisma = new PrismaClient();

const updateTodoStatus = async (todoId: string) => {
  const todo = await prisma.todo.findUnique({
    where: { id: todoId },
    include: { completions: true }
  });
  if (!todo) return null;
  
  const compCount = todo.completions.length;
  let status = todo.status;
  
  if (todo.assignedToBoth) {
    if (compCount >= 2) status = 'completed';
    else if (compCount === 1) status = 'partial';
    else status = 'pending';
  } else {
    // Individual task: completed if the creator/assignee has completed it
    const creatorCompleted = todo.completions.some(c => c.userId === todo.createdById);
    if (creatorCompleted) status = 'completed';
    else status = 'pending';
  }

  // Handle expired
  if (status !== 'completed' && todo.dueDate && new Date(todo.dueDate) < new Date()) {
    status = 'expired';
  }

  if (todo.status !== status) {
    return await prisma.todo.update({
      where: { id: todoId },
      data: { status },
      include: {
        completions: true,
        createdBy: {
          select: { id: true, displayName: true, avatarUrl: true }
        }
      }
    });
  }
  return todo;
};

export const getTodos = async (req: AuthRequest, res: Response) => {
  try {
    const pId = await getActivePartnershipId(req.user.id);
    if (!pId) return res.status(400).json(fail('No active partnership'));

    const todos = await prisma.todo.findMany({
      where: { partnershipId: pId, status: { not: 'archived' } },
      include: {
        completions: true,
        createdBy: {
          select: { id: true, displayName: true, avatarUrl: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(ok({ todos }));
  } catch (error) {
    res.status(500).json(fail('Server error'));
  }
};

export const createTodo = async (req: AuthRequest, res: Response) => {
  try {
    const pId = await getActivePartnershipId(req.user.id);
    if (!pId) return res.status(400).json(fail('No active partnership'));

    const { title, description, assignedToBoth, dueDate } = req.body;
    const parsedDueDate = dueDate ? new Date(dueDate) : null;

    const todo = await prisma.todo.create({
      data: {
        title,
        description,
        assignedToBoth: assignedToBoth ?? false,
        dueDate: parsedDueDate,
        partnershipId: pId,
        createdById: req.user.id,
        status: 'pending'
      },
      include: {
        completions: true,
        createdBy: {
          select: { id: true, displayName: true, avatarUrl: true }
        }
      }
    });
    getIo().to(pId).emit('todo:created', todo);
    res.json(ok({ todo }));
  } catch (error) {
    res.status(500).json(fail('Server error'));
  }
};

export const updateTodo = async (req: AuthRequest, res: Response) => {
  try {
    const existing = await prisma.todo.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json(fail('Todo not found'));

    // If task is not assigned to both, only creator can edit it
    if (!existing.assignedToBoth && existing.createdById !== req.user.id) {
      return res.status(403).json(fail('Only the creator can edit this personal task'));
    }

    const { title, description, assignedToBoth, dueDate } = req.body;
    const dataToUpdate: any = {};
    if (title !== undefined) dataToUpdate.title = title;
    if (description !== undefined) dataToUpdate.description = description;
    if (assignedToBoth !== undefined) dataToUpdate.assignedToBoth = assignedToBoth;
    if (dueDate !== undefined) dataToUpdate.dueDate = dueDate ? new Date(dueDate) : null;

    let todo = await prisma.todo.update({
      where: { id: req.params.id },
      data: dataToUpdate,
      include: {
        completions: true,
        createdBy: {
          select: { id: true, displayName: true, avatarUrl: true }
        }
      }
    });
    const updated = await updateTodoStatus(todo.id);
    if (updated) todo = updated as any;

    getIo().to(todo.partnershipId).emit('todo:updated', todo);
    res.json(ok({ todo }));
  } catch (error) {
    res.status(500).json(fail('Server error'));
  }
};

export const deleteTodo = async (req: AuthRequest, res: Response) => {
  try {
    const existing = await prisma.todo.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json(fail('Todo not found'));

    // If task is not assigned to both, only creator can delete it
    if (!existing.assignedToBoth && existing.createdById !== req.user.id) {
      return res.status(403).json(fail('Only the creator can delete this personal task'));
    }

    const todo = await prisma.todo.delete({ where: { id: req.params.id } });
    getIo().to(todo.partnershipId).emit('todo:deleted', todo.id);
    res.json(ok(null));
  } catch (error) {
    res.status(500).json(fail('Server error'));
  }
};

export const completeTodo = async (req: AuthRequest, res: Response) => {
  try {
    const todo = await prisma.todo.findUnique({ where: { id: req.params.id } });
    if (!todo) return res.status(404).json(fail('Todo not found'));

    // Rule enforcement:
    // If NOT assigned to both, ONLY the creator can complete it!
    if (!todo.assignedToBoth && todo.createdById !== req.user.id) {
      return res.status(403).json(fail('This task is only for your partner. You can view it to remind them, but only they can complete it.'));
    }

    const existing = await prisma.todoCompletion.findUnique({
      where: {
        todoId_userId: {
          todoId: req.params.id,
          userId: req.user.id
        }
      }
    });

    if (!existing) {
      await prisma.todoCompletion.create({
        data: { todoId: req.params.id, userId: req.user.id }
      });
    }

    await updateTodoStatus(req.params.id);
    const updatedTodo = await prisma.todo.findUnique({
      where: { id: req.params.id },
      include: {
        completions: true,
        createdBy: {
          select: { id: true, displayName: true, avatarUrl: true }
        }
      }
    });

    if (updatedTodo) {
      getIo().to(updatedTodo.partnershipId).emit('todo:completed', { todoId: updatedTodo.id, userId: req.user.id });
    }
    res.json(ok({ todo: updatedTodo }));
  } catch (error) {
    res.status(500).json(fail('Server error'));
  }
};

export const uncompleteTodo = async (req: AuthRequest, res: Response) => {
  try {
    const todo = await prisma.todo.findUnique({ where: { id: req.params.id } });
    if (!todo) return res.status(404).json(fail('Todo not found'));

    // Rule enforcement:
    // If NOT assigned to both, ONLY the creator can uncomplete it!
    if (!todo.assignedToBoth && todo.createdById !== req.user.id) {
      return res.status(403).json(fail('This task is only for your partner. You can view it to remind them, but only they can modify it.'));
    }

    await prisma.todoCompletion.deleteMany({
      where: { todoId: req.params.id, userId: req.user.id }
    });
    await updateTodoStatus(req.params.id);
    const updatedTodo = await prisma.todo.findUnique({
      where: { id: req.params.id },
      include: {
        completions: true,
        createdBy: {
          select: { id: true, displayName: true, avatarUrl: true }
        }
      }
    });

    if (updatedTodo) {
      getIo().to(updatedTodo.partnershipId).emit('todo:uncompleted', { todoId: updatedTodo.id, userId: req.user.id });
    }
    res.json(ok({ todo: updatedTodo }));
  } catch (error) {
    res.status(500).json(fail('Server error'));
  }
};
