import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from '@rms/shared';

interface UIState {
  // Theme
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  setTheme: (theme: 'light' | 'dark') => void;

  // Sidebar
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;

  // Current User
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      // Theme state
      theme: 'light',
      toggleTheme: () =>
        set((state) => {
          const newTheme = state.theme === 'light' ? 'dark' : 'light';
          // Update document class for Tailwind dark mode
          if (typeof document !== 'undefined') {
            if (newTheme === 'dark') {
              document.documentElement.classList.add('dark');
            } else {
              document.documentElement.classList.remove('dark');
            }
          }
          return { theme: newTheme };
        }),
      setTheme: (theme) =>
        set(() => {
          // Update document class for Tailwind dark mode
          if (typeof document !== 'undefined') {
            if (theme === 'dark') {
              document.documentElement.classList.add('dark');
            } else {
              document.documentElement.classList.remove('dark');
            }
          }
          return { theme };
        }),

      // Sidebar state
      sidebarCollapsed: false,
      toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),

      // User state
      currentUser: null,
      setCurrentUser: (user) => set({ currentUser: user }),
    }),
    {
      name: 'rms-ui-storage',
      partialize: (state) => ({
        theme: state.theme,
        sidebarCollapsed: state.sidebarCollapsed,
        currentUser: state.currentUser,
      }),
    }
  )
);
