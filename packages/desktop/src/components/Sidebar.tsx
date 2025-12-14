'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useUIStore } from '@/store/uiStore';
import { useTranslation } from '@/hooks/useTranslation';
import { Role } from '@rms/shared';
import {
  HomeIcon,
  ShoppingBagIcon,
  TableCellsIcon,
  BookOpenIcon,
  CreditCardIcon,
  ShoppingCartIcon,
  CogIcon,
  TvIcon,
  ArrowRightOnRectangleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  SunIcon,
  MoonIcon,
  ChartBarIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';

interface NavItem {
  translationKey: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: Role[];
}

const navItems: NavItem[] = [
  {
    translationKey: 'sidebar.tables',
    href: '/tables',
    icon: TableCellsIcon,
    roles: [Role.ADMIN, Role.WAITER],
  },
  {
    translationKey: 'sidebar.orders',
    href: '/orders',
    icon: ShoppingCartIcon,
    roles: [Role.ADMIN, Role.WAITER],
  },
  {
    translationKey: 'sidebar.menu',
    href: '/menu',
    icon: BookOpenIcon,
    roles: [Role.ADMIN, Role.WAITER],
  },
  {
    translationKey: 'sidebar.takeAway',
    href: '/billing',
    icon: ShoppingBagIcon,
    roles: [Role.ADMIN, Role.WAITER],
  },
  {
    translationKey: 'sidebar.payment',
    href: '/payment',
    icon: CreditCardIcon,
    roles: [Role.ADMIN, Role.WAITER],
  },
  // {
  //   translationKey: 'sidebar.reports',
  //   href: '/reports',
  //   icon: ChartBarIcon,
  //   roles: [Role.ADMIN, Role.WAITER],
  // },
  // {
  //   translationKey: 'sidebar.kitchenDisplay',
  //   href: '/kds',
  //   icon: TvIcon,
  //   roles: [Role.ADMIN, Role.CHEF],
  // },
  {
    translationKey: 'sidebar.settings',
    href: '/settings',
    icon: CogIcon,
    roles: [Role.ADMIN],
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { currentUser, theme, toggleTheme } = useUIStore();
  const { t } = useTranslation();
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  // Filter nav items based on user role
  const visibleNavItems = currentUser
    ? navItems.filter((item) => item.roles.includes(currentUser.role))
    : [];

  const handleExitClick = () => {
    setShowExitConfirm(true);
  };

  const handleExitConfirm = async () => {
    try {
      if (window.electron?.quitApp) {
        console.log('Quitting application...');
        await window.electron.quitApp();
      } else {
        console.warn('Electron API not available - running in browser mode');
      }
    } catch (error) {
      console.error('Failed to quit app:', error);
    }
    setShowExitConfirm(false);
  };

  const handleExitCancel = () => {
    setShowExitConfirm(false);
  };

  return (
    <aside className="w-48 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
      {/* Header */}
      <div className="h-16 flex items-center justify-center px-4 border-b border-gray-200 dark:border-gray-700">
        <img 
          src="/logo.jpg" 
          alt="SAKE SUSHI" 
          className="w-full h-14 object-contain rounded-lg"
          onError={(e) => {
            // Fallback to text if image fails to load
            e.currentTarget.style.display = 'none';
            const parent = e.currentTarget.parentElement;
            if (parent) {
              const textElement = document.createElement('h1');
              textElement.className = 'text-lg font-bold text-gray-900 dark:text-white';
              textElement.textContent = 'RMS';
              parent.appendChild(textElement);
            }
          }}
        />
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-3 overflow-y-auto">
        {visibleNavItems.map((item) => {
          const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center gap-2 px-3 py-4 rounded-lg transition-colors border ${
                isActive
                  ? 'bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 border-primary-300 dark:border-primary-700'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border-gray-200 dark:border-gray-600'
              }`}
            >
              <Icon className="w-8 h-8 flex-shrink-0" />
              <span className="text-xs font-medium text-center leading-tight">{t(item.translationKey)}</span>
            </Link>
          );
        })}
      </nav>

      {/* User Profile & Actions */}
      <div className="border-t border-gray-200 dark:border-gray-700 p-2 space-y-1">
        {/* User Profile */}
        {currentUser && (
          <div className="flex items-center gap-2 px-2 py-1.5">
            <div className="w-8 h-8 rounded-full bg-primary-500 flex items-center justify-center text-white font-bold flex-shrink-0">
              <span className="text-sm">
                {currentUser.username.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-gray-900 dark:text-white truncate">
                {currentUser.username}
              </p>
              <p className="text-[10px] text-gray-500 dark:text-gray-400 capitalize">
                {currentUser.role.toLowerCase()}
              </p>
            </div>
          </div>
        )}

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          {theme === 'dark' ? (
            <SunIcon className="w-4 h-4 flex-shrink-0" />
          ) : (
            <MoonIcon className="w-4 h-4 flex-shrink-0" />
          )}
          <span className="text-xs">
            {t(theme === 'dark' ? 'sidebar.lightMode' : 'sidebar.darkMode')}
          </span>
        </button>

        {/* Exit App Button */}
        <button
          onClick={handleExitClick}
          className="w-full flex items-center justify-center gap-2 px-3 py-2.5 mt-2 rounded-lg font-semibold text-sm text-white bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98]"
        >
          <XCircleIcon className="w-5 h-5 flex-shrink-0" />
          <span>Exit App</span>
        </button>
      </div>

      {/* Exit Confirmation Modal */}
      {showExitConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0">
                <ExclamationTriangleIcon className="w-10 h-10 text-yellow-500" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Exit Application
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                  Are you sure you want to exit the application? All unsaved data will be lost.
                </p>
                <div className="flex gap-3 justify-end">
                  <button
                    onClick={handleExitCancel}
                    className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleExitConfirm}
                    className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
                  >
                    Exit App
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
