'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Sidebar from './Sidebar';
import ProtectedRoute from './ProtectedRoute';
import { useUIStore } from '@/store/uiStore';
import { apiClient } from '@/lib/apiClient';

export default function LayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const theme = useUIStore((state) => state.theme);
  const [setupChecked, setSetupChecked] = useState(false);

  // Initialize theme on mount
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  // Check setup status on mount
  useEffect(() => {
    const checkSetupStatus = async () => {
      // Skip check if already on setup page
      if (pathname === '/setup') {
        setSetupChecked(true);
        return;
      }

      try {
        const response = await apiClient.get<{ status: string; data: { setupCompleted: boolean } }>(
          '/setup/status',
          { requiresAuth: false }
        );

        if (!response.data.setupCompleted) {
          // Redirect to setup if not completed
          router.push('/setup');
        } else {
          setSetupChecked(true);
        }
      } catch (error) {
        console.error('Failed to check setup status:', error);
        // If check fails, assume setup is needed
        setSetupChecked(true);
      }
    };

    checkSetupStatus();
  }, [pathname, router]);

  // Check if we're on the login or setup page
  const isLoginPage = pathname === '/login';
  const isSetupPage = pathname === '/setup';

  // If on login or setup page, don't show sidebar and don't protect
  if (isLoginPage || isSetupPage) {
    return <div className="min-h-screen bg-gray-50 dark:bg-gray-900">{children}</div>;
  }

  // Show loading while checking setup status
  if (!setupChecked) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  // Protect all other routes
  return (
    <ProtectedRoute>
      <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
        <Sidebar />
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </ProtectedRoute>
  );
}
