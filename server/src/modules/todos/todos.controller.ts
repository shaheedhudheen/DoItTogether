import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../../middleware/auth';
import { getActivePartnershipId, ok, fail } from '../../utils/helpers';
import { getIo } from '../../socket';

const prisma = new PrismaClient();

const todoInclude = {
  completions: true,
  createdBy: {
    select: { id: true, displayName: true, avatarUrl: true }
  }
} as const;

const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * "YYYY-MM-DD" is a whole calendar day, so it expires at the END of that day
 * (23:59:59.999 UTC), not at midnight at its start. Without this a task due
 * today was immediately marked expired.
 */
const parseDueDate = (value: string | null | undefined): Date | null => {
  if (!value) return null;
  if (DATE_ONLY_RE.test(value)) {
    const [y, m, d] = value.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, d, 23, 59, 59, 999));
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

/**
 * Loads a todo only if it belongs to the caller's active partnership.
 * Returns null when it does not exist or belongs to someone else.
 */
const getOwnedTodo = async (todoId: string, userId: string) => {
  const pId = await getActivePartnershipId(userId);
  if (!pId) return { pId: null, todo: null };

  const todo = await prisma.todo.findUnique({ where: { id: todoId } });
  if (!todo || todo.partnershipId !== pId) return { pId, todo: null };

  return { pId, todo };
};

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
      include: todoInclude
    });
  }
  return await prisma.todo.findUnique({
    where: { id: todoId },
    include: todoInclude
  });
};

export const getTodos = async (req: AuthRequest, res: Response) => {
  try {
    const pId = await getActivePartnershipId(req.user.id);
    if (!pId) return res.status(400).json(fail('No active partnership'));

    const rows = await prisma.todo.findMany({
      where: { partnershipId: pId, status: { not: 'archived' } },
      include: todoInclude,
      orderBy: { createdAt: 'desc' }
    });

    // Expiry is time-based; compute it on read too so a task that passed its
    // due date doesn't keep reporting "pending" until someone edits it.
    const now = Date.now();
    const todos = rows.map(todo =>
      todo.status !== 'completed' && todo.dueDate && todo.dueDate.getTime() < now
        ? { ...todo, status: 'expired' }
        : todo
    );
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
    if (!title) return res.status(400).json(fail('Title is required'));
    const parsedDueDate = parseDueDate(dueDate);

    const todo = await prisma.todo.create({
      data: {
        title,
        description: description ?? null,
        assignedToBoth: assignedToBoth ?? false,
        dueDate: parsedDueDate,
        partnershipId: pId,
        createdById: req.user.id,
        status: 'pending'
      },
      include: todoInclude
    });
    getIo().to(pId).emit('todo:created', todo);
    res.json(ok({ todo }));
  } catch (error) {
    res.status(500).json(fail('Server error'));
  }
};

export const updateTodo = async (req: AuthRequest, res: Response) => {
  try {
    const { todo: existing } = await getOwnedTodo(req.params.id, req.user.id);
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
    if (dueDate !== undefined) dataToUpdate.dueDate = parseDueDate(dueDate);

    let todo = await prisma.todo.update({
      where: { id: existing.id },
      data: dataToUpdate,
      include: todoInclude
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
    const { todo: existing } = await getOwnedTodo(req.params.id, req.user.id);
    if (!existing) return res.status(404).json(fail('Todo not found'));

    // If task is not assigned to both, only creator can delete it
    if (!existing.assignedToBoth && existing.createdById !== req.user.id) {
      return res.status(403).json(fail('Only the creator can delete this personal task'));
    }

    const todo = await prisma.todo.delete({ where: { id: existing.id } });
    getIo().to(todo.partnershipId).emit('todo:deleted', todo.id);
    res.json(ok(null));
  } catch (error) {
    res.status(500).json(fail('Server error'));
  }
};

export const completeTodo = async (req: AuthRequest, res: Response) => {
  try {
    const { todo } = await getOwnedTodo(req.params.id, req.user.id);
    if (!todo) return res.status(404).json(fail('Todo not found'));

    // Rule enforcement:
    // If NOT assigned to both, ONLY the creator can complete it!
    if (!todo.assignedToBoth && todo.createdById !== req.user.id) {
      return res.status(403).json(fail('This task is only for your partner. You can view it to remind them, but only they can complete it.'));
    }

    const existing = await prisma.todoCompletion.findUnique({
      where: {
        todoId_userId: {
          todoId: todo.id,
          userId: req.user.id
        }
      }
    });

    if (!existing) {
      await prisma.todoCompletion.create({
        data: { todoId: todo.id, userId: req.user.id }
      });
    }

    await updateTodoStatus(todo.id);
    const updatedTodo = await prisma.todo.findUnique({
      where: { id: todo.id },
      include: todoInclude
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
    const { todo } = await getOwnedTodo(req.params.id, req.user.id);
    if (!todo) return res.status(404).json(fail('Todo not found'));

    // Rule enforcement:
    // If NOT assigned to both, ONLY the creator can uncomplete it!
    if (!todo.assignedToBoth && todo.createdById !== req.user.id) {
      return res.status(403).json(fail('This task is only for your partner. You can view it to remind them, but only they can modify it.'));
    }

    await prisma.todoCompletion.deleteMany({
      where: { todoId: todo.id, userId: req.user.id }
    });
    await updateTodoStatus(todo.id);
    const updatedTodo = await prisma.todo.findUnique({
      where: { id: todo.id },
      include: todoInclude
    });

    if (updatedTodo) {
      getIo().to(updatedTodo.partnershipId).emit('todo:uncompleted', { todoId: updatedTodo.id, userId: req.user.id });
    }
    res.json(ok({ todo: updatedTodo }));
  } catch (error) {
    res.status(500).json(fail('Server error'));
  }
};
