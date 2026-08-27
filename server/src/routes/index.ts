import { Express } from 'express';
import authRouter from './auth';
import tradesRouter from './trades';
import walletRouter from './wallet';
import profileRouter from './profile';
import webhooksRouter from './webhooks';
import adminRouter from './admin';
import eventsRouter from './events';

export function registerRoutes(app: Express): void {
  // API v1 routes
  app.use('/api/v1/auth', authRouter);
  app.use('/api/v1/trades', tradesRouter);
  app.use('/api/v1/wallet', walletRouter);
  app.use('/api/v1/profile', profileRouter);
  app.use('/api/v1/webhooks', webhooksRouter);
  app.use('/api/v1/admin', adminRouter);
  app.use('/api/v1/events', eventsRouter);

  // Legacy SSE path — kept for backwards compatibility; prefer /api/v1/events
  app.use('/api/events', eventsRouter);
}
