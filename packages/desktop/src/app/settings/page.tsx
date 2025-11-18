'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import { useUIStore } from '@/store/uiStore';
import PrinterManagement from '@/components/PrinterManagement';
import { 
  CheckCircleIcon, 
  ExclamationTriangleIcon,
  ArrowUpTrayIcon,
  ArrowDownTrayIcon,
  PrinterIcon,
  ServerIcon,
  QrCodeIcon,
  SwatchIcon,
  BuildingStorefrontIcon,
  DocumentArrowDownIcon,
  DocumentArrowUpIcon
} from '@heroicons/react/24/outline';

type TabType = 'business' | 'printer' | 'server' | 'backup';

interface SettingsResponse {
  status: string;
  data: {
    settings: Record<string, string>;
  };
}

interface BackupResponse {
  status: string;
  data: {
    backupFile: string;
    backupPath: string;
    timestamp: string;
  };
  message: string;
}

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabType>('business');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Fetch all settings
  const { data: settingsResponse, isLoading } = useQuery<SettingsResponse>({
    queryKey: ['settings'],
    queryFn: () => apiClient.get<SettingsResponse>('/settings'),
  });

  const settings = settingsResponse?.data.settings || {};

  const showSuccessMessage = () => {
    setSaveSuccess(true);
    setSaveError(null);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const showErrorMessage = (error: string) => {
    setSaveError(error);
    setSaveSuccess(false);
    setTimeout(() => setSaveError(null), 5000);
  };

  const tabs = [
    { id: 'business' as TabType, label: 'Business Info', icon: BuildingStorefrontIcon },
    { id: 'printer' as TabType, label: 'Printer', icon: PrinterIcon },
    { id: 'server' as TabType, label: 'Server & QR', icon: ServerIcon },
    { id: 'backup' as TabType, label: 'Backup & Theme', icon: SwatchIcon },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Settings</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Configure system settings and preferences
          </p>
        </div>
        
        {/* Success/Error Messages */}
        {saveSuccess && (
          <div className="flex items-center gap-2 px-4 py-2 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-lg">
            <CheckCircleIcon className="w-5 h-5" />
            <span className="text-sm font-medium">Settings saved successfully!</span>
          </div>
        )}
        {saveError && (
          <div className="flex items-center gap-2 px-4 py-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg">
            <ExclamationTriangleIcon className="w-5 h-5" />
            <span className="text-sm font-medium">{saveError}</span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors
                  ${
                    activeTab === tab.id
                      ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
              >
                <Icon className="w-5 h-5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              <span className="ml-3 text-gray-600 dark:text-gray-400">Loading settings...</span>
            </div>
          ) : (
            <>
              {activeTab === 'business' && (
                <BusinessSettings 
                  settings={settings} 
                  onSuccess={showSuccessMessage}
                  onError={showErrorMessage}
                />
              )}
              {activeTab === 'printer' && (
                <PrinterManagement
                  onSuccess={showSuccessMessage}
                  onError={showErrorMessage}
                />
              )}
              {activeTab === 'server' && (
                <ServerSettings 
                  settings={settings}
                  onSuccess={showSuccessMessage}
                  onError={showErrorMessage}
                />
              )}
              {activeTab === 'backup' && (
                <BackupThemeSettings 
                  settings={settings}
                  onSuccess={showSuccessMessage}
                  onError={showErrorMessage}
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// Business Settings Component
interface SettingsTabProps {
  settings: Record<string, string>;
  onSuccess: () => void;
  onError: (error: string) => void;
}

function BusinessSettings({ settings, onSuccess, onError }: SettingsTabProps) {
  const queryClient = useQueryClient();
  const [businessName, setBusinessName] = useState(settings.BUSINESS_NAME || '');
  const [businessAddress, setBusinessAddress] = useState(settings.BUSINESS_ADDRESS || '');
  const [logoUrl, setLogoUrl] = useState(settings.BUSINESS_LOGO_URL || '');
  const [taxPercentage, setTaxPercentage] = useState(settings.TAX_PERCENTAGE || '10');
  const [currency, setCurrency] = useState(settings.CURRENCY || 'USD');
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);

  useEffect(() => {
    setBusinessName(settings.BUSINESS_NAME || '');
    setBusinessAddress(settings.BUSINESS_ADDRESS || '');
    setLogoUrl(settings.BUSINESS_LOGO_URL || '');
    setTaxPercentage(settings.TAX_PERCENTAGE || '10');
    setCurrency(settings.CURRENCY || 'USD');
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: async (data: Record<string, string>) => {
      return apiClient.patch('/settings', { settings: data });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      onSuccess();
    },
    onError: (error: any) => {
      onError(error.message || 'Failed to save settings');
    },
  });

  const handleSave = async () => {
    const tax = parseFloat(taxPercentage);
    if (isNaN(tax) || tax < 0 || tax > 100) {
      onError('Please enter a valid tax percentage between 0 and 100');
      return;
    }

    setIsSaving(true);
    try {
      await saveMutation.mutateAsync({
        BUSINESS_NAME: businessName,
        BUSINESS_ADDRESS: businessAddress,
        TAX_PERCENTAGE: taxPercentage,
        CURRENCY: currency,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      onError('Please upload a valid image file (JPEG, PNG, GIF, or WebP)');
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      onError('Image file size must be less than 5MB');
      return;
    }

    setIsUploadingLogo(true);
    try {
      const formData = new FormData();
      formData.append('logo', file);

      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/settings/upload-logo', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to upload logo');
      }

      const data = await response.json();
      setLogoUrl(data.data.logoUrl);
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      onSuccess();
    } catch (error: any) {
      onError(error.message || 'Failed to upload logo');
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const handleRemoveLogo = async () => {
    if (!confirm('Are you sure you want to remove the logo?')) {
      return;
    }

    setIsUploadingLogo(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/settings/logo', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to remove logo');
      }

      setLogoUrl('');
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      onSuccess();
    } catch (error: any) {
      onError(error.message || 'Failed to remove logo');
    } finally {
      setIsUploadingLogo(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Business Information
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          Configure your business details that will appear on receipts and reports
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Business Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Business Name
          </label>
          <input
            type="text"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            placeholder="My Restaurant"
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                     bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                     focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Currency */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Currency
          </label>
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                     bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                     focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="USD">USD ($)</option>
            <option value="EUR">EUR (€)</option>
            <option value="GBP">GBP (£)</option>
            <option value="INR">INR (₹)</option>
            <option value="JPY">JPY (¥)</option>
          </select>
        </div>

        {/* Business Address */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Business Address
          </label>
          <textarea
            value={businessAddress}
            onChange={(e) => setBusinessAddress(e.target.value)}
            placeholder="123 Main Street, City, State, ZIP"
            rows={3}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                     bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                     focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Tax Percentage */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Tax Percentage (%)
          </label>
          <input
            type="number"
            min="0"
            max="100"
            step="0.1"
            value={taxPercentage}
            onChange={(e) => setTaxPercentage(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                     bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                     focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Business Logo Upload */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Business Logo
          </label>
          
          {/* Current Logo Preview */}
          {logoUrl && (
            <div className="mb-3 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-4">
                <img 
                  src={`http://localhost:5000${logoUrl}`}
                  alt="Business Logo" 
                  className="h-20 w-20 object-contain rounded border border-gray-300 dark:border-gray-600"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Current Logo</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {logoUrl}
                  </p>
                </div>
                <button
                  onClick={handleRemoveLogo}
                  disabled={isUploadingLogo}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg
                           font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Remove
                </button>
              </div>
            </div>
          )}

          {/* Upload New Logo */}
          <div className="relative">
            <input
              type="file"
              id="logo-upload"
              accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
              onChange={handleLogoUpload}
              disabled={isUploadingLogo}
              className="hidden"
            />
            <label
              htmlFor="logo-upload"
              className={`flex items-center justify-center gap-2 w-full px-4 py-3 border-2 border-dashed
                       rounded-lg cursor-pointer transition-colors
                       ${isUploadingLogo 
                         ? 'border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-800 cursor-not-allowed'
                         : 'border-gray-300 dark:border-gray-600 hover:border-blue-500 dark:hover:border-blue-400 bg-white dark:bg-gray-800'
                       }`}
            >
              <ArrowUpTrayIcon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {isUploadingLogo ? 'Uploading...' : logoUrl ? 'Change Logo' : 'Upload Logo'}
              </span>
            </label>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            Supported formats: JPEG, PNG, GIF, WebP (Max size: 5MB)
          </p>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg
                   font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSaving ? 'Saving...' : 'Save Business Settings'}
        </button>
      </div>
    </div>
  );
}

// Printer Settings Component
function PrinterSettings({ settings, onSuccess, onError }: SettingsTabProps) {
  const queryClient = useQueryClient();
  const [printerType, setPrinterType] = useState(settings.PRINTER_TYPE || 'network');
  const [printerAddress, setPrinterAddress] = useState(settings.PRINTER_ADDRESS || '');
  const [printerVendorId, setPrinterVendorId] = useState(settings.PRINTER_VENDOR_ID || '');
  const [printerProductId, setPrinterProductId] = useState(settings.PRINTER_PRODUCT_ID || '');
  const [printerPort, setPrinterPort] = useState(settings.PRINTER_PORT || '9100');
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [printerStatus, setPrinterStatus] = useState<'connected' | 'disconnected' | 'unknown'>('unknown');

  useEffect(() => {
    setPrinterType(settings.PRINTER_TYPE || 'network');
    setPrinterAddress(settings.PRINTER_ADDRESS || '');
    setPrinterVendorId(settings.PRINTER_VENDOR_ID || '');
    setPrinterProductId(settings.PRINTER_PRODUCT_ID || '');
    setPrinterPort(settings.PRINTER_PORT || '9100');
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: async (data: Record<string, string>) => {
      return apiClient.patch('/settings', { settings: data });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      onSuccess();
    },
    onError: (error: any) => {
      onError(error.message || 'Failed to save printer settings');
    },
  });

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const settingsData: Record<string, string> = {
        PRINTER_TYPE: printerType,
      };

      if (printerType === 'network') {
        if (!printerAddress) {
          onError('Printer IP address is required for network printers');
          return;
        }
        settingsData.PRINTER_ADDRESS = printerAddress;
        settingsData.PRINTER_PORT = printerPort;
      } else if (printerType === 'usb') {
        if (!printerVendorId || !printerProductId) {
          onError('Vendor ID and Product ID are required for USB printers');
          return;
        }
        settingsData.PRINTER_VENDOR_ID = printerVendorId;
        settingsData.PRINTER_PRODUCT_ID = printerProductId;
      }

      await saveMutation.mutateAsync(settingsData);
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestPrint = async () => {
    setIsTesting(true);
    try {
      // Call test print endpoint (to be implemented in server)
      await apiClient.post('/printer/test');
      setPrinterStatus('connected');
      onSuccess();
    } catch (error: any) {
      setPrinterStatus('disconnected');
      onError(error.message || 'Test print failed');
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Printer Configuration
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          Configure your ESC/POS receipt printer for order tickets and customer receipts
        </p>
      </div>

      {/* Printer Status */}
      <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Printer Status:
          </span>
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
            printerStatus === 'connected' 
              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
              : printerStatus === 'disconnected'
              ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
              : 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
          }`}>
            {printerStatus === 'connected' ? 'Connected' : printerStatus === 'disconnected' ? 'Disconnected' : 'Unknown'}
          </span>
        </div>
      </div>

      {/* Printer Type */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Printer Type
        </label>
        <select
          value={printerType}
          onChange={(e) => setPrinterType(e.target.value)}
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
      {printerType === 'network' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              IP Address
            </label>
            <input
              type="text"
              value={printerAddress}
              onChange={(e) => setPrinterAddress(e.target.value)}
              placeholder="192.168.1.100"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                       bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                       focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Port
            </label>
            <input
              type="text"
              value={printerPort}
              onChange={(e) => setPrinterPort(e.target.value)}
              placeholder="9100"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                       bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                       focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      )}

      {/* USB Printer Settings */}
      {printerType === 'usb' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Vendor ID
            </label>
            <input
              type="text"
              value={printerVendorId}
              onChange={(e) => setPrinterVendorId(e.target.value)}
              placeholder="0x04b8"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                       bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                       focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Product ID
            </label>
            <input
              type="text"
              value={printerProductId}
              onChange={(e) => setPrinterProductId(e.target.value)}
              placeholder="0x0e15"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                       bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                       focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      )}

      {/* Serial Printer Settings */}
      {printerType === 'serial' && (
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <p className="text-sm text-blue-800 dark:text-blue-400">
            Serial printer configuration will be available in a future update. Please use Network or USB printer for now.
          </p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={handleTestPrint}
          disabled={isTesting}
          className="px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg
                   font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                   flex items-center gap-2"
        >
          <PrinterIcon className="w-5 h-5" />
          {isTesting ? 'Testing...' : 'Test Print'}
        </button>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg
                   font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSaving ? 'Saving...' : 'Save Printer Settings'}
        </button>
      </div>
    </div>
  );
}

// Server and QR Settings Component
function ServerSettings({ settings, onSuccess, onError }: SettingsTabProps) {
  const queryClient = useQueryClient();
  const [serverPort, setServerPort] = useState(settings.SERVER_PORT || '5000');
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [serverInfo, setServerInfo] = useState<{ localhost: string; lanIp: string } | null>(null);

  useEffect(() => {
    setServerPort(settings.SERVER_PORT || '5000');
    
    // Get server info from Electron
    if (typeof window !== 'undefined' && window.electron) {
      window.electron.getServerInfo().then((info) => {
        const port = info.port || 5000;
        setServerInfo({
          localhost: `http://localhost:${port}`,
          lanIp: info.url || `http://localhost:${port}`,
        });
      });
    }
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: async (data: Record<string, string>) => {
      return apiClient.patch('/settings', { settings: data });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      onSuccess();
    },
    onError: (error: any) => {
      onError(error.message || 'Failed to save server settings');
    },
  });

  const handleSave = async () => {
    const port = parseInt(serverPort, 10);
    if (isNaN(port) || port < 1024 || port > 65535) {
      onError('Please enter a valid port number between 1024 and 65535');
      return;
    }

    setIsSaving(true);
    try {
      await saveMutation.mutateAsync({
        SERVER_PORT: serverPort,
      });
      onError('Server port updated. Please restart the application for changes to take effect.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleGenerateQRCodes = async () => {
    setIsGenerating(true);
    try {
      // Call the regenerate-all endpoint
      await apiClient.post('/tables/qr/regenerate-all');
      onSuccess();
    } catch (error: any) {
      onError(error.message || 'Failed to generate QR codes');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadQRCodes = async () => {
    setIsDownloading(true);
    try {
      // Download all QR codes as PDF using the new endpoint
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/tables/qr/download-all', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to download QR codes PDF');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'all-tables-qr.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      onSuccess();
    } catch (error: any) {
      onError(error.message || 'Failed to download QR codes');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Server & QR Code Settings
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          Configure server settings and manage table QR codes
        </p>
      </div>

      {/* Server Information */}
      <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          Current Server URLs
        </h4>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600 dark:text-gray-400">Localhost:</span>
            <code className="px-3 py-1 bg-white dark:bg-gray-800 rounded text-sm font-mono text-gray-900 dark:text-white">
              {serverInfo?.localhost || 'Loading...'}
            </code>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600 dark:text-gray-400">LAN IP:</span>
            <code className="px-3 py-1 bg-white dark:bg-gray-800 rounded text-sm font-mono text-gray-900 dark:text-white">
              {serverInfo?.lanIp || 'Loading...'}
            </code>
          </div>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">
          Use the LAN IP address to access the PWA from iPads on the same network
        </p>
      </div>

      {/* Server Port Configuration */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Server Port
        </label>
        <div className="flex gap-3">
          <input
            type="number"
            min="1024"
            max="65535"
            value={serverPort}
            onChange={(e) => setServerPort(e.target.value)}
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                     bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                     focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg
                     font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? 'Saving...' : 'Update Port'}
          </button>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
          Requires application restart to take effect
        </p>
      </div>

      {/* QR Code Management */}
      <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
          QR Code Management
        </h4>
        <div className="flex gap-3">
          <button
            onClick={handleGenerateQRCodes}
            disabled={isGenerating}
            className="flex-1 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg
                     font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                     flex items-center justify-center gap-2"
          >
            <QrCodeIcon className="w-5 h-5" />
            {isGenerating ? 'Generating...' : 'Generate All QR Codes'}
          </button>
          <button
            onClick={handleDownloadQRCodes}
            disabled={isDownloading}
            className="flex-1 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg
                     font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                     flex items-center justify-center gap-2"
          >
            <ArrowDownTrayIcon className="w-5 h-5" />
            {isDownloading ? 'Downloading...' : 'Download QR Codes'}
          </button>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">
          Generate QR codes for all tables or download them as a PDF for printing
        </p>
      </div>
    </div>
  );
}

// Backup and Theme Settings Component
function BackupThemeSettings({ settings, onSuccess, onError }: SettingsTabProps) {
  const { theme, setTheme } = useUIStore();
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [selectedFile, setSelectedFile] = useState<string>('');
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const createBackupMutation = useMutation({
    mutationFn: async () => {
      // Get server info to construct the correct URL
      let baseUrl = 'http://localhost:5000';
      if (typeof window !== 'undefined' && window.electron) {
        try {
          const serverInfo = await window.electron.getServerInfo();
          baseUrl = serverInfo.serverUrl || serverInfo.url || `http://localhost:${serverInfo.port}`;
        } catch (error) {
          console.warn('Failed to get server info, using default URL');
        }
      }

      // Create a link element to trigger download
      const link = document.createElement('a');
      link.href = `${baseUrl}/api/settings/backup`;
      link.download = `restaurant-backup-${new Date().toISOString().replace(/[:.]/g, '-')}.db`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      return { success: true };
    },
    onSuccess: () => {
      onSuccess();
    },
    onError: (error: any) => {
      onError(error.message || 'Failed to create backup');
    },
  });

  const restoreBackupMutation = useMutation({
    mutationFn: async (backupFileName: string) => {
      return apiClient.post('/settings/restore', { backupFileName });
    },
    onSuccess: () => {
      onSuccess();
      alert('Database restored successfully. Please restart the application.');
    },
    onError: (error: any) => {
      onError(error.message || 'Failed to restore backup');
    },
  });

  const handleCreateBackup = async () => {
    setIsCreatingBackup(true);
    try {
      await createBackupMutation.mutateAsync();
    } finally {
      setIsCreatingBackup(false);
    }
  };

  const handleRestoreBackup = async () => {
    if (!selectedFile) {
      onError('Please enter a backup file name');
      return;
    }

    if (!confirm('Are you sure you want to restore from this backup? Current data will be backed up first.')) {
      return;
    }

    setIsRestoring(true);
    try {
      await restoreBackupMutation.mutateAsync(selectedFile);
    } finally {
      setIsRestoring(false);
    }
  };

  const handleResetToDefaults = async () => {
    if (!showResetConfirm) {
      setShowResetConfirm(true);
      return;
    }

    try {
      // Reset to default settings
      await apiClient.patch('/settings', {
        settings: {
          BUSINESS_NAME: 'My Restaurant',
          BUSINESS_ADDRESS: '',
          BUSINESS_LOGO_URL: '',
          TAX_PERCENTAGE: '10',
          CURRENCY: 'USD',
          PRINTER_TYPE: 'network',
          PRINTER_ADDRESS: '',
          SERVER_PORT: '5000',
        },
      });
      setShowResetConfirm(false);
      onSuccess();
    } catch (error: any) {
      onError(error.message || 'Failed to reset settings');
    }
  };

  const handleThemeChange = (newTheme: 'light' | 'dark' | 'system') => {
    if (newTheme === 'system') {
      // Detect system preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setTheme(prefersDark ? 'dark' : 'light');
    } else {
      setTheme(newTheme);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Backup & Theme Settings
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          Manage database backups and customize the application appearance
        </p>
      </div>

      {/* Database Backup Section */}
      <div className="p-6 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
          Database Backup
        </h4>
        
        {/* Create Backup */}
        <div className="mb-6">
          <button
            onClick={handleCreateBackup}
            disabled={isCreatingBackup}
            className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg
                     font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                     flex items-center justify-center gap-2"
          >
            <DocumentArrowDownIcon className="w-5 h-5" />
            {isCreatingBackup ? 'Creating Backup...' : 'Create Backup'}
          </button>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            Creates a backup of your database with timestamp
          </p>
        </div>

        {/* Restore Backup */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Restore from Backup
          </label>
          <div className="flex gap-3">
            <input
              type="text"
              value={selectedFile}
              onChange={(e) => setSelectedFile(e.target.value)}
              placeholder="restaurant-backup-2024-01-01.db"
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                       bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                       focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              onClick={handleRestoreBackup}
              disabled={isRestoring}
              className="px-6 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg
                       font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                       flex items-center gap-2"
            >
              <DocumentArrowUpIcon className="w-5 h-5" />
              {isRestoring ? 'Restoring...' : 'Restore'}
            </button>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            Enter the backup file name from the backups directory
          </p>
        </div>
      </div>

      {/* Theme Settings Section */}
      <div className="p-6 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
          Theme Settings
        </h4>
        
        <div className="grid grid-cols-3 gap-4">
          <button
            onClick={() => handleThemeChange('light')}
            className={`p-4 rounded-lg border-2 transition-all ${
              theme === 'light'
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
            }`}
          >
            <div className="flex flex-col items-center gap-2">
              <div className="w-12 h-12 rounded-lg bg-white border-2 border-gray-300 flex items-center justify-center">
                <svg className="w-6 h-6 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <span className="text-sm font-medium text-gray-900 dark:text-white">Light</span>
            </div>
          </button>

          <button
            onClick={() => handleThemeChange('dark')}
            className={`p-4 rounded-lg border-2 transition-all ${
              theme === 'dark'
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
            }`}
          >
            <div className="flex flex-col items-center gap-2">
              <div className="w-12 h-12 rounded-lg bg-gray-800 border-2 border-gray-600 flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              </div>
              <span className="text-sm font-medium text-gray-900 dark:text-white">Dark</span>
            </div>
          </button>

          <button
            onClick={() => handleThemeChange('system')}
            className={`p-4 rounded-lg border-2 transition-all border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600`}
          >
            <div className="flex flex-col items-center gap-2">
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-white to-gray-800 border-2 border-gray-400 flex items-center justify-center">
                <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <span className="text-sm font-medium text-gray-900 dark:text-white">System</span>
            </div>
          </button>
        </div>

        <p className="text-xs text-gray-500 dark:text-gray-400 mt-4">
          Choose your preferred theme or use system settings
        </p>
      </div>

      {/* Reset to Defaults */}
      <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
        {!showResetConfirm ? (
          <button
            onClick={handleResetToDefaults}
            className="w-full px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg
                     font-semibold transition-colors flex items-center justify-center gap-2"
          >
            <ExclamationTriangleIcon className="w-5 h-5" />
            Reset to Default Settings
          </button>
        ) : (
          <div className="space-y-3">
            <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
              <p className="text-sm text-red-800 dark:text-red-400 font-medium">
                Are you sure you want to reset all settings to defaults?
              </p>
              <p className="text-xs text-red-600 dark:text-red-500 mt-1">
                This action cannot be undone. Your current settings will be lost.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="flex-1 px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg
                         font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleResetToDefaults}
                className="flex-1 px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg
                         font-semibold transition-colors"
              >
                Yes, Reset Settings
              </button>
            </div>
          </div>
        )}
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-3 text-center">
          Resets all settings to their default values
        </p>
      </div>
    </div>
  );
}
