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

    const dailyTaskCount = await prisma.dailyTask.count({
      where: { partnershipId: pId, isActive: true }
    });

    const prayerCount = await prisma.prayerTask.count({
      where: { partnershipId: pId }
    });

    const dailyCompletions = await prisma.dailyTaskCompletion.findMany({
      where: {
        dailyTask: { partnershipId: pId },
        completionDate: {
          gte: fromDate,
          lt: toDate
        }
      }
    });

    const prayerCompletions = await prisma.prayerCompletion.findMany({
      where: {
        prayerTask: { partnershipId: pId },
        completionDate: {
          gte: fromDate,
          lt: toDate
        }
      }
    });

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
          totalDailyTasks: dailyTaskCount,
          completedDailyTasks: 0,
          totalPrayers: prayerCount,
          completedPrayers: 0,
          totalCommonTasks: 0,
          completedCommonTasks: 0
        };
      }
      return summary[d];
    };

    // Group daily completions by YYYY-MM-DD
    dailyCompletions.forEach(c => {
      const d = c.completionDate.toISOString().split('T')[0];
      getSummaryEntry(d).completedDailyTasks++;
    });

    // Group prayer completions by YYYY-MM-DD
    prayerCompletions.forEach(c => {
      const d = c.completionDate.toISOString().split('T')[0];
      getSummaryEntry(d).completedPrayers++;
    });

    // Group common tasks by created / completed dates
    commonTasks.forEach(t => {
      const createdDateStr = t.createdAt.toISOString().split('T')[0];
      getSummaryEntry(createdDateStr).totalCommonTasks++;

      if (t.completedAt) {
        const completedDateStr = t.completedAt.toISOString().split('T')[0];
        getSummaryEntry(completedDateStr).completedCommonTasks++;
      }
    });

    res.json(ok({ summary }));
  } catch (error) {
    res.status(500).json(fail('Server error'));
  }
};
