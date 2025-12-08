import { io, Socket } from 'socket.io-client';
import type { ServerEvents, ClientEvents } from '@rms/shared';

// Socket.IO connects to the base server URL, NOT the /api endpoint
// If NEXT_PUBLIC_API_URL ends with /api, strip it for socket connection
const getSocketURL = (): string => {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
  // Remove /api suffix if present
  return apiUrl.replace(/\/api$/, '');
};

const SOCKET_URL = getSocketURL();

type ConnectionStatusCallback = (status: 'connected' | 'disconnected' | 'reconnecting' | 'error') => void;

class SocketClient {
  private socket: Socket<ServerEvents, ClientEvents> | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private statusListeners: Set<ConnectionStatusCallback> = new Set();
  private manualDisconnect = false;

  connect(): Socket<ServerEvents, ClientEvents> {
    if (this.socket?.connected) {
      return this.socket;
    }

    this.manualDisconnect = false;
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

    console.log('🔌 Connecting to Socket.IO server:', SOCKET_URL);
    console.log('🔑 Token present:', !!token);

    // Calculate exponential backoff delay
    const getReconnectionDelay = (attempt: number): number => {
      const baseDelay = 1000;
      const maxDelay = 30000;
      const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
      // Add jitter to prevent thundering herd
      return delay + Math.random() * 1000;
    };

    this.socket = io(SOCKET_URL, {
      path: '/socket.io',
      auth: {
        token,
      },
      reconnection: false, // We'll handle reconnection manually for better control
      timeout: 10000,
      transports: ['websocket', 'polling'],
      withCredentials: true,
      autoConnect: true,
    });

    this.socket.on('connect', () => {
      console.log('✅ Socket connected');
      this.reconnectAttempts = 0;
      this.notifyStatusListeners('connected');

      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
      }
    });

    this.socket.on('disconnect', (reason) => {
      console.log('❌ Socket disconnected:', reason);
      this.notifyStatusListeners('disconnected');

      // Auto-reconnect unless manually disconnected
      if (!this.manualDisconnect && reason !== 'io client disconnect') {
        this.scheduleReconnect();
      }
    });

    this.socket.on('connect_error', (error) => {
      console.error('🔴 Socket connection error:', error.message);
      console.error('📍 Connection URL:', SOCKET_URL);
      console.error('🔍 Error details:', error);
      
      // Check if it's an authentication error
      if (error.message.includes('Authentication') || error.message.includes('token')) {
        console.error('🔴 Socket authentication error - Invalid or expired token');
        console.warn('💡 Tip: Check if you are logged in and have a valid token');
        this.notifyStatusListeners('error');

        // Don't retry on auth errors - user needs to re-login
        if (this.reconnectTimer) {
          clearTimeout(this.reconnectTimer);
          this.reconnectTimer = null;
        }
        this.reconnectAttempts = this.maxReconnectAttempts; // Stop retrying
      } else if (error.message.includes('Invalid namespace')) {
        console.error('🔴 Socket namespace error - Server might not be running or URL is incorrect');
        console.warn('💡 Expected URL format: http://localhost:5000 (without /api)');
        console.warn('💡 Current URL:', SOCKET_URL);
        this.notifyStatusListeners('error');
        
        // Retry on namespace errors (might be temporary server issue)
        this.scheduleReconnect();
      } else {
        console.error('🔴 Socket network error:', error.message);
        this.notifyStatusListeners('error');
        this.scheduleReconnect();
      }
    });

    return this.socket;
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('❌ Max reconnection attempts reached');
      this.notifyStatusListeners('error');
      return;
    }

    if (this.reconnectTimer) {
      return; // Already scheduled
    }

    this.reconnectAttempts++;
    const delay = this.getReconnectionDelay(this.reconnectAttempts);

    console.log(`🔄 Scheduling reconnection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${Math.round(delay / 1000)}s`);
    this.notifyStatusListeners('reconnecting');

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (!this.socket?.connected && !this.manualDisconnect) {
        console.log(`🔄 Attempting reconnection (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
        this.socket?.connect();
      }
    }, delay);
  }

  private getReconnectionDelay(attempt: number): number {
    const baseDelay = 1000;
    const maxDelay = 30000;
    const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
    return delay + Math.random() * 1000;
  }

  disconnect(): void {
    this.manualDisconnect = true;

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }

    this.reconnectAttempts = 0;
    this.notifyStatusListeners('disconnected');
  }

  getSocket(): Socket<ServerEvents, ClientEvents> | null {
    return this.socket;
  }

  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  // Subscribe to connection status changes
  onStatusChange(callback: ConnectionStatusCallback): () => void {
    this.statusListeners.add(callback);
    return () => {
      this.statusListeners.delete(callback);
    };
  }

  private notifyStatusListeners(status: 'connected' | 'disconnected' | 'reconnecting' | 'error'): void {
    this.statusListeners.forEach((callback) => callback(status));
  }

  // Subscribe to a room
  subscribe(room: string): void {
    if (this.socket?.connected) {
      this.socket.emit(`subscribe:${room}` as any);
    }
  }

  // Unsubscribe from a room
  unsubscribe(room: string): void {
    if (this.socket?.connected) {
      this.socket.emit(`unsubscribe:${room}` as any);
    }
  }

  // Health check
  async ping(): Promise<boolean> {
    return new Promise((resolve) => {
      if (!this.socket?.connected) {
        resolve(false);
        return;
      }

      const timeout = setTimeout(() => resolve(false), 5000);

      this.socket.emit('ping' as any);
      this.socket.once('pong' as any, () => {
        clearTimeout(timeout);
        resolve(true);
      });
    });
  }
}

// Export singleton instance
export const socketClient = new SocketClient();

// Export class for testing or custom instances
export default SocketClient;
