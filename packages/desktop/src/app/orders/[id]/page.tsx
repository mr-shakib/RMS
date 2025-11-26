'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import { OrderStatus } from '@rms/shared';

interface OrderDetailPageProps {
  params: {
    id: string;
  };
}

export default function OrderDetailPage({ params }: OrderDetailPageProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  // Fetch order details
  const { data: orderResponse, isLoading, error } = useQuery({
    queryKey: ['order', params.id],
    queryFn: () => apiClient.get<any>(`/orders/${params.id}`),
  });

  const order = orderResponse?.data?.order;

  // Update order status mutation
  const updateStatusMutation = useMutation({
    mutationFn: (status: OrderStatus) =>
      apiClient.patch(`/orders/${params.id}`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order', params.id] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['tables'] }); // Invalidate tables cache when order status changes
    },
  });

  // Cancel order mutation
  const cancelOrderMutation = useMutation({
    mutationFn: () => apiClient.delete(`/orders/${params.id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      router.push('/orders');
    },
  });

  // Reprint receipt mutation
  const reprintReceiptMutation = useMutation({
    mutationFn: () => apiClient.post(`/printer/reprint/receipt/${params.id}`),
    onSuccess: () => {
      alert('✅ Receipt sent to printer successfully!\n\nThe receipt has been added to the print queue.');
    },
    onError: (error: any) => {
      const rawError = error?.response?.data?.error || error?.message || 'Unknown error';
      
      let userMessage = '';
      
      // Check for specific error types
      if (rawError.includes('Printer not connected') || rawError.includes('not configured')) {
        userMessage = '⚠️ Printer Not Available\n\nNo printer is currently connected or configured.\n\nPlease:\n1. Go to Settings\n2. Configure your printer\n3. Connect to the printer\n\nNote: A PDF receipt will be generated automatically in the receipts folder as a backup.';
      } else if (rawError.includes('timeout') || rawError.includes('busy')) {
        userMessage = '⏳ Printer Busy\n\nThe printer is currently processing another job. Please wait a moment and try again.';
      } else if (rawError.includes('offline') || rawError.includes('communication')) {
        userMessage = '📡 Connection Error\n\nCannot communicate with the printer. Please check:\n• Printer is turned on\n• Network/USB connection is active\n• Printer is not in error state\n\nA PDF receipt will be generated as backup.';
      } else {
        userMessage = `❌ Print Error\n\n${rawError}\n\nIf the printer is not configured, please go to Settings to set it up. A PDF backup will be created in the receipts folder.`;
      }
      
      alert(userMessage);
    },
  });

  const handleStatusUpdate = (newStatus: OrderStatus) => {
    updateStatusMutation.mutate(newStatus);
  };

  const handleCancelOrder = () => {
    cancelOrderMutation.mutate();
    setShowCancelDialog(false);
  };

  const handleReprintReceipt = () => {
    reprintReceiptMutation.mutate();
  };

  const getNextStatus = (currentStatus: OrderStatus): OrderStatus | null => {
    const statusFlow: Record<OrderStatus, OrderStatus | null> = {
      [OrderStatus.PENDING]: OrderStatus.PREPARING,
      [OrderStatus.PREPARING]: OrderStatus.PAID,
      [OrderStatus.READY]: OrderStatus.PAID, // Legacy support
      [OrderStatus.SERVED]: OrderStatus.PAID, // Legacy support
      [OrderStatus.PAID]: null,
      [OrderStatus.CANCELLED]: null,
    };
    return statusFlow[currentStatus];
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          <span className="ml-3 text-gray-600 dark:text-gray-400">Loading order details...</span>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="p-6">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-red-800 dark:text-red-400 mb-2">
            Order Not Found
          </h2>
          <p className="text-red-600 dark:text-red-300 mb-4">
            The order you're looking for doesn't exist or has been deleted.
          </p>
          <button
            onClick={() => router.push('/orders')}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Back to Orders
          </button>
        </div>
      </div>
    );
  }

  const nextStatus = getNextStatus(order.status);
  const canUpdateStatus = nextStatus !== null;
  const canCancel = order.status !== OrderStatus.PAID && order.status !== OrderStatus.CANCELLED;
  // Allow reprint at any status - no blocking conditions
  const canReprintReceipt = true;

  const statusColors: Record<OrderStatus, string> = {
    [OrderStatus.PENDING]: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    [OrderStatus.PREPARING]: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    [OrderStatus.READY]: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
    [OrderStatus.SERVED]: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    [OrderStatus.PAID]: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
    [OrderStatus.CANCELLED]: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  };

  const orderDate = new Date(order.createdAt);
  const formattedDate = orderDate.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const formattedTime = orderDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const kitchenNotes: string[] = Array.from(
    new Set(
      (order.items || [])
        .map((i: any) => (typeof i.notes === 'string' ? i.notes.trim() : ''))
        .filter((n: string) => n.length > 0)
    )
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => router.push('/orders')}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <svg
              className="w-6 h-6 text-gray-600 dark:text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Order #{order.id.slice(0, 8)}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {formattedDate} at {formattedTime}
            </p>
          </div>
        </div>

        <span
          className={`px-4 py-2 rounded-full text-sm font-medium ${
            statusColors[order.status as OrderStatus]
          }`}
        >
          {order.status}
        </span>
      </div>

      {/* Action Buttons */}
      <div className="flex space-x-3">
        {canUpdateStatus && (
          <button
            onClick={() => handleStatusUpdate(nextStatus)}
            disabled={updateStatusMutation.isPending}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 
                     transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                     flex items-center space-x-2"
          >
            {updateStatusMutation.isPending ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Updating...</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 7l5 5m0 0l-5 5m5-5H6"
                  />
                </svg>
                <span>
                  {nextStatus === OrderStatus.PREPARING && 'Start Preparing'}
                  {nextStatus === OrderStatus.PAID && 'Mark as Paid & Generate Receipt'}
                </span>
              </>
            )}
          </button>
        )}

        {canReprintReceipt && (
          <button
            onClick={handleReprintReceipt}
            disabled={reprintReceiptMutation.isPending}
            className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 
                     transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                     flex items-center space-x-2"
          >
            {reprintReceiptMutation.isPending ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Printing...</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
                  />
                </svg>
                <span>Reprint Receipt</span>
              </>
            )}
          </button>
        )}

        {canCancel && (
          <button
            onClick={() => setShowCancelDialog(true)}
            className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 
                     transition-colors flex items-center space-x-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
            <span>Cancel Order</span>
          </button>
        )}
      </div>

      {/* Order Information Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Table Information */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Table Information
          </h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Table Name:</span>
              <span className="font-medium text-gray-900 dark:text-white">
                {order.table?.name || `Table ${order.tableId}`}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Table ID:</span>
              <span className="font-medium text-gray-900 dark:text-white">
                #{order.tableId}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Table Status:</span>
              <span className="font-medium text-gray-900 dark:text-white">
                {order.table?.status || 'N/A'}
              </span>
            </div>
          </div>
        </div>

        {/* Order Summary */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Order Summary
          </h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Order ID:</span>
              <span className="font-medium text-gray-900 dark:text-white font-mono text-sm">
                {order.id}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Status:</span>
              <span className="font-medium text-gray-900 dark:text-white">
                {order.status}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Items Count:</span>
              <span className="font-medium text-gray-900 dark:text-white">
                {order.items?.length || 0}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Kitchen Instructions */}
      {kitchenNotes.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Kitchen Instructions
          </h2>
          {kitchenNotes.length === 1 ? (
            <p className="text-gray-700 dark:text-gray-300">{kitchenNotes[0]}</p>
          ) : (
            <ul className="list-disc pl-5 space-y-1 text-gray-700 dark:text-gray-300">
              {kitchenNotes.map((n, idx) => (
                <li key={idx}>{n}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Order Items */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Order Items
        </h2>
        <div className="space-y-3">
          {order.items && order.items.length > 0 ? (
            order.items.map((item: any) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
              >
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900 dark:text-white">
                    {item.menuItem?.name || 'Unknown Item'}
                  </h3>
                  {item.notes && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      Note: {item.notes}
                    </p>
                  )}
                </div>
                <div className="flex items-center space-x-6 text-right">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Quantity</p>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {item.quantity}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Price</p>
                    <p className="font-medium text-gray-900 dark:text-white">
                      ${Number(item.price).toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Subtotal</p>
                    <p className="font-semibold text-gray-900 dark:text-white">
                      ${(Number(item.price) * item.quantity).toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <p className="text-gray-500 dark:text-gray-400 text-center py-4">
              No items in this order
            </p>
          )}
        </div>
      </div>

      {/* Payment Breakdown */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Payment Breakdown
        </h2>
        <div className="space-y-3">
          <div className="flex justify-between text-gray-600 dark:text-gray-400">
            <span>Subtotal:</span>
            <span>${Number(order.subtotal).toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-gray-600 dark:text-gray-400">
            <span>Tax:</span>
            <span>${Number(order.tax).toFixed(2)}</span>
          </div>
          {Number(order.discount) > 0 && (
            <div className="flex justify-between text-green-600 dark:text-green-400">
              <span>Discount:</span>
              <span>-${Number(order.discount).toFixed(2)}</span>
            </div>
          )}
          {Number(order.serviceCharge) > 0 && (
            <div className="flex justify-between text-gray-600 dark:text-gray-400">
              <span>Service Charge:</span>
              <span>${Number(order.serviceCharge).toFixed(2)}</span>
            </div>
          )}
          {Number(order.tip) > 0 && (
            <div className="flex justify-between text-gray-600 dark:text-gray-400">
              <span>Tip:</span>
              <span>${Number(order.tip).toFixed(2)}</span>
            </div>
          )}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-3 mt-3">
            <div className="flex justify-between text-xl font-bold text-gray-900 dark:text-white">
              <span>Total:</span>
              <span>${Number(order.total).toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Cancel Confirmation Dialog */}
      {showCancelDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Cancel Order
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Are you sure you want to cancel this order? This action cannot be undone.
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowCancelDialog(false)}
                className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 
                         rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                Keep Order
              </button>
              <button
                onClick={handleCancelOrder}
                disabled={cancelOrderMutation.isPending}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 
                         transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {cancelOrderMutation.isPending ? 'Cancelling...' : 'Yes, Cancel Order'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
