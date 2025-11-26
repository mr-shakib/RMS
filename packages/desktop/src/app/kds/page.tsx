'use client';

import { useState, useEffect, useRef } from 'react';
import { useKDS } from '@/hooks/useKDS';
import { useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import { OrderStatus } from '@rms/shared';
import type { Order } from '@rms/shared';

// Order Ticket Component
interface OrderTicketProps {
  order: Order & { table?: { name: string }; items?: Array<{ menuItem: { name: string }; quantity: number; notes?: string }> };
  onStatusUpdate: (orderId: string, newStatus: OrderStatus) => void;
  isHighlighted: boolean;
}

function OrderTicket({ order, onStatusUpdate, isHighlighted }: OrderTicketProps) {
  const orderDate = new Date(order.createdAt);
  const formattedTime = orderDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const tableName = order.table?.name || `Table ${order.tableId}`;
  
  // Calculate time elapsed
  const [timeElapsed, setTimeElapsed] = useState('');
  
  useEffect(() => {
    const updateElapsed = () => {
      const now = new Date();
      const diff = Math.floor((now.getTime() - orderDate.getTime()) / 1000 / 60); // minutes
      setTimeElapsed(`${diff}m`);
    };
    
    updateElapsed();
    const interval = setInterval(updateElapsed, 60000); // Update every minute
    
    return () => clearInterval(interval);
  }, [orderDate]);

  const handleMarkAsPreparing = () => {
    onStatusUpdate(order.id, OrderStatus.PREPARING);
  };

  const handleMarkAsReady = () => {
    onStatusUpdate(order.id, OrderStatus.READY);
  };

  return (
    <div
      className={`bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 mb-4 transition-all duration-300 ${
        isHighlighted ? 'ring-4 ring-blue-500 animate-pulse' : ''
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-200 dark:border-gray-700">
        <div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">
            {tableName}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Order #{order.id.slice(0, 8)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-500 dark:text-gray-400">{formattedTime}</p>
          <p className="text-lg font-semibold text-orange-600 dark:text-orange-400">
            {timeElapsed}
          </p>
        </div>
      </div>

      {/* Items */}
      <div className="space-y-2 mb-4">
        {order.items && order.items.length > 0 ? (
          order.items.map((item, index) => (
            <div key={index} className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-base font-medium text-gray-900 dark:text-white">
                  <span className="inline-block w-8 text-center font-bold text-blue-600 dark:text-blue-400">
                    {item.quantity}x
                  </span>
                  {item.menuItem?.name || 'Unknown Item'}
                </p>
                {item.notes && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 ml-8 italic">
                    Note: {item.notes}
                  </p>
                )}
              </div>
            </div>
          ))
        ) : (
          <p className="text-sm text-gray-500 dark:text-gray-400">No items</p>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        {order.status === OrderStatus.PENDING && (
          <button
            onClick={handleMarkAsPreparing}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
          >
            Mark as Preparing
          </button>
        )}
        {order.status === OrderStatus.PREPARING && (
          <button
            onClick={handleMarkAsReady}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
          >
            Mark as Ready
          </button>
        )}
        {order.status === OrderStatus.READY && (
          <div className="flex-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 font-semibold py-3 px-4 rounded-lg text-center">
            Ready for Pickup
          </div>
        )}
      </div>
    </div>
  );
}

// Main KDS Page Component
export default function KDSPage() {
  const { groupedOrders, isLoading } = useKDS();
  const [highlightedOrders, setHighlightedOrders] = useState<Set<string>>(new Set());
  const [soundEnabled, setSoundEnabled] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const previousOrderIdsRef = useRef<Set<string>>(new Set());
  const columnRefs = {
    pending: useRef<HTMLDivElement>(null),
    preparing: useRef<HTMLDivElement>(null),
    ready: useRef<HTMLDivElement>(null),
  };
  
  // Import useQueryClient for manual cache updates
  const queryClient = useQueryClient();

  // Initialize audio
  useEffect(() => {
    // Create a simple beep sound using Web Audio API
    const createBeepSound = () => {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    };

    if (typeof window !== 'undefined') {
      audioRef.current = { play: createBeepSound } as any;
    }
  }, []);

  // Detect new orders and highlight them
  useEffect(() => {
    const currentOrderIds = new Set([
      ...groupedOrders.pending.map(o => o.id),
      ...groupedOrders.preparing.map(o => o.id),
      ...groupedOrders.ready.map(o => o.id),
    ]);

    // Find new orders
    const newOrderIds = Array.from(currentOrderIds).filter(
      id => !previousOrderIdsRef.current.has(id)
    );

    if (newOrderIds.length > 0) {
      // Highlight new orders
      setHighlightedOrders(new Set(newOrderIds));

      // Play sound notification if enabled
      if (soundEnabled && audioRef.current) {
        try {
          audioRef.current.play();
        } catch (error) {
          console.error('Failed to play notification sound:', error);
        }
      }

      // Auto-scroll to the first new order in pending column
      const firstNewOrder = groupedOrders.pending.find(o => newOrderIds.includes(o.id));
      if (firstNewOrder && columnRefs.pending.current) {
        setTimeout(() => {
          columnRefs.pending.current?.scrollTo({ top: 0, behavior: 'smooth' });
        }, 100);
      }

      // Remove highlight after 3 seconds
      setTimeout(() => {
        setHighlightedOrders(new Set());
      }, 3000);
    }

    previousOrderIdsRef.current = currentOrderIds;
  }, [groupedOrders, soundEnabled]);

  const handleStatusUpdate = async (orderId: string, newStatus: OrderStatus) => {
    try {
      // Optimistic update - immediately update the UI
      queryClient.setQueryData<Order[]>(['kds-orders'], (old) => {
        if (!old) return [];
        return old.map((order) => 
          order.id === orderId ? { ...order, status: newStatus } : order
        );
      });

      // Make the API call
      await apiClient.patch(`/orders/${orderId}`, { status: newStatus });
      
      // Invalidate to ensure we have the latest data from server
      queryClient.invalidateQueries({ queryKey: ['kds-orders'] });
    } catch (error) {
      console.error('Failed to update order status:', error);
      // Revert optimistic update on error
      queryClient.invalidateQueries({ queryKey: ['kds-orders'] });
      alert('Failed to update order status. Please try again.');
    }
  };

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-500 mx-auto mb-4"></div>
          <p className="text-xl text-gray-600 dark:text-gray-400">Loading Kitchen Display...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-md px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Kitchen Display System
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Real-time order tracking for kitchen staff
          </p>
        </div>
        <div className="flex items-center gap-4">
          {/* Sound Toggle */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              soundEnabled
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                : 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
            }`}
          >
            {soundEnabled ? (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.415z"
                  clipRule="evenodd"
                />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM12.293 7.293a1 1 0 011.414 0L15 8.586l1.293-1.293a1 1 0 111.414 1.414L16.414 10l1.293 1.293a1 1 0 01-1.414 1.414L15 11.414l-1.293 1.293a1 1 0 01-1.414-1.414L13.586 10l-1.293-1.293a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            )}
            <span>{soundEnabled ? 'Sound On' : 'Sound Off'}</span>
          </button>

          {/* Order Count */}
          <div className="text-right">
            <p className="text-sm text-gray-500 dark:text-gray-400">Active Orders</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {groupedOrders.pending.length + groupedOrders.preparing.length + groupedOrders.ready.length}
            </p>
          </div>
        </div>
      </div>

      {/* Columns Layout */}
      <div className="flex-1 grid grid-cols-3 gap-4 p-6 overflow-hidden">
        {/* Pending Column */}
        <div className="flex flex-col bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
          <div className="bg-yellow-500 text-white px-4 py-3 flex items-center justify-between">
            <h2 className="text-xl font-bold">Pending</h2>
            <span className="bg-white text-yellow-600 font-bold px-3 py-1 rounded-full text-sm">
              {groupedOrders.pending.length}
            </span>
          </div>
          <div ref={columnRefs.pending} className="flex-1 overflow-y-auto p-4">
            {groupedOrders.pending.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-400 dark:text-gray-500">No pending orders</p>
              </div>
            ) : (
              groupedOrders.pending.map((order) => (
                <OrderTicket
                  key={order.id}
                  order={order as any}
                  onStatusUpdate={handleStatusUpdate}
                  isHighlighted={highlightedOrders.has(order.id)}
                />
              ))
            )}
          </div>
        </div>

        {/* Preparing Column */}
        <div className="flex flex-col bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
          <div className="bg-blue-500 text-white px-4 py-3 flex items-center justify-between">
            <h2 className="text-xl font-bold">Preparing</h2>
            <span className="bg-white text-blue-600 font-bold px-3 py-1 rounded-full text-sm">
              {groupedOrders.preparing.length}
            </span>
          </div>
          <div ref={columnRefs.preparing} className="flex-1 overflow-y-auto p-4">
            {groupedOrders.preparing.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-400 dark:text-gray-500">No orders in preparation</p>
              </div>
            ) : (
              groupedOrders.preparing.map((order) => (
                <OrderTicket
                  key={order.id}
                  order={order as any}
                  onStatusUpdate={handleStatusUpdate}
                  isHighlighted={highlightedOrders.has(order.id)}
                />
              ))
            )}
          </div>
        </div>

        {/* Ready Column */}
        <div className="flex flex-col bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
          <div className="bg-green-500 text-white px-4 py-3 flex items-center justify-between">
            <h2 className="text-xl font-bold">Ready</h2>
            <span className="bg-white text-green-600 font-bold px-3 py-1 rounded-full text-sm">
              {groupedOrders.ready.length}
            </span>
          </div>
          <div ref={columnRefs.ready} className="flex-1 overflow-y-auto p-4">
            {groupedOrders.ready.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-400 dark:text-gray-500">No orders ready</p>
              </div>
            ) : (
              groupedOrders.ready.map((order) => (
                <OrderTicket
                  key={order.id}
                  order={order as any}
                  onStatusUpdate={handleStatusUpdate}
                  isHighlighted={highlightedOrders.has(order.id)}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
