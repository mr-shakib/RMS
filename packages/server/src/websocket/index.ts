import { Server as HTTPServer } from 'http';
import { Server, Socket } from 'socket.io';
import { verifyToken, JwtPayload } from '../utils/jwt';
import { config } from '../config';

// Extend Socket type to include user data
interface AuthenticatedSocket extends Socket {
  user?: JwtPayload;
}

let io: Server | null = null;

/**
 * Initialize Socket.io server
 */
export const initializeWebSocket = (httpServer: HTTPServer): Server => {
  io = new Server(httpServer, {
    cors: {
      origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, file:// protocol, etc.)
        if (!origin || origin === 'null') return callback(null, true);

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
    },
  });

  // Authentication middleware
  io.use((socket: AuthenticatedSocket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');

      if (!token) {
        return next(new Error('Authentication required'));
      }

      const payload = verifyToken(token);
      socket.user = payload;
      next();
    } catch (error) {
      next(new Error('Invalid or expired token'));
    }
  });

  // Connection handler
  io.on('connection', (socket: AuthenticatedSocket) => {
    console.log(`✅ Client connected: ${socket.id} (User: ${socket.user?.username})`);

    // Send connection confirmation
    socket.emit('connected', { 
      socketId: socket.id, 
      timestamp: new Date().toISOString() 
    });

    // Handle room subscriptions
    socket.on('subscribe:orders', () => {
      socket.join('orders');
      console.log(`📦 ${socket.user?.username} subscribed to orders room`);
      socket.emit('subscribed', { room: 'orders' });
    });

    socket.on('subscribe:tables', () => {
      socket.join('tables');
      console.log(`🪑 ${socket.user?.username} subscribed to tables room`);
      socket.emit('subscribed', { room: 'tables' });
    });

    socket.on('subscribe:kds', () => {
      socket.join('kds');
      console.log(`👨‍🍳 ${socket.user?.username} subscribed to KDS room`);
      socket.emit('subscribed', { room: 'kds' });
    });

    socket.on('subscribe:table', (tableId: number) => {
      const roomName = `table:${tableId}`;
      socket.join(roomName);
      console.log(`🪑 ${socket.user?.username} subscribed to ${roomName}`);
      socket.emit('subscribed', { room: roomName });
    });

    // Handle unsubscribe events
    socket.on('unsubscribe:orders', () => {
      socket.leave('orders');
      console.log(`📦 ${socket.user?.username} unsubscribed from orders room`);
      socket.emit('unsubscribed', { room: 'orders' });
    });

    socket.on('unsubscribe:tables', () => {
      socket.leave('tables');
      console.log(`🪑 ${socket.user?.username} unsubscribed from tables room`);
      socket.emit('unsubscribed', { room: 'tables' });
    });

    socket.on('unsubscribe:kds', () => {
      socket.leave('kds');
      console.log(`👨‍🍳 ${socket.user?.username} unsubscribed from KDS room`);
      socket.emit('unsubscribed', { room: 'kds' });
    });

    socket.on('unsubscribe:table', (tableId: number) => {
      const roomName = `table:${tableId}`;
      socket.leave(roomName);
      console.log(`🪑 ${socket.user?.username} unsubscribed from ${roomName}`);
      socket.emit('unsubscribed', { room: roomName });
    });

    // Handle ping for connection health check
    socket.on('ping', () => {
      socket.emit('pong', { timestamp: new Date().toISOString() });
    });

    // Handle disconnection
    socket.on('disconnect', (reason) => {
      console.log(`❌ Client disconnected: ${socket.id} (User: ${socket.user?.username}) - Reason: ${reason}`);
    });

    // Handle errors
    socket.on('error', (error) => {
      console.error(`🔴 Socket error for ${socket.id}:`, error);
    });
  });

  console.log('🔌 WebSocket server initialized');
  return io;
};

/**
 * Get Socket.io server instance
 */
export const getIO = (): Server => {
  if (!io) {
    throw new Error('Socket.io not initialized. Call initializeWebSocket first.');
  }
  return io;
};

/**
 * Emit order created event
 */
export const emitOrderCreated = (order: any): void => {
  const io = getIO();
  io.to('orders').emit('order:created', order);
  io.to('kds').emit('order:created', order);
  io.to(`table:${order.tableId}`).emit('order:created', order);
  console.log(`📤 Emitted order:created for order ${order.id}`);
};

/**
 * Emit order updated event
 */
export const emitOrderUpdated = (order: any): void => {
  const io = getIO();
  io.to('orders').emit('order:updated', order);
  io.to('kds').emit('order:updated', order);
  io.to(`table:${order.tableId}`).emit('order:updated', order);
  console.log(`📤 Emitted order:updated for order ${order.id}`);
};

/**
 * Emit order cancelled event
 */
export const emitOrderCancelled = (orderId: string, tableId: number): void => {
  const io = getIO();
  io.to('orders').emit('order:cancelled', { orderId, tableId });
  io.to('kds').emit('order:cancelled', { orderId, tableId });
  io.to(`table:${tableId}`).emit('order:cancelled', { orderId, tableId });
  console.log(`📤 Emitted order:cancelled for order ${orderId}`);
};

/**
 * Emit table updated event
 */
export const emitTableUpdated = (table: any): void => {
  const io = getIO();
  io.to('tables').emit('table:updated', table);
  io.to(`table:${table.id}`).emit('table:updated', table);
  console.log(`📤 Emitted table:updated for table ${table.id}`);
};

/**
 * Emit menu updated event
 */
export const emitMenuUpdated = (menuItem: any): void => {
  const io = getIO();
  io.emit('menu:updated', menuItem); // Broadcast to all clients
  console.log(`📤 Emitted menu:updated for menu item ${menuItem.id}`);
};

/**
 * Emit payment completed event
 */
export const emitPaymentCompleted = (payment: any): void => {
  const io = getIO();
  io.to('orders').emit('payment:completed', payment);
  if (payment.order?.tableId) {
    io.to(`table:${payment.order.tableId}`).emit('payment:completed', payment);
  }
  console.log(`📤 Emitted payment:completed for payment ${payment.id}`);
};

/**
 * Emit printer error notification
 */
export const emitPrinterError = (error: { message: string; type: string; orderId?: string }): void => {
  const io = getIO();
  io.emit('printer:error', error); // Broadcast to all clients
  console.log(`📤 Emitted printer:error - ${error.message}`);
};
