import { useEffect, useState } from 'react';
import { socketClient } from '@/lib/socketClient';
import type { Socket } from 'socket.io-client';
import type { ServerEvents, ClientEvents } from '@rms/shared';

export function useSocket() {
  const [socket, setSocket] = useState<Socket<ServerEvents, ClientEvents> | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const socketInstance = socketClient.connect();
    setSocket(socketInstance);

    const handleConnect = () => setIsConnected(true);
    const handleDisconnect = () => setIsConnected(false);

    socketInstance.on('connect', handleConnect);
    socketInstance.on('disconnect', handleDisconnect);

    // Set initial state
    setIsConnected(socketInstance.connected);

    return () => {
      socketInstance.off('connect', handleConnect);
      socketInstance.off('disconnect', handleDisconnect);
    };
  }, []);

  return { socket, isConnected };
}
