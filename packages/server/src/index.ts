import dotenv from 'dotenv';
import http from 'http';
import { createApp } from './app';
import { config } from './config';
import { initializeWebSocket } from './websocket';
import { printerService, initializationService } from './services';
import multiPrinterService from './services/multiPrinterService'; // Changed to default import

dotenv.config();

const app = createApp();

// Create HTTP server
const httpServer = http.createServer(app);

// Initialize WebSocket server
initializeWebSocket(httpServer);

// Start server
const server = httpServer.listen(config.port, async () => {
  console.log(`🚀 Server running on http://localhost:${config.port}`);
  console.log(`📊 Health check: http://localhost:${config.port}/api/health`);
  console.log(`🌍 Environment: ${config.nodeEnv}`);

  // Initialize database schema and seed data
  try {
    console.log('🔄 Initializing database...');
    await initializationService.initializeDatabase();
    console.log('✅ Database ready');
  } catch (error) {
    console.error('⚠️  Failed to initialize database:', error);
  }

  // Initialize printer connection from saved configuration
  try {
    const initialized = await printerService.initialize();
    if (initialized) {
      console.log('🖨️  Printer initialized successfully');
    } else {
      console.log('ℹ️  No printer configured');
    }
  } catch (error) {
    console.error('⚠️  Failed to initialize printer:', error);
    console.log('ℹ️  Server will continue without printer support');
  }

  // Initialize multi-printer service
  try {
    await multiPrinterService.initializeAllPrinters();
    console.log('🖨️  Multi-printer service initialized');
  } catch (error) {
    console.error('⚠️  Failed to initialize multi-printer service:', error);
  }
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM signal received: closing HTTP server');
  
  // Disconnect printer
  try {
    await printerService.disconnect();
    await multiPrinterService.disconnectAll();
  } catch (error) {
    console.error('Error disconnecting printers:', error);
  }
  
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  console.log('SIGINT signal received: closing HTTP server');
  
  // Disconnect printer
  try {
    await printerService.disconnect();
    await multiPrinterService.disconnectAll();
  } catch (error) {
    console.error('Error disconnecting printers:', error);
  }
  
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

export { app, httpServer };
