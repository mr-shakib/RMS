'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/apiClient';

interface NetworkInfo {
  lanIPs: string[];
  port: string;
  urls: string[];
}

export default function SetupWizard() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [networkInfo, setNetworkInfo] = useState<NetworkInfo | null>(null);
  const [checkingSetup, setCheckingSetup] = useState(true);

  // Check if setup is already completed
  useEffect(() => {
    const checkSetup = async () => {
      try {
        const response = await apiClient.get<{ status: string; data: { setupCompleted: boolean } }>(
          '/setup/status',
          { requiresAuth: false }
        );

        if (response.data.setupCompleted) {
          // Setup already completed, redirect to login
          router.push('/login');
        } else {
          setCheckingSetup(false);
        }
      } catch (err) {
        console.error('Failed to check setup status:', err);
        setCheckingSetup(false);
      }
    };

    checkSetup();
  }, [router]);

  // Form state
  const [businessName, setBusinessName] = useState('My Restaurant');
  const [businessAddress, setBusinessAddress] = useState('');
  const [taxPercentage, setTaxPercentage] = useState('10');
  const [currency, setCurrency] = useState('USD');

  const [adminUsername, setAdminUsername] = useState('admin');
  const [adminPassword, setAdminPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [numberOfTables, setNumberOfTables] = useState('10');
  const [tableNamingConvention, setTableNamingConvention] = useState<'numbered' | 'lettered'>('numbered');

  const [printerType, setPrinterType] = useState<'' | 'network' | 'usb' | 'serial'>('');
  const [printerAddress, setPrinterAddress] = useState('');

  const totalSteps = 5;

  // Show loading while checking setup status
  if (checkingSetup) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Checking setup status...</p>
        </div>
      </div>
    );
  }

  const handleNext = async () => {
    setError(null);

    // Validation for each step
    if (currentStep === 1) {
      if (!businessName.trim()) {
        setError('Business name is required');
        return;
      }
    }

    if (currentStep === 2) {
      if (!adminUsername.trim()) {
        setError('Admin username is required');
        return;
      }
      if (!adminPassword) {
        setError('Admin password is required');
        return;
      }
      if (adminPassword.length < 6) {
        setError('Password must be at least 6 characters long');
        return;
      }
      if (adminPassword !== confirmPassword) {
        setError('Passwords do not match');
        return;
      }
    }

    if (currentStep === 3) {
      const numTables = parseInt(numberOfTables);
      if (isNaN(numTables) || numTables < 1 || numTables > 100) {
        setError('Number of tables must be between 1 and 100');
        return;
      }
    }

    if (currentStep === 5) {
      // Fetch network info before showing step 5
      try {
        const response = await apiClient.get<{ status: string; data: NetworkInfo }>(
          '/setup/network-info',
          { requiresAuth: false }
        );
        setNetworkInfo(response.data);
      } catch (err) {
        console.error('Failed to fetch network info:', err);
      }
    }

    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      setError(null);
    }
  };

  const handleSkipSetup = async () => {
    setLoading(true);
    setError(null);

    try {
      await apiClient.post(
        '/setup/complete',
        { skipSetup: true },
        { requiresAuth: false }
      );

      // Redirect to login
      router.push('/login');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to skip setup');
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteSetup = async () => {
    setLoading(true);
    setError(null);

    try {
      await apiClient.post(
        '/setup/complete',
        {
          businessName,
          businessAddress,
          taxPercentage: parseFloat(taxPercentage),
          currency,
          adminUsername,
          adminPassword,
          numberOfTables: parseInt(numberOfTables),
          tableNamingConvention,
          printerType,
          printerAddress,
          skipSetup: false,
        },
        { requiresAuth: false }
      );

      // Redirect to login
      router.push('/login');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to complete setup');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Welcome to Restaurant Management System
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Let's set up your restaurant in just a few steps
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Step {currentStep} of {totalSteps}
            </span>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {Math.round((currentStep / totalSteps) * 100)}% Complete
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(currentStep / totalSteps) * 100}%` }}
            />
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-red-800 dark:text-red-200 text-sm">{error}</p>
          </div>
        )}

        {/* Step Content */}
        <div className="mb-8">
          {/* Step 1: Business Information */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Business Information
              </h2>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Business Name *
                </label>
                <input
                  type="text"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="My Restaurant"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Business Address
                </label>
                <textarea
                  value={businessAddress}
                  onChange={(e) => setBusinessAddress(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="123 Main Street, City, State 12345"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Tax Percentage (%)
                  </label>
                  <input
                    type="number"
                    value={taxPercentage}
                    onChange={(e) => setTaxPercentage(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    min="0"
                    max="100"
                    step="0.1"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Currency
                  </label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                    <option value="INR">INR (₹)</option>
                    <option value="JPY">JPY (¥)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Admin User */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Create Admin Account
              </h2>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Admin Username *
                </label>
                <input
                  type="text"
                  value={adminUsername}
                  onChange={(e) => setAdminUsername(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="admin"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Password * (minimum 6 characters)
                </label>
                <input
                  type="password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Enter password"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Confirm Password *
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Confirm password"
                />
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  This account will have full access to all system features. Make sure to use a strong password.
                </p>
              </div>
            </div>
          )}

          {/* Step 3: Table Setup */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Table Setup
              </h2>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Number of Tables
                </label>
                <input
                  type="number"
                  value={numberOfTables}
                  onChange={(e) => setNumberOfTables(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  min="1"
                  max="100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Table Naming Convention
                </label>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="numbered"
                      checked={tableNamingConvention === 'numbered'}
                      onChange={(e) => setTableNamingConvention(e.target.value as 'numbered')}
                      className="mr-2"
                    />
                    <span className="text-gray-700 dark:text-gray-300">
                      Numbered (Table 1, Table 2, Table 3...)
                    </span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="lettered"
                      checked={tableNamingConvention === 'lettered'}
                      onChange={(e) => setTableNamingConvention(e.target.value as 'lettered')}
                      className="mr-2"
                    />
                    <span className="text-gray-700 dark:text-gray-300">
                      Lettered (Table A, Table B, Table C...)
                    </span>
                  </label>
                </div>
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  QR codes will be automatically generated for each table. You can add or remove tables later from the Tables page.
                </p>
              </div>
            </div>
          )}

          {/* Step 4: Printer Configuration */}
          {currentStep === 4 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Printer Configuration (Optional)
              </h2>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Printer Type
                </label>
                <select
                  value={printerType}
                  onChange={(e) => setPrinterType(e.target.value as any)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="">None (Skip for now)</option>
                  <option value="network">Network Printer</option>
                  <option value="usb">USB Printer</option>
                  <option value="serial">Serial Printer</option>
                </select>
              </div>

              {printerType === 'network' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Printer IP Address
                  </label>
                  <input
                    type="text"
                    value={printerAddress}
                    onChange={(e) => setPrinterAddress(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    placeholder="192.168.1.100"
                  />
                </div>
              )}

              {printerType === 'usb' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    USB Vendor ID / Product ID
                  </label>
                  <input
                    type="text"
                    value={printerAddress}
                    onChange={(e) => setPrinterAddress(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    placeholder="0x04b8:0x0e15"
                  />
                </div>
              )}

              {printerType === 'serial' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Serial Port
                  </label>
                  <input
                    type="text"
                    value={printerAddress}
                    onChange={(e) => setPrinterAddress(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    placeholder="COM1 or /dev/ttyUSB0"
                  />
                </div>
              )}

              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  You can configure or test your printer later from the Settings page.
                </p>
              </div>
            </div>
          )}

          {/* Step 5: Network Information */}
          {currentStep === 5 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Network Information
              </h2>

              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <p className="text-sm text-green-800 dark:text-green-200 mb-2">
                  Setup is almost complete! Here's your network information for iPad access:
                </p>
              </div>

              {networkInfo && networkInfo.lanIPs.length > 0 ? (
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Server URLs (for iPad/PWA access):
                    </label>
                    <div className="space-y-2">
                      {networkInfo.urls.map((url, index) => (
                        <div
                          key={index}
                          className="p-3 bg-gray-100 dark:bg-gray-700 rounded-lg font-mono text-sm"
                        >
                          {url}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                    <p className="text-sm text-blue-800 dark:text-blue-200">
                      Use any of these URLs to access the customer ordering system from iPads on the same network. Scan the QR codes from the Tables page to get started.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">
                    No network interfaces detected. Make sure your computer is connected to a network.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between">
          <button
            onClick={handleSkipSetup}
            disabled={loading}
            className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 disabled:opacity-50"
          >
            Skip Setup
          </button>

          <div className="flex gap-3">
            {currentStep > 1 && (
              <button
                onClick={handleBack}
                disabled={loading}
                className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
              >
                Back
              </button>
            )}

            {currentStep < totalSteps ? (
              <button
                onClick={handleNext}
                disabled={loading}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                Next
              </button>
            ) : (
              <button
                onClick={handleCompleteSetup}
                disabled={loading}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Completing...
                  </>
                ) : (
                  'Complete Setup'
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
