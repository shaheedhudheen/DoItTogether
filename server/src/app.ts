import express from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env';
import { errorHandler } from './middleware/errorHandler';
import { initSocket } from './socket';

import authRoutes from './modules/auth/auth.routes';
import partnershipRoutes from './modules/partnership/partnership.routes';
import commonTasksRoutes from './modules/common-tasks/commonTasks.routes';
import dailyTasksRoutes from './modules/daily-tasks/dailyTasks.routes';
import prayerRoutes from './modules/prayer/prayer.routes';
import todosRoutes from './modules/todos/todos.routes';
import calendarRoutes from './modules/calendar/calendar.routes';

const app = express();
const server = http.createServer(app);

app.use(cors({ origin: env.CORS_ORIGIN }));
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/partnership', partnershipRoutes);
app.use('/api/common-tasks', commonTasksRoutes);
app.use('/api/daily-tasks', dailyTasksRoutes);
app.use('/api/prayer', prayerRoutes);
app.use('/api/todos', todosRoutes);
app.use('/api/calendar', calendarRoutes);

app.use(errorHandler);

initSocket(server);

server.listen(env.PORT, () => {
  console.log(`Server running on port ${env.PORT}`);
});
