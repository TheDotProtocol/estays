import { Router, Request, Response } from 'express';
import { prisma } from '@estays/database';
import { sendSuccess } from '../utils/response';

export const healthRouter = Router();

healthRouter.get('/health', async (_req: Request, res: Response) => {
  let dbStatus = 'ok';
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    dbStatus = 'error';
  }

  sendSuccess(res, {
    status: dbStatus === 'ok' ? 'healthy' : 'degraded',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    services: {
      database: dbStatus,
      api: 'ok',
    },
  });
});
