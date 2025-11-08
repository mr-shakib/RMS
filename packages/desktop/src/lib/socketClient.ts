import { io, Socket } from 'socket.io-client';
import type { ServerEvents, ClientEvents } from '@rms/shared';

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

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

    // Calculate exponential backoff delay
    const getReconnectionDelay = (attempt: number): number => {
      const baseDelay = 1000;
      const maxDelay = 30000;
      const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
      // Add jitter to prevent thundering herd
      return delay + Math.random() * 1000;
    };

    this.socket = io(SOCKET_URL, {
      auth: {
        token,
      },
      reconnection: false, // We'll handle reconnection manually for better control
      timeout: 10000,
      transports: ['websocket', 'polling'],
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
      this.notifyStatusListeners('error');
      this.scheduleReconnect();
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
