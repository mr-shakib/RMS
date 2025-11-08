import { create } from 'zustand';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ToastStore {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
  clearAll: () => void;
}

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  addToast: (toast) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    set((state) => ({
      toasts: [...state.toasts, { ...toast, id }],
    }));
  },
  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  },
  clearAll: () => set({ toasts: [] }),
}));

// Helper functions for common toast patterns
export const toast = {
  success: (message: string, title?: string) => {
    useToastStore.getState().addToast({
      type: 'success',
      title,
      message,
      duration: 4000,
    });
  },
  error: (message: string, title?: string, action?: Toast['action']) => {
    useToastStore.getState().addToast({
      type: 'error',
      title,
      message,
      duration: 6000,
      action,
    });
  },
  warning: (message: string, title?: string) => {
    useToastStore.getState().addToast({
      type: 'warning',
      title,
      message,
      duration: 5000,
    });
  },
  info: (message: string, title?: string) => {
    useToastStore.getState().addToast({
      type: 'info',
      title,
      message,
      duration: 4000,
    });
  },
};
