'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useOrders } from '@/hooks/useOrders';
import { useTables } from '@/hooks/useTables';
import { apiClient } from '@/lib/apiClient';
import { OrderStatus, TableStatus } from '@rms/shared';
import type { MenuItem } from '@rms/shared';

interface SalesData {
  daily: number;
  weekly: number;
  monthly: number;
}

interface SalesReportResponse {
  status: string;
  data: {
    report: {
      totalRevenue: number;
      totalOrders: number;
      averageOrderValue: number;
      paymentMethodBreakdown: Array<{
        method: string;
        count: number;
        total: number;
      }>;
      dailyBreakdown?: Array<{
        date: string;
        revenue: number;
        orders: number;
      }>;
    };
    dateRange: {
      startDate: string;
      endDate: string;
    };
  };
}

interface TopSellingItem {
  name: string;
  category: string;
  quantity: number;
  revenue: number;
}

interface TopItemsResponse {
  status: string;
  data: {
    topItems: TopSellingItem[];
    count: number;
    dateRange?: {
      startDate: string;
      endDate: string;
    };
  };
}

export default function DashboardPage() {
  const { orders } = useOrders();
  const { tables } = useTables();
  const [currentTime, setCurrentTime] = useState(new Date());

  // Fetch sales data
  const { data: salesData } = useQuery<SalesData>({
    queryKey: ['sales-summary'],
    queryFn: async () => {
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      const weekAgoStr = weekAgo.toISOString().split('T')[0];
      
      const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
      const monthAgoStr = monthAgo.toISOString().split('T')[0];

      const [dailyResponse, weeklyResponse, monthlyResponse] = await Promise.all([
        apiClient.get<SalesReportResponse>(`/reports/sales?startDate=${todayStr}&endDate=${todayStr}`),
        apiClient.get<SalesReportResponse>(`/reports/sales?startDate=${weekAgoStr}&endDate=${todayStr}`),
        apiClient.get<SalesReportResponse>(`/reports/sales?startDate=${monthAgoStr}&endDate=${todayStr}`),
      ]);

      return {
        daily: dailyResponse.data.report.totalRevenue || 0,
        weekly: weeklyResponse.data.report.totalRevenue || 0,
        monthly: monthlyResponse.data.report.totalRevenue || 0,
      };
    },
    refetchInterval: 30000, // Auto-refresh every 30 seconds
  });

  // Fetch top selling items
  const { data: topItemsResponse } = useQuery<TopItemsResponse>({
    queryKey: ['top-items'],
    queryFn: () => apiClient.get<TopItemsResponse>('/reports/top-items?limit=5'),
    refetchInterval: 30000,
  });

  const topItems = topItemsResponse?.data.topItems || [];

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Calculate metrics with safety checks
  const ordersList = Array.isArray(orders) ? orders : [];
  const tablesList = Array.isArray(tables) ? tables : [];

  const activeOrders = ordersList.filter(
    (order) => order.status !== OrderStatus.PAID && order.status !== OrderStatus.CANCELLED
  ).length;

  const pendingKitchenOrders = ordersList.filter(
    (order) => order.status === OrderStatus.PENDING || order.status === OrderStatus.PREPARING
  ).length;

  const tableOccupancy = {
    free: tablesList.filter((t) => t.status === TableStatus.FREE).length,
    occupied: tablesList.filter((t) => t.status === TableStatus.OCCUPIED).length,
    reserved: tablesList.filter((t) => t.status === TableStatus.RESERVED).length,
  };

  const totalTables = tablesList.length;
  const occupancyPercentage = totalTables > 0 ? Math.round((tableOccupancy.occupied / totalTables) * 100) : 0;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {currentTime.toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })} • {currentTime.toLocaleTimeString()}
          </p>
        </div>
      </div>

      {/* Revenue Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricCard
          title="Daily Revenue"
          value={`$${salesData?.daily.toFixed(2) || '0.00'}`}
          icon="📊"
          color="blue"
        />
        <MetricCard
          title="Weekly Revenue"
          value={`$${salesData?.weekly.toFixed(2) || '0.00'}`}
          icon="📈"
          color="green"
        />
        <MetricCard
          title="Monthly Revenue"
          value={`$${salesData?.monthly.toFixed(2) || '0.00'}`}
          icon="💰"
          color="purple"
        />
      </div>

      {/* Orders and Tables Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Active Orders */}
        <MetricCard
          title="Active Orders"
          value={activeOrders.toString()}
          subtitle={`${pendingKitchenOrders} pending in kitchen`}
          icon="🍽️"
          color="orange"
        />

        {/* Table Occupancy */}
        <MetricCard
          title="Table Occupancy"
          value={`${occupancyPercentage}%`}
          subtitle={`${tableOccupancy.occupied} of ${totalTables} tables occupied`}
          icon="🪑"
          color="indigo"
        />
      </div>

      {/* Table Status Visualization */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Table Status Overview
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatusCard
            label="Free"
            count={tableOccupancy.free}
            color="green"
            icon="✓"
          />
          <StatusCard
            label="Occupied"
            count={tableOccupancy.occupied}
            color="red"
            icon="●"
          />
          <StatusCard
            label="Reserved"
            count={tableOccupancy.reserved}
            color="yellow"
            icon="◐"
          />
        </div>
      </div>

      {/* Top Selling Items */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Top Selling Items
        </h2>
        {topItems.length > 0 ? (
          <div className="space-y-3">
            {topItems.map((item, index) => (
              <div
                key={`${item.name}-${index}`}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
              >
                <div className="flex items-center space-x-3">
                  <span className="text-2xl font-bold text-gray-400 dark:text-gray-500 w-8">
                    #{index + 1}
                  </span>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {item.name}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {item.quantity} orders • {item.category}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900 dark:text-white">
                    ${item.revenue.toFixed(2)}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    revenue
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 dark:text-gray-400 text-center py-8">
            No sales data available yet
          </p>
        )}
      </div>

      {/* Low Stock Alerts (Placeholder) */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Low Stock Alerts
        </h2>
        <div className="text-center py-8">
          <p className="text-gray-500 dark:text-gray-400">
            Inventory tracking will be available in a future update
          </p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
            This feature is currently under development
          </p>
        </div>
      </div>
    </div>
  );
}

// Metric Card Component
interface MetricCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: string;
  color: 'blue' | 'green' | 'purple' | 'orange' | 'indigo';
}

function MetricCard({ title, value, subtitle, icon, color }: MetricCardProps) {
  const colorClasses = {
    blue: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
    green: 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400',
    purple: 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400',
    orange: 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400',
    indigo: 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400',
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
            {title}
          </p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
            {value}
          </p>
          {subtitle && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {subtitle}
            </p>
          )}
        </div>
        <div className={`text-4xl p-3 rounded-lg ${colorClasses[color]}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

// Status Card Component
interface StatusCardProps {
  label: string;
  count: number;
  color: 'green' | 'red' | 'yellow';
  icon: string;
}

function StatusCard({ label, count, color, icon }: StatusCardProps) {
  const colorClasses = {
    green: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800',
    red: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800',
    yellow: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800',
  };

  return (
    <div className={`border-2 rounded-lg p-4 ${colorClasses[color]}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium opacity-80">{label}</p>
          <p className="text-3xl font-bold mt-1">{count}</p>
        </div>
        <span className="text-3xl opacity-60">{icon}</span>
      </div>
    </div>
  );
}
