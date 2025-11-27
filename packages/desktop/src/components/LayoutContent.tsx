'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from './Sidebar';
import ProtectedRoute from './ProtectedRoute';
import { useUIStore } from '@/store/uiStore';

export default function LayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const theme = useUIStore((state) => state.theme);

  // Initialize theme on mount
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  // Check if we're on the login or setup page
  const isLoginPage = pathname === '/login';
  const isSetupPage = pathname === '/setup';

  // If on login or setup page, don't show sidebar and don't protect
  if (isLoginPage || isSetupPage) {
    return <div className="min-h-screen bg-gray-50 dark:bg-gray-900">{children}</div>;
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
