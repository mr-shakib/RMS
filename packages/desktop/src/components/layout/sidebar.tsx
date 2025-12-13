'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  UtensilsCrossed, 
  ShoppingCart, 
  Layers,
  ShoppingBag,
  Receipt, 
  Settings,
  User,
  LogOut,
  X,
  AlertTriangle
} from 'lucide-react';

const navigation = [
  { name: 'Tables', href: '/tables', icon: Layers },
  { name: 'Takeaway', href: '/billing', icon: ShoppingBag },
  { name: 'Menu', href: '/menu', icon: UtensilsCrossed },
  { name: 'Payment', href: '/payment', icon: Receipt },
  { name: 'Orders', href: '/orders', icon: ShoppingCart },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  const handleLogout = () => {
    // Clear any stored session/token
    localStorage.clear();
    sessionStorage.clear();
    // Redirect to login
    window.location.href = '/login';
  };

  const handleExitClick = () => {
    setShowExitConfirm(true);
  };

  const handleExitConfirm = async () => {
    // Call Electron IPC to quit the app
    if (typeof window !== 'undefined' && (window as any).electron) {
      try {
        await (window as any).electron.quitApp();
      } catch (error) {
        console.error('Failed to quit app:', error);
        // Fallback: close the window
        window.close();
      }
    }
    setShowExitConfirm(false);
  };

  const handleExitCancel = () => {
    setShowExitConfirm(false);
  };

  return (
    <>
      <div className="flex h-full w-32 flex-col bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800">
        {/* Logo */}
        <div className="flex h-20 items-center justify-center border-b border-gray-200 dark:border-gray-800">
          <h1 className="text-4xl">🍽️</h1>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-2 px-2.5 py-6">
          {navigation.map((item) => {
            const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
            const Icon = item.icon;
            
            return (
              <Link
                key={item.name}
                href={item.href}
                title={item.name}
                className={`
                  group flex flex-col items-center justify-center p-3 rounded-lg text-sm font-medium transition-all border-2
                  ${isActive
                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white border-gray-300 dark:border-gray-700'
                  }
                `}
              >
                <Icon
                  className={`
                    h-8 w-8 mb-1.5
                    ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white'}
                  `}
                />
                <span className="text-[11px] text-center leading-tight font-medium">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* User Info & Actions */}
        <div className="border-t border-gray-200 dark:border-gray-800 px-2.5 py-3 space-y-2">
          {/* User Info */}
          <Link
            href="/settings"
            title="User Profile"
            className="group flex flex-col items-center justify-center p-3 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white transition-colors rounded-lg border-2 border-gray-300 dark:border-gray-700"
          >
            <div className="relative">
              <div className="h-10 w-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center mb-1 group-hover:bg-gray-300 dark:group-hover:bg-gray-600 transition-colors">
                <User className="h-5 w-5" />
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-green-500 border-2 border-white dark:border-gray-900"></div>
            </div>
            <span className="text-[10px] mt-1 font-medium">Admin</span>
          </Link>

          {/* Logout Button
          <button
            onClick={handleLogout}
            title="Logout"
            className="w-full group flex flex-col items-center justify-center p-3 text-gray-600 dark:text-gray-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 hover:text-orange-600 dark:hover:text-orange-400 transition-colors rounded-lg border-2 border-gray-300 dark:border-gray-700 hover:border-orange-400 dark:hover:border-orange-600"
          >
            <LogOut className="h-6 w-6 mb-1" />
            <span className="text-[10px] font-medium">Logout</span>
          </button> */}

          {/* Exit App Button */}
          <button
            onClick={handleExitClick}
            title="Exit Application"
            className="w-full group flex flex-col items-center justify-center p-3 text-gray-600 dark:text-gray-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 transition-colors rounded-lg border-2 border-gray-300 dark:border-gray-700 hover:border-red-400 dark:hover:border-red-600"
          >
            <X className="h-6 w-6 mb-1" />
            <span className="text-[10px] font-medium">Exit</span>
          </button>
        </div>
      </div>

      {/* Exit Confirmation Modal */}
      {showExitConfirm && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full mx-4 p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Exit Application?
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                  Are you sure you want to exit? This will close the application completely.
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
    </>
  );
}
