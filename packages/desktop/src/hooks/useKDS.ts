import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSocket } from './useSocket';
import { apiClient } from '@/lib/apiClient';
import type { Order, OrderStatus } from '@rms/shared';

export function useKDS() {
  const queryClient = useQueryClient();
  const { socket, isConnected } = useSocket();

  // Fetch active kitchen orders (PENDING, PREPARING, READY)
  const { data: orders, isLoading, error, refetch } = useQuery<Order[]>({
    queryKey: ['kds-orders'],
    queryFn: () => apiClient.get<Order[]>('/orders?status=PENDING,PREPARING,READY'),
  });

  // Subscribe to KDS updates via WebSocket
  useEffect(() => {
    if (!socket || !isConnected) return;

    // Subscribe to KDS room
    socket.emit('subscribe:kds');

    // Handle order created
    const handleOrderCreated = (order: Order) => {
      queryClient.setQueryData<Order[]>(['kds-orders'], (old) => {
        if (!old) return [order];
        // Only add if it's a kitchen-relevant status
        if (['PENDING', 'PREPARING', 'READY'].includes(order.status)) {
          return [order, ...old];
        }
        return old;
      });
    };

    // Handle order updated
    const handleOrderUpdated = (updatedOrder: Order) => {
      queryClient.setQueryData<Order[]>(['kds-orders'], (old) => {
        if (!old) return [];
        
        // If order is no longer in kitchen statuses, remove it
        if (!['PENDING', 'PREPARING', 'READY'].includes(updatedOrder.status)) {
          return old.filter((order) => order.id !== updatedOrder.id);
        }
        
        // Update existing order
        const exists = old.some((order) => order.id === updatedOrder.id);
        if (exists) {
          return old.map((order) => (order.id === updatedOrder.id ? updatedOrder : order));
        }
        
        // Add new order if it's in kitchen status
        return [updatedOrder, ...old];
      });
    };

    // Handle order cancelled
    const handleOrderCancelled = (orderId: string) => {
      queryClient.setQueryData<Order[]>(['kds-orders'], (old) => {
        if (!old) return [];
        return old.filter((order) => order.id !== orderId);
      });
    };

    socket.on('order:created', handleOrderCreated);
    socket.on('order:updated', handleOrderUpdated);
    socket.on('order:cancelled', handleOrderCancelled);

    return () => {
      socket.emit('unsubscribe:kds');
      socket.off('order:created', handleOrderCreated);
      socket.off('order:updated', handleOrderUpdated);
      socket.off('order:cancelled', handleOrderCancelled);
    };
  }, [socket, isConnected, queryClient]);

  // Group orders by status
  const groupedOrders = {
    pending: orders?.filter((o) => o.status === 'PENDING') || [],
    preparing: orders?.filter((o) => o.status === 'PREPARING') || [],
    ready: orders?.filter((o) => o.status === 'READY') || [],
  };

  return {
    orders: orders || [],
    groupedOrders,
    isLoading,
    error,
    refetch,
  };
}
