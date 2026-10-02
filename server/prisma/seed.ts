import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const getTodayUTC = (): Date => {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
};

async function main() {
  console.log('Seeding DIT database...');

  // Clean existing data
  await prisma.todoCompletion.deleteMany();
  await prisma.todo.deleteMany();
  await prisma.prayerCompletion.deleteMany();
  await prisma.prayerTask.deleteMany();
  await prisma.dailyTaskCompletion.deleteMany();
  await prisma.dailyTask.deleteMany();
  await prisma.commonTask.deleteMany();
  await prisma.partnership.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash('password123', 10);
  const today = getTodayUTC();

  // Create Users
  const user1 = await prisma.user.create({
    data: {
      email: 'user1@example.com',
      passwordHash,
      displayName: 'Ali',
      prayerEnabled: true,
    }
  });

  const user2 = await prisma.user.create({
    data: {
      email: 'user2@example.com',
      passwordHash,
      displayName: 'Sara',
      prayerEnabled: true,
    }
  });

  console.log(`Created users: ${user1.displayName} (${user1.email}) & ${user2.displayName} (${user2.email})`);

  // Create Partnership
  const partnership = await prisma.partnership.create({
    data: {
      user1Id: user1.id,
      user2Id: user2.id,
      inviteCode: 'DIT123',
      status: 'active'
    }
  });

  console.log(`Created partnership: ${partnership.id}`);

  // Create Common Tasks (Horizontal slidable cards)
  const commonTasksData = [
    { title: 'Watch a movie together', description: 'Pick a movie from the weekend watchlist', emoji: '🎬' },
    { title: 'Cook dinner together', description: 'Homemade pasta night with garlic bread', emoji: '🍳' },
    { title: 'Plan our next vacation', description: 'Find flights & Airbnb for next month', emoji: '✈️' },
    { title: 'Deep clean the apartment', description: 'Organize closet and clean bathroom', emoji: '🧹' },
    { title: 'Try that new matcha cafe', description: 'Visit the newly opened cafe downtown', emoji: '🍵' },
  ];

  for (const item of commonTasksData) {
    await prisma.commonTask.create({
      data: {
        partnershipId: partnership.id,
        createdById: user1.id,
        title: item.title,
        description: item.description,
        emoji: item.emoji,
        status: 'active'
      }
    });
  }

  // Create Daily Tasks (Middle section)
  const dailyTasks = [
    { title: 'Eat healthy breakfast', category: 'meal', isShared: true, sortOrder: 0 },
    { title: '30-minute workout', category: 'exercise', isShared: true, sortOrder: 1 },
    { title: 'Healthy dinner together', category: 'meal', isShared: true, sortOrder: 2 },
    { title: 'Read 20 pages / hobby time', category: 'hobby', isShared: false, sortOrder: 3 },
  ];

  for (const dt of dailyTasks) {
    const createdDaily = await prisma.dailyTask.create({
      data: {
        partnershipId: partnership.id,
        createdById: user1.id,
        title: dt.title,
        category: dt.category,
        isShared: dt.isShared,
        sortOrder: dt.sortOrder,
        isActive: true
      }
    });

    // Add some completions for today
    if (dt.category === 'meal' && dt.sortOrder === 0) {
      // Both completed breakfast
      await prisma.dailyTaskCompletion.create({
        data: { dailyTaskId: createdDaily.id, userId: user1.id, completionDate: today }
      });
      await prisma.dailyTaskCompletion.create({
        data: { dailyTaskId: createdDaily.id, userId: user2.id, completionDate: today }
      });
    } else if (dt.category === 'exercise') {
      // User 1 completed workout
      await prisma.dailyTaskCompletion.create({
        data: { dailyTaskId: createdDaily.id, userId: user1.id, completionDate: today }
      });
    }
  }

  // Create Prayer Tasks (5 Daily Prayers)
  const prayerNames = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
  for (let i = 0; i < prayerNames.length; i++) {
    const pName = prayerNames[i];
    const prayer = await prisma.prayerTask.create({
      data: {
        partnershipId: partnership.id,
        name: pName,
        sortOrder: i
      }
    });

    // Sample completions for Fajr & Dhuhr
    if (pName === 'fajr') {
      await prisma.prayerCompletion.create({
        data: { prayerTaskId: prayer.id, userId: user1.id, completionDate: today }
      });
      await prisma.prayerCompletion.create({
        data: { prayerTaskId: prayer.id, userId: user2.id, completionDate: today }
      });
    } else if (pName === 'dhuhr') {
      await prisma.prayerCompletion.create({
        data: { prayerTaskId: prayer.id, userId: user1.id, completionDate: today }
      });
    }
  }

  // Create Todos (Color-coded: Green = both done, Yellow = 1 done, Red = none done)
  // 1. Green (Completed by both)
  const todoBothDone = await prisma.todo.create({
    data: {
      partnershipId: partnership.id,
      createdById: user1.id,
      title: 'Buy fresh groceries & vegetables',
      description: 'Tomatoes, pasta, olive oil, and fruit',
      assignedToBoth: true,
      dueDate: new Date(Date.now() + 86400000), // tomorrow
      status: 'completed'
    }
  });
  await prisma.todoCompletion.create({ data: { todoId: todoBothDone.id, userId: user1.id } });
  await prisma.todoCompletion.create({ data: { todoId: todoBothDone.id, userId: user2.id } });

  // 2. Yellow (Partial - completed by 1 of 2)
  const todoPartial = await prisma.todo.create({
    data: {
      partnershipId: partnership.id,
      createdById: user2.id,
      title: 'Schedule dentist checkup appointment',
      description: 'Book for next week before the holiday',
      assignedToBoth: true,
      dueDate: new Date(Date.now() + 3 * 86400000),
      status: 'partial'
    }
  });
  await prisma.todoCompletion.create({ data: { todoId: todoPartial.id, userId: user1.id } });

  // 3. Red (Pending - not completed by anyone)
  await prisma.todo.create({
    data: {
      partnershipId: partnership.id,
      createdById: user1.id,
      title: 'Fix the leaky kitchen sink faucet',
      description: 'Check washers and seal underneath',
      assignedToBoth: true,
      dueDate: new Date(Date.now() + 5 * 86400000),
      status: 'pending'
    }
  });

  // 4. Red (Individual task for Sara)
  await prisma.todo.create({
    data: {
      partnershipId: partnership.id,
      createdById: user2.id,
      title: 'Pick up dry cleaning on the way home',
      assignedToBoth: false,
      dueDate: new Date(Date.now() + 86400000),
      status: 'pending'
    }
  });

  console.log('Seeding completed successfully! 🎉');
  console.log('Login credentials:');
  console.log('User 1: user1@example.com / password123');
  console.log('User 2: user2@example.com / password123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
