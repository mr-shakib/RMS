'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useUIStore } from '@/store/uiStore';
import { Role } from '@rms/shared';
import {
  HomeIcon,
  ShoppingBagIcon,
  TableCellsIcon,
  BookOpenIcon,
  CreditCardIcon,
  CogIcon,
  TvIcon,
  ArrowRightOnRectangleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  SunIcon,
  MoonIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: Role[];
}

const navItems: NavItem[] = [
  {
    name: 'Tables',
    href: '/tables',
    icon: TableCellsIcon,
    roles: [Role.ADMIN, Role.WAITER],
  },
  {
    name: 'Orders',
    href: '/orders',
    icon: ShoppingBagIcon,
    roles: [Role.ADMIN, Role.WAITER],
  },
  {
    name: 'Menu',
    href: '/menu',
    icon: BookOpenIcon,
    roles: [Role.ADMIN, Role.WAITER],
  },
  {
    name: 'Take Away',
    href: '/billing',
    icon: CreditCardIcon,
    roles: [Role.ADMIN, Role.WAITER],
  },
  // {
  //   name: 'Reports',
  //   href: '/reports',
  //   icon: ChartBarIcon,
  //   roles: [Role.ADMIN, Role.WAITER],
  // },
  {
    name: 'Kitchen Display',
    href: '/kds',
    icon: TvIcon,
    roles: [Role.ADMIN, Role.CHEF],
  },
  {
    name: 'Settings',
    href: '/settings',
    icon: CogIcon,
    roles: [Role.ADMIN],
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { currentUser, theme, toggleTheme } = useUIStore();

  // Filter nav items based on user role
  const visibleNavItems = currentUser
    ? navItems.filter((item) => item.roles.includes(currentUser.role))
    : [];

  const handleLogout = () => {
    // Logout logic will be implemented in task 7.2
    localStorage.removeItem('token');
    window.location.href = '/login';
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
              key={item.name}
              href={item.href}
              className={`flex flex-col items-center justify-center gap-2 px-3 py-4 rounded-lg transition-colors border ${
                isActive
                  ? 'bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 border-primary-300 dark:border-primary-700'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border-gray-200 dark:border-gray-600'
              }`}
            >
              <Icon className="w-8 h-8 flex-shrink-0" />
              <span className="text-xs font-medium text-center leading-tight">{item.name}</span>
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
            {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
          </span>
        </button>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
        >
          <ArrowRightOnRectangleIcon className="w-4 h-4 flex-shrink-0" />
          <span className="text-xs">Logout</span>
        </button>
      </div>
    </aside>
  );
}
