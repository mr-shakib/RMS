type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastOptions {
  type: ToastType;
  message: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

class ToastManager {
  private container: HTMLElement | null = null;

  constructor() {
    this.createContainer();
  }

  private createContainer(): void {
    if (typeof document === 'undefined') return;

    this.container = document.createElement('div');
    this.container.id = 'toast-container';
    this.container.className = 'fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm';
    document.body.appendChild(this.container);
  }

  private getIcon(type: ToastType): string {
    const icons = {
      success: `<svg class="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
      </svg>`,
      error: `<svg class="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
      </svg>`,
      warning: `<svg class="w-5 h-5 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
      </svg>`,
      info: `<svg class="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
      </svg>`,
    };
    return icons[type];
  }

  private getBackgroundClass(type: ToastType): string {
    const classes = {
      success: 'bg-green-50 border-green-200',
      error: 'bg-red-50 border-red-200',
      warning: 'bg-yellow-50 border-yellow-200',
      info: 'bg-blue-50 border-blue-200',
    };
    return classes[type];
  }

  show(options: ToastOptions): void {
    if (!this.container) return;

    const { type, message, duration = 4000, action } = options;
    const toastId = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const toast = document.createElement('div');
    toast.id = toastId;
    toast.className = `flex items-start gap-3 p-4 rounded-lg border shadow-lg animate-slide-in ${this.getBackgroundClass(type)}`;
    toast.style.animation = 'slideIn 0.3s ease-out';

    toast.innerHTML = `
      <div class="flex-shrink-0 mt-0.5">${this.getIcon(type)}</div>
      <div class="flex-1 min-w-0">
        <p class="text-sm text-gray-700">${message}</p>
        ${action ? `<button class="mt-2 text-sm font-medium text-blue-600 hover:underline" data-action="true">${action.label}</button>` : ''}
      </div>
      <button class="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors" data-close="true">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
        </svg>
      </button>
    `;

    // Add event listeners
    const closeBtn = toast.querySelector('[data-close="true"]');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.remove(toastId));
    }

    if (action) {
      const actionBtn = toast.querySelector('[data-action="true"]');
      if (actionBtn) {
        actionBtn.addEventListener('click', () => {
          action.onClick();
          this.remove(toastId);
        });
      }
    }

    this.container.appendChild(toast);

    // Auto-remove after duration
    if (duration !== Infinity) {
      setTimeout(() => this.remove(toastId), duration);
    }
  }

  private remove(toastId: string): void {
    const toast = document.getElementById(toastId);
    if (toast) {
      toast.style.animation = 'slideOut 0.3s ease-in';
      setTimeout(() => toast.remove(), 300);
    }
  }

  success(message: string): void {
    this.show({ type: 'success', message });
  }

  error(message: string, action?: ToastOptions['action']): void {
    this.show({ type: 'error', message, duration: 6000, action });
  }

  warning(message: string): void {
    this.show({ type: 'warning', message, duration: 5000 });
  }

  info(message: string): void {
    this.show({ type: 'info', message });
  }
}

// Add animations to document
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideIn {
      from {
        transform: translateX(100%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }
    @keyframes slideOut {
      from {
        transform: translateX(0);
        opacity: 1;
      }
      to {
        transform: translateX(100%);
        opacity: 0;
      }
    }
  `;
  document.head.appendChild(style);
}

export const toast = new ToastManager();
