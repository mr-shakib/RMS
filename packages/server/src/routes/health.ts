import { Router, Request, Response } from 'express';
import prisma from '../db/client';

const router = Router();

router.get('/health', async (req: Request, res: Response) => {
  try {
    // Check database connection
    await prisma.$queryRaw`SELECT 1`;
    
    const healthCheck = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        database: 'up',
        websocket: 'active', // Will be updated when WebSocket is implemented
      },
      metrics: {
        uptime: process.uptime(),
      },
    };

    res.status(200).json(healthCheck);
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      services: {
        database: 'down',
        websocket: 'unknown',
      },
      error: 'Database connection failed',
    });
  }
});

export default router;
