'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useOrders } from '@/hooks/useOrders';
import { useCurrency } from '@/hooks/useCurrency';
import { OrderStatus } from '@rms/shared';

type OrderStatusFilter = 'ALL' | OrderStatus;

const STATUS_FILTERS: { label: string; value: OrderStatusFilter }[] = [
  { label: 'All', value: 'ALL' },
  { label: 'Pending', value: OrderStatus.PENDING },
  { label: 'Preparing', value: OrderStatus.PREPARING },
  { label: 'Paid', value: OrderStatus.PAID },
];

export default function OrdersPage() {
  const router = useRouter();
  const { orders, isLoading } = useOrders();
  const [statusFilter, setStatusFilter] = useState<OrderStatusFilter>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Ensure orders is always an array
  const ordersList = Array.isArray(orders) ? orders : [];

  // Filter and search orders
  const filteredOrders = useMemo(() => {
    let filtered = ordersList;

    // Apply status filter
    if (statusFilter !== 'ALL') {
      filtered = filtered.filter((order) => order.status === statusFilter);
    }

    // Apply search filter (by order ID or table name)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((order) => {
        const orderId = order.id.toLowerCase();
        const tableName = (order as any).table?.name?.toLowerCase() || '';
        return orderId.includes(query) || tableName.includes(query);
      });
    }

    return filtered;
  }, [ordersList, statusFilter, searchQuery]);

  const handleOrderClick = (orderId: string) => {
    router.push(`/orders/${orderId}`);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Orders</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Manage and track all restaurant orders
        </p>
      </div>

      {/* Search Bar */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <input
          type="text"
          placeholder="Search by order ID or table name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg 
                   bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                   focus:ring-2 focus:ring-blue-500 focus:border-transparent
                   placeholder-gray-400 dark:placeholder-gray-500"
        />
      </div>

      {/* Status Filter Tabs */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="flex overflow-x-auto border-b border-gray-200 dark:border-gray-700">
          {STATUS_FILTERS.map((filter) => (
            <button
              key={filter.value}
              onClick={() => setStatusFilter(filter.value)}
              className={`px-6 py-3 text-sm font-medium whitespace-nowrap transition-colors
                ${
                  statusFilter === filter.value
                    ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
            >
              {filter.label}
              {filter.value === 'ALL' && (
                <span className="ml-2 text-xs bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded-full">
                  {ordersList.length}
                </span>
              )}
              {filter.value !== 'ALL' && (
                <span className="ml-2 text-xs bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded-full">
                  {ordersList.filter((o) => o.status === filter.value).length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Orders List */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              <span className="ml-3 text-gray-600 dark:text-gray-400">Loading orders...</span>
            </div>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8">
            <div className="text-center">
              <p className="text-gray-500 dark:text-gray-400 text-lg">
                {searchQuery ? 'No orders found matching your search' : 'No orders found'}
              </p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
                {searchQuery ? 'Try a different search term' : 'Orders will appear here once created'}
              </p>
            </div>
          </div>
        ) : (
          filteredOrders.map((order) => (
            <OrderCard key={order.id} order={order} onClick={() => handleOrderClick(order.id)} />
          ))
        )}
      </div>
    </div>
  );
}

// Order Card Component
interface OrderCardProps {
  order: any; // Using any for now since we need the extended type with table and items
  onClick: () => void;
}

function OrderCard({ order, onClick }: OrderCardProps) {
  const { formatCurrency } = useCurrency();
  const statusColors: Record<OrderStatus, string> = {
    [OrderStatus.PENDING]: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    [OrderStatus.PREPARING]: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    [OrderStatus.READY]: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
    [OrderStatus.SERVED]: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    [OrderStatus.PAID]: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
    [OrderStatus.CANCELLED]: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  };

  const itemsCount = order.items?.length || 0;
  const tableName = order.table?.name || `Table ${order.tableId}`;
  const orderDate = new Date(order.createdAt);
  const formattedDate = orderDate.toLocaleDateString();
  const formattedTime = orderDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div
      onClick={onClick}
      className="bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-lg 
               transition-shadow cursor-pointer p-6"
    >
      <div className="flex items-start justify-between">
        {/* Left Section */}
        <div className="flex-1">
          <div className="flex items-center space-x-3 mb-2">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {tableName}
            </h3>
            <span
              className={`px-3 py-1 rounded-full text-xs font-medium ${
                statusColors[order.status as OrderStatus]
              }`}
            >
              {order.status}
            </span>
          </div>

          <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
            <span className="flex items-center">
              <svg
                className="w-4 h-4 mr-1"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14"
                />
              </svg>
              Order #{order.id.slice(0, 8)}
            </span>
            <span className="flex items-center">
              <svg
                className="w-4 h-4 mr-1"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              {formattedDate} at {formattedTime}
            </span>
            <span className="flex items-center">
              <svg
                className="w-4 h-4 mr-1"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
              {itemsCount} {itemsCount === 1 ? 'item' : 'items'}
            </span>
          </div>
        </div>

        {/* Right Section - Total */}
        <div className="text-right ml-4">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Total</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {formatCurrency(Number(order.total))}
          </p>
        </div>
      </div>
    </div>
  );
}
