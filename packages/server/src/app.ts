import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { config } from './config';
import { errorHandler } from './middleware/errorHandler';
import healthRouter from './routes/health';
import authRouter from './routes/auth';
import ordersRouter from './routes/orders';
import tablesRouter from './routes/tables';
import menuRouter from './routes/menu';
import paymentsRouter from './routes/payments';
import reportsRouter from './routes/reports';
import settingsRouter from './routes/settings';
import pwaRouter from './routes/pwa';

export const createApp = (): Application => {
  const app = express();

  // Security middleware
  app.use(helmet());

  // CORS configuration
  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, Postman, etc.)
        if (!origin) return callback(null, true);

        // Check if origin is in allowed list or matches LAN pattern
        if (
          config.corsOrigins.includes(origin) ||
          /^http:\/\/192\.168\.\d{1,3}\.\d{1,3}:\d+$/.test(origin) ||
          /^http:\/\/10\.\d{1,3}\.\d{1,3}\.\d{1,3}:\d+$/.test(origin)
        ) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      },
      credentials: true,
    })
  );

  // Body parsing middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Compression middleware
  app.use(compression());

  // Health check route
  app.use('/api', healthRouter);

  // Authentication routes
  app.use('/api/auth', authRouter);

  // Order management routes
  app.use('/api/orders', ordersRouter);

  // Table management routes
  app.use('/api/tables', tablesRouter);

  // Menu management routes
  app.use('/api/menu', menuRouter);

  // Payment routes
  app.use('/api/payments', paymentsRouter);

  // Report routes
  app.use('/api/reports', reportsRouter);

  // Settings routes
  app.use('/api/settings', settingsRouter);

  // PWA public routes (no authentication required)
  app.use('/', pwaRouter);

  // API routes will be added here
  // etc.

  // Error handling middleware (must be last)
  app.use(errorHandler);

  return app;
};
