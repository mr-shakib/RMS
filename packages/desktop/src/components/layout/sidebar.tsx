'use client';

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
  X
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

  const handleLogout = () => {
    // Clear any stored session/token
    localStorage.clear();
    sessionStorage.clear();
    // Redirect to login
    window.location.href = '/login';
  };

  const handleExitApp = async () => {
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
  };

  return (
    <div className="flex h-full w-28 flex-col bg-gray-900">
      {/* Logo */}
      <div className="flex h-20 items-center justify-center border-b border-gray-800">
        <h1 className="text-3xl">🍽️</h1>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-3 px-2 py-6">
        {navigation.map((item) => {
          const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
          const Icon = item.icon;
          
          return (
            <Link
              key={item.name}
              href={item.href}
              title={item.name}
              className={`
                group flex flex-col items-center justify-center p-4 text-xs font-medium transition-colors
                ${isActive
                  ? 'bg-gray-800 text-white'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                }
              `}
            >
              <Icon
                className={`
                  h-8 w-8 mb-2
                  ${isActive ? 'text-white' : 'text-gray-400 group-hover:text-white'}
                `}
              />
              <span className="text-[11px]">{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* User Info & Actions */}
      <div className="border-t border-gray-800">
        {/* User Info */}
        <Link
          href="/settings"
          title="User Profile"
          className="group flex flex-col items-center justify-center p-3 text-gray-400 hover:bg-gray-800 hover:text-white transition-colors border-b border-gray-800"
        >
          <div className="relative">
            <div className="h-9 w-9 rounded-full bg-gray-700 flex items-center justify-center mb-1 group-hover:bg-gray-600 transition-colors">
              <User className="h-4 w-4" />
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-green-500 border-2 border-gray-900"></div>
          </div>
          <span className="text-[9px] mt-1 font-medium">Admin</span>
        </Link>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          title="Logout"
          className="w-full group flex flex-col items-center justify-center p-3 text-gray-400 hover:bg-orange-900/20 hover:text-orange-400 transition-colors border-b border-gray-800"
        >
          <LogOut className="h-6 w-6 mb-1" />
          <span className="text-[9px] font-medium">Logout</span>
        </button>

        {/* Exit App Button */}
        <button
          onClick={handleExitApp}
          title="Exit Application"
          className="w-full group flex flex-col items-center justify-center p-3 text-gray-400 hover:bg-red-900/20 hover:text-red-400 transition-colors"
        >
          <X className="h-6 w-6 mb-1" />
          <span className="text-[9px] font-medium">Exit</span>
        </button>
      </div>
    </div>
  );
}
