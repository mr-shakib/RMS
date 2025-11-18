import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import path from 'path';
import { config } from './config';
import { errorHandler } from './middleware/errorHandler';
import healthRouter from './routes/health';
import authRouter from './routes/auth';
import ordersRouter from './routes/orders';
import tablesRouter from './routes/tables';
import menuRouter from './routes/menu';
import categoriesRouter from './routes/categories';
import paymentsRouter from './routes/payments';
import reportsRouter from './routes/reports';
import settingsRouter from './routes/settings';
import printerRouter from './routes/printer';
import pwaRouter from './routes/pwa';
import setupRouter from './routes/setup';

export const createApp = (): Application => {
  const app = express();

  // Security middleware - Minimal helmet config for development
  app.use(
    helmet({
      contentSecurityPolicy: false, // Disable CSP to avoid HTTPS upgrade issues
      crossOriginOpenerPolicy: false, // Disable COOP
      crossOriginResourcePolicy: false, // Disable CORP
      originAgentCluster: false, // Disable Origin-Agent-Cluster
    })
  );

  // CORS configuration - Allow all origins in development
  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, Postman, etc.)
        if (!origin) return callback(null, true);

        // In development, allow all origins
        if (config.nodeEnv === 'development') {
          return callback(null, true);
        }

        // In production, check if origin is in allowed list or matches LAN pattern or localhost
        if (
          config.corsOrigins.includes(origin) ||
          /^http:\/\/localhost:\d+$/.test(origin) ||
          /^http:\/\/127\.0\.0\.1:\d+$/.test(origin) ||
          /^http:\/\/\[::1\]:\d+$/.test(origin) ||
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

  // Body parsing middleware (increased limit for base64 images)
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Compression middleware
  app.use(compression());

  // Serve PWA static files from public directory
  // When running with tsx, __dirname is src/, when built it's dist/
  const publicPath = path.join(__dirname, '../public');
  console.log('📁 Serving static files from:', publicPath);
  app.use(express.static(publicPath));

  // Health check route
  app.use('/api', healthRouter);

  // Authentication routes
  app.use('/api/auth', authRouter);

  // Order management routes
  app.use('/api/orders', ordersRouter);
  app.use('/api/order', ordersRouter); // Alias for PWA compatibility

  // Table management routes
  app.use('/api/tables', tablesRouter);

  // Menu management routes
  app.use('/api/menu', menuRouter);

  // Category management routes
  app.use('/api/categories', categoriesRouter);

  // Payment routes
  app.use('/api/payments', paymentsRouter);

  // Report routes
  app.use('/api/reports', reportsRouter);

  // Settings routes
  app.use('/api/settings', settingsRouter);

  // Printer routes
  app.use('/api/printer', printerRouter);

  // Setup routes (no authentication required)
  app.use('/api/setup', setupRouter);

  // Serve index.html for root route with query params preserved
  app.get('/', (req, res) => {
    const indexPath = path.join(__dirname, '../public/index.html');
    console.log(`📍 Serving PWA index.html for root route with query: ${req.url}`);
    res.sendFile(indexPath, (err) => {
      if (err) {
        console.error('❌ Failed to serve index.html:', err.message);
        res.status(500).send('PWA not found. Please build the PWA first.');
      }
    });
  });

  // PWA public routes (no authentication required)
  app.use('/', pwaRouter);

  // Serve PWA index.html for all non-API routes (SPA fallback)
  app.get('*', (req, res, next) => {
    // Skip if it's an API route
    if (req.path.startsWith('/api')) {
      return next();
    }
    
    // Serve index.html for PWA routes
    const indexPath = path.join(__dirname, '../public/index.html');
    res.sendFile(indexPath, (err) => {
      if (err) {
        // If index.html doesn't exist, continue to error handler
        console.error('❌ Failed to serve index.html:', err.message);
        next();
      }
    });
  });

  // Error handling middleware (must be last)
  app.use(errorHandler);

  return app;
};
