'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  PrinterIcon,
  CheckCircleIcon,
  XCircleIcon,
  Cog6ToothIcon,
} from '@heroicons/react/24/outline';
import PrinterModal from '@/components/PrinterModal';

interface Category {
  id: string;
  name: string;
}

interface PrinterCategory {
  id: string;
  categoryId: string;
  category: Category;
}

interface Printer {
  id: string;
  name: string;
  type: 'network' | 'usb' | 'serial';
  address?: string;
  port?: string;
  vendorId?: string;
  productId?: string;
  serialPath?: string;
  isActive: boolean;
  isConnected?: boolean;
  categoryMappings: PrinterCategory[];
}

interface PrinterManagementProps {
  onSuccess: () => void;
  onError: (message: string) => void;
}

export default function PrinterManagement({ onSuccess, onError }: PrinterManagementProps) {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPrinter, setEditingPrinter] = useState<Printer | null>(null);
  const [deletingPrinterId, setDeletingPrinterId] = useState<string | null>(null);

  // Fetch all printers (only refetch on mount or manual trigger)
  const { data: printersResponse, isLoading, refetch } = useQuery<any>({
    queryKey: ['printers'],
    queryFn: async () => {
      const response = await apiClient.get('/printers');
      return response;
    },
    refetchOnMount: 'always',
    staleTime: Infinity, // Keep data fresh, only refetch manually
  });

  // Separate query for live status updates (background polling)
  const { data: statusResponse } = useQuery<any>({
    queryKey: ['printer-status'],
    queryFn: async () => {
      const response = await apiClient.get('/printers/status/all');
      return response;
    },
    refetchInterval: 5000, // Poll every 5 seconds for connection status only
    refetchIntervalInBackground: true, // Continue even when not focused
    staleTime: 0,
    // Don't show loading states, just update data silently in background
    notifyOnChangeProps: ['data'],
  });

  const statusMap = statusResponse?.data?.status || {};
  
  // Merge printer data with live connection status
  const printers = (printersResponse?.data?.printers || []).map((printer: Printer) => ({
    ...printer,
    isConnected: statusMap[printer.id] ?? printer.isConnected,
  }));

  // Fetch all categories
  const { data: categoriesResponse } = useQuery<any>({
    queryKey: ['categories'],
    queryFn: () => apiClient.get('/categories'),
  });

  const categories = categoriesResponse?.data?.categories || [];

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (printerId: string) => {
      return apiClient.delete(`/printers/${printerId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['printers'] });
      setDeletingPrinterId(null);
      onSuccess();
    },
    onError: (error: any) => {
      onError(error.message || 'Failed to delete printer');
      setDeletingPrinterId(null);
    },
  });

  // Test print mutation
  const testPrintMutation = useMutation({
    mutationFn: async (printerId: string) => {
      return apiClient.post(`/printers/${printerId}/test`);
    },
    onSuccess: () => {
      onSuccess();
    },
    onError: (error: any) => {
      onError(error.message || 'Test print failed');
    },
  });

  const handleAddPrinter = () => {
    setEditingPrinter(null);
    setIsModalOpen(true);
  };

  const handleEditPrinter = (printer: Printer) => {
    setEditingPrinter(printer);
    setIsModalOpen(true);
  };

  const handleDeletePrinter = (printerId: string) => {
    if (window.confirm('Are you sure you want to delete this printer?')) {
      setDeletingPrinterId(printerId);
      deleteMutation.mutate(printerId);
    }
  };

  const handleTestPrint = (printerId: string) => {
    testPrintMutation.mutate(printerId);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingPrinter(null);
  };

  const handleModalSuccess = async () => {
    // Force immediate refetch
    await refetch();
    handleModalClose();
    onSuccess();
  };

  const getPrinterTypeLabel = (type: string) => {
    switch (type) {
      case 'network':
        return 'Network';
      case 'usb':
        return 'USB';
      case 'serial':
        return 'Serial';
      default:
        return type;
    }
  };

  const getPrinterConnectionInfo = (printer: Printer) => {
    switch (printer.type) {
      case 'network':
        return `${printer.address}:${printer.port || '9100'}`;
      case 'usb':
        return `VID: ${printer.vendorId}, PID: ${printer.productId}`;
      case 'serial':
        return printer.serialPath || 'N/A';
      default:
        return 'N/A';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600 dark:text-gray-400">Loading printers...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Printer Management
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Add and configure multiple printers for different categories
          </p>
        </div>
        <button
          onClick={handleAddPrinter}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 
                   text-white rounded-lg font-semibold transition-colors"
        >
          <PlusIcon className="w-5 h-5" />
          Add Printer
        </button>
      </div>

      {/* Info Box */}
      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
        <p className="text-sm text-blue-800 dark:text-blue-400">
          <strong>Multi-Printer Setup:</strong> Configure different printers for different menu categories. 
          When an order is placed, items will automatically print on the appropriate printer based on their category.
        </p>
      </div>

      {/* Printers List */}
      {printers.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 dark:bg-gray-900 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-700">
          <PrinterIcon className="w-12 h-12 mx-auto text-gray-400 mb-4" />
          <p className="text-gray-500 dark:text-gray-400 mb-4">No printers configured yet</p>
          <button
            onClick={handleAddPrinter}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 
                     text-white rounded-lg font-semibold transition-colors"
          >
            <PlusIcon className="w-5 h-5" />
            Add Your First Printer
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {printers.map((printer: Printer) => (
            <div
              key={printer.id}
              className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg transition-shadow"
            >
              {/* Printer Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`relative p-2 rounded-lg ${
                    printer.isActive 
                      ? 'bg-green-100 dark:bg-green-900/30' 
                      : 'bg-gray-100 dark:bg-gray-900/30'
                  }`}>
                    <PrinterIcon className={`w-6 h-6 ${
                      printer.isActive 
                        ? 'text-green-600 dark:text-green-400' 
                        : 'text-gray-400'
                    }`} />
                    {/* Connection status indicator */}
                    {printer.isActive && (
                      <span className={`absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-white dark:border-gray-800 ${
                        printer.isConnected 
                          ? 'bg-green-500 animate-pulse' 
                          : 'bg-red-500'
                      }`} title={printer.isConnected ? 'Connected' : 'Disconnected'} />
                    )}
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                      {printer.name}
                      {printer.isActive && (
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          printer.isConnected 
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' 
                            : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                        }`}>
                          {printer.isConnected ? 'Connected' : 'Offline'}
                        </span>
                      )}
                    </h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {getPrinterTypeLabel(printer.type)} Printer
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {printer.isActive ? (
                    <CheckCircleIcon className="w-5 h-5 text-green-600 dark:text-green-400" />
                  ) : (
                    <XCircleIcon className="w-5 h-5 text-gray-400" />
                  )}
                </div>
              </div>

              {/* Connection Info */}
              <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Connection</p>
                <p className="text-sm font-mono text-gray-900 dark:text-white">
                  {getPrinterConnectionInfo(printer)}
                </p>
              </div>

              {/* Assigned Categories */}
              <div className="mb-4">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Assigned Categories</p>
                {printer.categoryMappings.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {printer.categoryMappings.map((mapping) => (
                      <span
                        key={mapping.id}
                        className="px-2 py-1 text-xs font-medium bg-blue-100 dark:bg-blue-900/30 
                                 text-blue-800 dark:text-blue-400 rounded"
                      >
                        {mapping.category.name}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 dark:text-gray-500 italic">
                    No categories assigned
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => handleTestPrint(printer.id)}
                  disabled={!printer.isActive || testPrintMutation.isPending}
                  className="flex-1 px-3 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 
                           dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg 
                           text-sm font-medium transition-colors disabled:opacity-50 
                           disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <PrinterIcon className="w-4 h-4" />
                  Test Print
                </button>
                <button
                  onClick={() => handleEditPrinter(printer)}
                  className="flex-1 px-3 py-2 bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/30 
                           dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-400 rounded-lg 
                           text-sm font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <Cog6ToothIcon className="w-4 h-4" />
                  Configure
                </button>
                <button
                  onClick={() => handleDeletePrinter(printer.id)}
                  disabled={deletingPrinterId === printer.id}
                  className="px-3 py-2 bg-red-100 hover:bg-red-200 dark:bg-red-900/30 
                           dark:hover:bg-red-900/50 text-red-700 dark:text-red-400 rounded-lg 
                           text-sm font-medium transition-colors disabled:opacity-50 
                           disabled:cursor-not-allowed"
                >
                  <TrashIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Printer Modal */}
      {isModalOpen && (
        <PrinterModal
          printer={editingPrinter}
          categories={categories}
          onClose={handleModalClose}
          onSuccess={handleModalSuccess}
          onError={onError}
        />
      )}
    </div>
  );
}
