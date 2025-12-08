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
  console.log('🔌 Initializing WebSocket server...');

  io = new Server(httpServer, {
    path: '/socket.io',
    cors: {
      origin: '*', // Allow all origins in development
      credentials: true,
      methods: ['GET', 'POST'],
    },
    allowEIO3: true, // Support older clients
  });

  console.log('✅ Socket.IO server created with path: /socket.io');

  // TEMPORARILY DISABLED - Testing if auth middleware is the issue
  /*
  io.use((socket: AuthenticatedSocket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');

      console.log('🔐 Socket auth attempt:', {
        hasAuthToken: !!socket.handshake.auth.token,
        hasHeaderToken: !!socket.handshake.headers.authorization,
        tokenPreview: token ? `${token.substring(0, 20)}...` : 'none',
        socketId: socket.id,
      });

      if (!token) {
        console.warn('⚠️  Socket connecting without token - allowing for debugging');
        socket.user = { userId: 'guest', username: 'guest', role: 'guest' } as JwtPayload;
        return next();
      }

      try {
        const payload = verifyToken(token);
        socket.user = payload;
        console.log(`✅ Socket authenticated: ${payload.username} (${payload.userId})`);
        next();
      } catch (verifyError: any) {
        console.error('❌ Token verification failed:', verifyError.message);
        console.warn('⚠️  Allowing connection anyway for debugging');
        socket.user = { userId: 'unverified', username: 'unverified', role: 'user' } as JwtPayload;
        next();
      }
    } catch (error: any) {
      console.error('❌ Socket auth middleware error:', error.message);
      socket.user = { userId: 'error', username: 'error', role: 'user' } as JwtPayload;
      next();
    }
  });
  */

  console.log('⚠️  Authentication middleware DISABLED for testing');

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
