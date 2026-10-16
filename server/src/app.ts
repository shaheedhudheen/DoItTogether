import express from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env';
import { errorHandler } from './middleware/errorHandler';
import { rateLimit } from './middleware/rateLimit';
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

// Required for correct client IPs (and thus rate limiting) behind a reverse proxy.
if (env.TRUST_PROXY) {
  app.set('trust proxy', 1);
}

// credentials: true pairs with the httpOnly refresh-token cookie; origin is a
// single exact match, so only our own web app may send/read credentials.
app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json({ limit: '50kb' }));

// API responses are user-specific and realtime-synced; never let the browser
// HTTP cache serve stale data after socket-driven invalidation.
app.use('/api', (_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
});

// Generous global per-IP cap: bounds scraping/abuse of personal-data
// endpoints without affecting normal usage. Tighter per-route limits
// (login/register/refresh/join) apply on top of this.
const apiLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 2000 });
app.use('/api', apiLimiter);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/auth', authRoutes);
app.use('/api/partnership', partnershipRoutes);
app.use('/api/common-tasks', commonTasksRoutes);
app.use('/api/daily-tasks', dailyTasksRoutes);
app.use('/api/prayer', prayerRoutes);
app.use('/api/todos', todosRoutes);
app.use('/api/calendar', calendarRoutes);

// JSON 404 for unknown routes (instead of Express' default HTML page).
app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Not found' });
});

app.use(errorHandler);

initSocket(server);

server.listen(env.PORT, () => {
  console.log(`🚀 Server running on port ${env.PORT}`);
});

export { app, server };
