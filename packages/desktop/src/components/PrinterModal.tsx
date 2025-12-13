'use client';

import { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import { XMarkIcon } from '@heroicons/react/24/outline';

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
  ipAddress?: string;
  port?: number;
  vendorId?: string;
  productId?: string;
  serialPath?: string;
  isActive: boolean;
  categoryMappings: PrinterCategory[];
}

interface PrinterModalProps {
  printer: Printer | null;
  categories: Category[];
  onClose: () => void;
  onSuccess: () => void;
  onError: (message: string) => void;
}

export default function PrinterModal({
  printer,
  categories,
  onClose,
  onSuccess,
  onError,
}: PrinterModalProps) {
  const [name, setName] = useState('');
  const [type, setType] = useState<'network' | 'usb' | 'serial'>('network');
  const [address, setAddress] = useState('');
  const [port, setPort] = useState('9100');
  const [vendorId, setVendorId] = useState('');
  const [productId, setProductId] = useState('');
  const [serialPath, setSerialPath] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Populate form when editing
  useEffect(() => {
    if (printer) {
      setName(printer.name);
      setType(printer.type);
      setAddress(printer.ipAddress || '');
      setPort(String(printer.port || 9100));
      setVendorId(printer.vendorId || '');
      setProductId(printer.productId || '');
      setSerialPath(printer.serialPath || '');
      setIsActive(printer.isActive);
      setSelectedCategories(printer.categoryMappings.map((m) => m.categoryId));
    }
  }, [printer]);

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiClient.post('/printers', data);
    },
    onSuccess: () => {
      setIsSaving(false);
      onSuccess();
    },
    onError: (error: any) => {
      onError(error.message || 'Failed to create printer');
      setIsSaving(false);
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiClient.patch(`/printers/${printer?.id}`, data);
    },
    onSuccess: () => {
      setIsSaving(false);
      onSuccess();
    },
    onError: (error: any) => {
      onError(error.message || 'Failed to update printer');
      setIsSaving(false);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    // Validation
    if (!name.trim()) {
      onError('Printer name is required');
      setIsSaving(false);
      return;
    }

    if (type === 'network' && !address.trim()) {
      onError('IP address is required for network printers');
      setIsSaving(false);
      return;
    }

    if (type === 'usb' && (!vendorId.trim() || !productId.trim())) {
      onError('Vendor ID and Product ID are required for USB printers');
      setIsSaving(false);
      return;
    }

    if (type === 'serial' && !serialPath.trim()) {
      onError('Serial path is required for serial printers');
      setIsSaving(false);
      return;
    }

    const data: any = {
      name: name.trim(),
      type,
      isActive,
      categoryIds: selectedCategories,
    };

    if (type === 'network') {
      data.ipAddress = address.trim();
      data.port = parseInt(port) || 9100;
    }

    if (printer) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const handleCategoryToggle = (categoryId: string) => {
    setSelectedCategories((prev) =>
      prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {printer ? 'Edit Printer' : 'Add New Printer'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Printer Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Printer Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Kitchen Printer, Bar Printer"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                       bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                       focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          {/* Printer Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Printer Type <span className="text-red-500">*</span>
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as 'network' | 'usb' | 'serial')}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                       bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                       focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="network">Network Printer</option>
              <option value="usb">USB Printer</option>
              <option value="serial">Serial Printer</option>
            </select>
          </div>

          {/* Network Printer Settings */}
          {type === 'network' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  IP Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="192.168.1.100"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                           bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                           focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Port
                </label>
                <input
                  type="text"
                  value={port}
                  onChange={(e) => setPort(e.target.value)}
                  placeholder="9100"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                           bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                           focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          )}

          {/* USB Printer Settings */}
          {type === 'usb' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Vendor ID <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={vendorId}
                  onChange={(e) => setVendorId(e.target.value)}
                  placeholder="0x04b8"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                           bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                           focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Product ID <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={productId}
                  onChange={(e) => setProductId(e.target.value)}
                  placeholder="0x0e15"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                           bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                           focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
            </div>
          )}

          {/* Serial Printer Settings */}
          {type === 'serial' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Serial Port <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={serialPath}
                onChange={(e) => setSerialPath(e.target.value)}
                placeholder="COM1 or /dev/ttyUSB0"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                         focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
          )}

          {/* Active Status */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="isActive"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded 
                       focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 
                       focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
            />
            <label htmlFor="isActive" className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              Printer is active and ready to use
            </label>
          </div>

          {/* Category Assignment */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Assign Categories
            </label>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
              Select which menu categories should print on this printer
            </p>
            <div className="max-h-48 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-lg p-3 space-y-2">
              {categories.length === 0 ? (
                <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">
                  No categories available. Create categories in Menu Management first.
                </p>
              ) : (
                categories.map((category) => (
                  <div key={category.id} className="flex items-center">
                    <input
                      type="checkbox"
                      id={`category-${category.id}`}
                      checked={selectedCategories.includes(category.id)}
                      onChange={() => handleCategoryToggle(category.id)}
                      className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded 
                               focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 
                               focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                    />
                    <label
                      htmlFor={`category-${category.id}`}
                      className="ml-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer"
                    >
                      {category.name}
                    </label>
                  </div>
                ))
              )}
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="flex gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-6 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 
                     dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg 
                     font-semibold transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSaving}
            className="flex-1 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg 
                     font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? 'Saving...' : printer ? 'Update Printer' : 'Add Printer'}
          </button>
        </div>
      </div>
    </div>
  );
}
