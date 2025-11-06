import { io, Socket } from 'socket.io-client';
import type { ServerEvents, ClientEvents } from '@rms/shared';

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

class SocketClient {
  private socket: Socket<ServerEvents, ClientEvents> | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  connect(): Socket<ServerEvents, ClientEvents> {
    if (this.socket?.connected) {
      return this.socket;
    }

    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

    this.socket = io(SOCKET_URL, {
      auth: {
        token,
      },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: this.maxReconnectAttempts,
    });

    this.socket.on('connect', () => {
      console.log('Socket connected');
      this.reconnectAttempts = 0;
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      this.reconnectAttempts++;

      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.error('Max reconnection attempts reached');
      }
    });

    return this.socket;
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  getSocket(): Socket<ServerEvents, ClientEvents> | null {
    return this.socket;
  }

  isConnected(): boolean {
    return this.socket?.connected ?? false;
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
}

// Export singleton instance
export const socketClient = new SocketClient();

// Export class for testing or custom instances
export default SocketClient;
