import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSocket } from './useSocket';
import { apiClient } from '@/lib/apiClient';
import type { Order } from '@rms/shared';

export function useOrders() {
  const queryClient = useQueryClient();
  const { socket, isConnected } = useSocket();

  // Fetch orders
  const { data: orders, isLoading, error, refetch } = useQuery<Order[]>({
    queryKey: ['orders'],
    queryFn: async () => {
      const response = await apiClient.get<{ status: string; data: { orders: Order[]; count: number } }>('/orders');
      return response.data.orders;
    },
    refetchInterval: false, // Disable polling - we use WebSocket for real-time updates
    staleTime: 0, // Always consider data stale to ensure fresh data
  });

  // Subscribe to order updates via WebSocket
  useEffect(() => {
    if (!socket || !isConnected) return;

    // Subscribe to orders room
    socket.emit('subscribe:orders');

    // Handle order created
    const handleOrderCreated = (order: Order) => {
      queryClient.setQueryData<Order[]>(['orders'], (old) => {
        if (!old || !Array.isArray(old)) return [order];
        return [order, ...old];
      });
    };

    // Handle order updated
    const handleOrderUpdated = (updatedOrder: Order) => {
      queryClient.setQueryData<Order[]>(['orders'], (old) => {
        if (!old || !Array.isArray(old)) return [updatedOrder];
        return old.map((order) => (order.id === updatedOrder.id ? updatedOrder : order));
      });
      // Also invalidate KDS orders to keep kitchen display in sync
      queryClient.invalidateQueries({ queryKey: ['kds-orders'] });
    };

    // Handle order cancelled
    const handleOrderCancelled = (orderId: string) => {
      queryClient.setQueryData<Order[]>(['orders'], (old) => {
        if (!old || !Array.isArray(old)) return [];
        return old.filter((order) => order.id !== orderId);
      });
    };

    socket.on('order:created', handleOrderCreated);
    socket.on('order:updated', handleOrderUpdated);
    socket.on('order:cancelled', handleOrderCancelled);

    return () => {
      socket.emit('unsubscribe:orders');
      socket.off('order:created', handleOrderCreated);
      socket.off('order:updated', handleOrderUpdated);
      socket.off('order:cancelled', handleOrderCancelled);
    };
  }, [socket, isConnected, queryClient]);

  return {
    orders: orders || [],
    isLoading,
    error,
    refetch,
  };
}
