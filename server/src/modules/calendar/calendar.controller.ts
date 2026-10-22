import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../../middleware/auth';
import { getActivePartnershipId, ok, fail } from '../../utils/helpers';
import { CalendarDayData, CalendarSummary, PrayerName } from '@dit/shared';

const prisma = new PrismaClient();

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const isValidDateStr = (s: string): boolean => {
  if (!DATE_RE.test(s)) return false;
  const [y, m, d] = s.split('-').map(Number);
  if (m < 1 || m > 12 || d < 1 || d > 31) return false;
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
};

export const getCalendarDate = async (req: AuthRequest, res: Response) => {
  try {
    const pId = await getActivePartnershipId(req.user.id);
    if (!pId) return res.status(400).json(fail('No active partnership'));

    const dateStr = req.params.date; // Format: YYYY-MM-DD
    if (!isValidDateStr(dateStr)) {
      return res.status(400).json(fail('Invalid date (expected YYYY-MM-DD)'));
    }
    const [y, m, d] = dateStr.split('-').map(Number);
    const targetDate = new Date(Date.UTC(y, m - 1, d, 0, 0, 0));
    const nextDay = new Date(Date.UTC(y, m - 1, d + 1, 0, 0, 0));

    // 1. Daily tasks and completions on this date
    const dailyTasks = await prisma.dailyTask.findMany({
      where: { partnershipId: pId, isActive: true },
      include: {
        completions: {
          where: { completionDate: targetDate }
        }
      },
      orderBy: { sortOrder: 'asc' }
    });

    const mappedDailyTasks = dailyTasks.map(t => ({
      id: t.id,
      taskId: t.id,
      title: t.title,
      isShared: t.isShared,
      completedByMe: t.completions.some(c => c.userId === req.user.id),
      completedByPartner: t.completions.some(c => c.userId !== req.user.id)
    }));

    // 2. Common tasks added on this date
    const commonTasksAdded = await prisma.commonTask.findMany({
      where: {
        partnershipId: pId,
        createdAt: {
          gte: targetDate,
          lt: nextDay
        }
      },
      include: {
        createdBy: {
          select: { id: true, displayName: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // 3. Common tasks completed on this date
    const commonTasksCompleted = await prisma.commonTask.findMany({
      where: {
        partnershipId: pId,
        completedAt: {
          gte: targetDate,
          lt: nextDay
        }
      },
      include: {
        createdBy: {
          select: { id: true, displayName: true }
        }
      },
      orderBy: { completedAt: 'desc' }
    });

    // 4. Todos due or created on this date
    const todos = await prisma.todo.findMany({
      where: {
        partnershipId: pId,
        OR: [
          {
            dueDate: {
              gte: targetDate,
              lt: nextDay
            }
          },
          {
            createdAt: {
              gte: targetDate,
              lt: nextDay
            }
          }
        ]
      },
      include: {
        completions: true,
        createdBy: {
          select: { id: true, displayName: true }
        }
      }
    });

    // 5. Prayers on this date
    const prayerTasks = await prisma.prayerTask.findMany({
      where: { partnershipId: pId },
      include: {
        completions: {
          where: { completionDate: targetDate }
        }
      },
      orderBy: { sortOrder: 'asc' }
    });

    const mappedPrayers = prayerTasks.map(p => ({
      name: p.name as PrayerName,
      completedByMe: p.completions.some(c => c.userId === req.user.id),
      completedByPartner: p.completions.some(c => c.userId !== req.user.id)
    }));

    const result: CalendarDayData = {
      date: dateStr,
      dailyTasks: mappedDailyTasks,
      commonTasksAdded: commonTasksAdded as any,
      commonTasksCompleted: commonTasksCompleted as any,
      commonTasks: commonTasksCompleted as any,
      todos: todos as any,
      prayers: mappedPrayers
    };

    res.json(ok({ data: result }));
  } catch (error) {
    res.status(500).json(fail('Server error'));
  }
};

export const getCalendarRange = async (req: AuthRequest, res: Response) => {
  try {
    const pId = await getActivePartnershipId(req.user.id);
    if (!pId) return res.status(400).json(fail('No active partnership'));

    const fromStr = req.query.from as string;
    const toStr = req.query.to as string;

    if (!fromStr || !toStr) {
      return res.status(400).json(fail('from and to dates are required'));
    }
    if (!isValidDateStr(fromStr) || !isValidDateStr(toStr)) {
      return res.status(400).json(fail('Invalid date (expected YYYY-MM-DD)'));
    }

    const [fy, fm, fd] = fromStr.split('-').map(Number);
    const fromDate = new Date(Date.UTC(fy, fm - 1, fd, 0, 0, 0));

    const [ty, tm, td] = toStr.split('-').map(Number);
    const toDate = new Date(Date.UTC(ty, tm - 1, td + 1, 0, 0, 0));

    if (fromDate >= toDate) {
      return res.status(400).json(fail('from must be on or before to'));
    }
    // Bound the work a single request can trigger (the UI only needs a month).
    if (toDate.getTime() - fromDate.getTime() > 366 * 24 * 60 * 60 * 1000) {
      return res.status(400).json(fail('Date range is too large (max 366 days)'));
    }

    const [dailyTasks, prayerTasks, partnership, dailyCompletions, prayerCompletions] =
      await Promise.all([
        prisma.dailyTask.findMany({
          where: { partnershipId: pId, isActive: true },
          select: { id: true, isShared: true, createdById: true }
        }),
        prisma.prayerTask.findMany({
          where: { partnershipId: pId },
          select: { id: true }
        }),
        prisma.partnership.findUnique({
          where: { id: pId },
          select: { user1Id: true, user2Id: true }
        }),
        prisma.dailyTaskCompletion.findMany({
          where: {
            dailyTask: { partnershipId: pId },
            completionDate: {
              gte: fromDate,
              lt: toDate
            }
          }
        }),
        prisma.prayerCompletion.findMany({
          where: {
            prayerTask: { partnershipId: pId },
            completionDate: {
              gte: fromDate,
              lt: toDate
            }
          }
        })
      ]);

    const memberIds = [partnership?.user1Id, partnership?.user2Id].filter(
      (id): id is string => !!id
    );

    const commonTasks = await prisma.commonTask.findMany({
      where: {
        partnershipId: pId,
        OR: [
          {
            createdAt: {
              gte: fromDate,
              lt: toDate
            }
          },
          {
            completedAt: {
              gte: fromDate,
              lt: toDate
            }
          }
        ]
      }
    });

    const summary: Record<string, CalendarSummary> = {};

    const getSummaryEntry = (d: string) => {
      if (!summary[d]) {
        summary[d] = {
          date: d,
          totalDailyTasks: dailyTasks.length,
          completedDailyTasks: 0,
          totalPrayers: prayerTasks.length,
          completedPrayers: 0,
          totalCommonTasks: 0,
          completedCommonTasks: 0
        };
      }
      return summary[d];
    };

    // Group daily completions by date + task, then count only routines that
    // are fully done for that day: shared routines need both partners, and
    // personal routines count once checked by anyone. (Incrementing per
    // completion made summaries exceed 100% and "all done" dots unreachable.)
    const dailyByTaskDate = new Map<string, Set<string>>();
    dailyCompletions.forEach(c => {
      const d = c.completionDate.toISOString().split('T')[0];
      const key = `${d}|${c.dailyTaskId}`;
      const users = dailyByTaskDate.get(key) ?? new Set<string>();
      users.add(c.userId);
      dailyByTaskDate.set(key, users);
    });
    const dailyTaskById = new Map(dailyTasks.map(task => [task.id, task]));
    dailyByTaskDate.forEach((users, key) => {
      const [d, taskId] = key.split('|');
      const task = dailyTaskById.get(taskId);
      if (!task) return;

      const fullyDone = task.isShared
        ? memberIds.every(id => users.has(id))
        : users.size > 0;
      if (fullyDone) getSummaryEntry(d).completedDailyTasks++;
    });

    // Same rule for prayers: count a prayer once, only when everyone in the
    // room has completed it that day.
    const prayerByTaskDate = new Map<string, Set<string>>();
    prayerCompletions.forEach(c => {
      const d = c.completionDate.toISOString().split('T')[0];
      const key = `${d}|${c.prayerTaskId}`;
      const users = prayerByTaskDate.get(key) ?? new Set<string>();
      users.add(c.userId);
      prayerByTaskDate.set(key, users);
    });
    prayerByTaskDate.forEach((users, key) => {
      const d = key.split('|')[0];
      if (memberIds.length > 0 && memberIds.every(id => users.has(id))) {
        getSummaryEntry(d).completedPrayers++;
      }
    });

    // Group common tasks by created / completed dates
    commonTasks.forEach(t => {
      const createdDateStr = t.createdAt.toISOString().split('T')[0];
      getSummaryEntry(createdDateStr).totalCommonTasks++;

      if (t.completedAt) {
        const completedDateStr = t.completedAt.toISOString().split('T')[0];
        const completedEntry = getSummaryEntry(completedDateStr);
        completedEntry.completedCommonTasks++;
        // A task created earlier and completed on this date has no "created"
        // count here; make the completion visible (and green) on its own day.
        if (completedEntry.completedCommonTasks > completedEntry.totalCommonTasks) {
          completedEntry.totalCommonTasks = completedEntry.completedCommonTasks;
        }
      }
    });

    res.json(ok({ summary }));
  } catch (error) {
    res.status(500).json(fail('Server error'));
  }
};
