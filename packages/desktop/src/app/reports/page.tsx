'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import { useCurrency } from '@/hooks/useCurrency';
import { OrderStatus } from '@rms/shared';
import {
  ChartBarIcon,
  DocumentArrowDownIcon,
  PrinterIcon,
  CalendarIcon,
} from '@heroicons/react/24/outline';

interface SalesReportData {
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
}

interface SalesReportResponse {
  status: string;
  data: {
    report: SalesReportData;
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
  };
}

interface Order {
  id: string;
  tableId: number;
  status: OrderStatus;
  total: number;
  createdAt: string;
  table: {
    name: string;
  };
}

interface OrderHistoryResponse {
  status: string;
  data: {
    orders: Order[];
    summary: {
      totalOrders: number;
      totalRevenue: number;
      averageOrderValue: number;
      statusBreakdown: Record<string, number>;
    };
  };
}

type ReportType = 'sales' | 'top-items' | 'order-history';
type GroupBy = 'day' | 'week' | 'month';

export default function ReportsPage() {
  const { formatCurrency } = useCurrency();
  const [reportType, setReportType] = useState<ReportType>('sales');
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [groupBy, setGroupBy] = useState<GroupBy>('day');
  const [orderStatus, setOrderStatus] = useState<string>('');
  const [tableId, setTableId] = useState<string>('');

  // Fetch sales report
  const { data: salesReport, isLoading: salesLoading } = useQuery<SalesReportResponse>({
    queryKey: ['sales-report', startDate, endDate, groupBy],
    queryFn: () =>
      apiClient.get<SalesReportResponse>(
        `/reports/sales?startDate=${startDate}&endDate=${endDate}&groupBy=${groupBy}`
      ),
    enabled: reportType === 'sales',
  });

  // Fetch top items report
  const { data: topItemsReport, isLoading: topItemsLoading } = useQuery<TopItemsResponse>({
    queryKey: ['top-items-report', startDate, endDate],
    queryFn: () =>
      apiClient.get<TopItemsResponse>(
        `/reports/top-items?limit=20&startDate=${startDate}&endDate=${endDate}`
      ),
    enabled: reportType === 'top-items',
  });

  // Fetch order history report
  const { data: orderHistoryReport, isLoading: orderHistoryLoading } =
    useQuery<OrderHistoryResponse>({
      queryKey: ['order-history-report', startDate, endDate, orderStatus, tableId],
      queryFn: () => {
        const params = new URLSearchParams({
          startDate,
          endDate,
        });
        if (orderStatus) params.append('status', orderStatus);
        if (tableId) params.append('tableId', tableId);
        return apiClient.get<OrderHistoryResponse>(`/reports/orders?${params.toString()}`);
      },
      enabled: reportType === 'order-history',
    });

  const isLoading = salesLoading || topItemsLoading || orderHistoryLoading;

  const handleExportCSV = () => {
    let csvContent = '';
    let filename = '';

    if (reportType === 'sales' && salesReport) {
      filename = `sales-report-${startDate}-to-${endDate}.csv`;
      csvContent = 'Date,Revenue,Orders\n';
      salesReport.data.report.dailyBreakdown?.forEach((day) => {
        csvContent += `${day.date},${day.revenue},${day.orders}\n`;
      });
    } else if (reportType === 'top-items' && topItemsReport) {
      filename = `top-items-${startDate}-to-${endDate}.csv`;
      csvContent = 'Item Name,Category,Quantity Sold,Revenue\n';
      topItemsReport.data.topItems.forEach((item) => {
        csvContent += `"${item.name}","${item.category}",${item.quantity},${item.revenue}\n`;
      });
    } else if (reportType === 'order-history' && orderHistoryReport) {
      filename = `order-history-${startDate}-to-${endDate}.csv`;
      csvContent = 'Order ID,Table,Status,Total,Date\n';
      orderHistoryReport.data.orders.forEach((order) => {
        csvContent += `${order.id},"${order.table.name}",${order.status},${order.total},${order.createdAt}\n`;
      });
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
  };

  const handleExportPDF = () => {
    window.print();
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Reports</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Generate and export business reports
          </p>
        </div>
        <div className="flex gap-2 print:hidden">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <DocumentArrowDownIcon className="w-5 h-5" />
            Export CSV
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <PrinterIcon className="w-5 h-5" />
            Print
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 print:hidden">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Report Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Report Type
            </label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value as ReportType)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="sales">Sales Report</option>
              <option value="top-items">Top Selling Items</option>
              <option value="order-history">Order History</option>
            </select>
          </div>

          {/* Start Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          {/* End Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              End Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          {/* Group By (for sales report) */}
          {reportType === 'sales' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Group By
              </label>
              <select
                value={groupBy}
                onChange={(e) => setGroupBy(e.target.value as GroupBy)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="day">Daily</option>
                <option value="week">Weekly</option>
                <option value="month">Monthly</option>
              </select>
            </div>
          )}

          {/* Order Status Filter (for order history) */}
          {reportType === 'order-history' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Status
                </label>
                <select
                  value={orderStatus}
                  onChange={(e) => setOrderStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">All Statuses</option>
                  <option value={OrderStatus.PENDING}>Pending</option>
                  <option value={OrderStatus.PREPARING}>Preparing</option>
                  <option value={OrderStatus.READY}>Ready</option>
                  <option value={OrderStatus.SERVED}>Served</option>
                  <option value={OrderStatus.PAID}>Paid</option>
                  <option value={OrderStatus.CANCELLED}>Cancelled</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Table ID
                </label>
                <input
                  type="number"
                  value={tableId}
                  onChange={(e) => setTableId(e.target.value)}
                  placeholder="All tables"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Report Content */}
      {isLoading ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="text-gray-500 dark:text-gray-400 mt-4">Loading report...</p>
        </div>
      ) : (
        <>
          {reportType === 'sales' && salesReport && (
            <SalesReportView report={salesReport.data.report} formatCurrency={formatCurrency} />
          )}
          {reportType === 'top-items' && topItemsReport && (
            <TopItemsReportView
              items={topItemsReport.data.topItems}
              formatCurrency={formatCurrency}
            />
          )}
          {reportType === 'order-history' && orderHistoryReport && (
            <OrderHistoryReportView
              data={orderHistoryReport.data}
              formatCurrency={formatCurrency}
            />
          )}
        </>
      )}
    </div>
  );
}

// Sales Report View Component
function SalesReportView({
  report,
  formatCurrency,
}: {
  report: SalesReportData;
  formatCurrency: (amount: number) => string;
}) {
  const maxRevenue = Math.max(...(report.dailyBreakdown?.map((d) => d.revenue) || [0]));

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Revenue</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
            {formatCurrency(report.totalRevenue)}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Orders</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
            {report.totalOrders}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
            Average Order Value
          </p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
            {formatCurrency(report.averageOrderValue)}
          </p>
        </div>
      </div>

      {/* Revenue Trend Chart */}
      {report.dailyBreakdown && report.dailyBreakdown.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
            Revenue Trend
          </h2>
          <div className="space-y-3">
            {report.dailyBreakdown.map((day, index) => (
              <div key={index} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">
                    {new Date(day.date).toLocaleDateString()}
                  </span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {formatCurrency(day.revenue)} ({day.orders} orders)
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-primary-600 h-2 rounded-full transition-all"
                    style={{ width: `${(day.revenue / maxRevenue) * 100}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Payment Method Breakdown */}
      {report.paymentMethodBreakdown && report.paymentMethodBreakdown.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
            Payment Methods
          </h2>
          <div className="space-y-4">
            {report.paymentMethodBreakdown.map((method, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
              >
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">{method.method}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {method.count} transactions
                  </p>
                </div>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {formatCurrency(method.total)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Top Items Report View Component
function TopItemsReportView({
  items,
  formatCurrency,
}: {
  items: TopSellingItem[];
  formatCurrency: (amount: number) => string;
}) {
  const maxQuantity = Math.max(...items.map((item) => item.quantity));

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          Top Selling Items
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Showing {items.length} items
        </p>
      </div>
      <div className="p-6">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">
                  Rank
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">
                  Item Name
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">
                  Category
                </th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">
                  Quantity Sold
                </th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">
                  Revenue
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">
                  Popularity
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr
                  key={index}
                  className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                >
                  <td className="py-3 px-4">
                    <span className="text-2xl font-bold text-gray-400 dark:text-gray-500">
                      #{index + 1}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <p className="font-medium text-gray-900 dark:text-white">{item.name}</p>
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {item.category}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span className="font-medium text-gray-900 dark:text-white">
                      {item.quantity}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {formatCurrency(item.revenue)}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-primary-600 h-2 rounded-full"
                        style={{ width: `${(item.quantity / maxQuantity) * 100}%` }}
                      ></div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// Order History Report View Component
function OrderHistoryReportView({
  data,
  formatCurrency,
}: {
  data: OrderHistoryResponse['data'];
  formatCurrency: (amount: number) => string;
}) {
  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Orders</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
            {data.summary.totalOrders}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Revenue</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
            {formatCurrency(data.summary.totalRevenue)}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
            Average Order Value
          </p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
            {formatCurrency(data.summary.averageOrderValue)}
          </p>
        </div>
      </div>

      {/* Status Breakdown */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Status Breakdown
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {Object.entries(data.summary.statusBreakdown).map(([status, count]) => (
            <div key={status} className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{count}</p>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 capitalize">
                {status.toLowerCase()}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Order Details</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Showing {data.orders.length} orders
          </p>
        </div>
        <div className="p-6">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">
                    Order ID
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">
                    Table
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">
                    Status
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">
                    Total
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.orders.map((order) => (
                  <tr
                    key={order.id}
                    className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                  >
                    <td className="py-3 px-4">
                      <span className="font-mono text-sm text-gray-900 dark:text-white">
                        {order.id.slice(0, 8)}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-sm text-gray-900 dark:text-white">
                        {order.table.name}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={order.status} />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="font-medium text-gray-900 dark:text-white">
                        {formatCurrency(order.total)}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {new Date(order.createdAt).toLocaleString()}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

// Status Badge Component
function StatusBadge({ status }: { status: OrderStatus }) {
  const statusColors: Record<OrderStatus, string> = {
    [OrderStatus.PENDING]: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    [OrderStatus.PREPARING]: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    [OrderStatus.READY]: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
    [OrderStatus.SERVED]: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    [OrderStatus.PAID]: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
    [OrderStatus.CANCELLED]: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[status]}`}
    >
      {status}
    </span>
  );
}
