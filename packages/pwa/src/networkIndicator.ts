import { networkStatus } from './networkStatus';

class NetworkIndicator {
  private indicator: HTMLElement | null = null;
  private unsubscribe: (() => void) | null = null;

  init(): void {
    this.createIndicator();
    this.unsubscribe = networkStatus.subscribe((isOnline) => {
      this.updateIndicator(isOnline);
    });

    // Set initial state
    this.updateIndicator(networkStatus.isOnline);
  }

  private createIndicator(): void {
    if (typeof document === 'undefined') return;

    this.indicator = document.createElement('div');
    this.indicator.id = 'network-indicator';
    this.indicator.className = 'fixed top-0 left-0 right-0 z-50 transition-transform duration-300 transform -translate-y-full';
    this.indicator.innerHTML = `
      <div class="bg-red-500 text-white px-4 py-2 text-center text-sm font-medium flex items-center justify-center gap-2">
        <svg class="w-4 h-4 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414"></path>
        </svg>
        <span>You are offline. Orders will be queued.</span>
      </div>
    `;
    document.body.appendChild(this.indicator);
  }

  private updateIndicator(isOnline: boolean): void {
    if (!this.indicator) return;

    if (isOnline) {
      // Hide indicator
      this.indicator.style.transform = 'translateY(-100%)';
      
      // Show brief "back online" message
      const onlineMessage = document.createElement('div');
      onlineMessage.className = 'fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg text-sm font-medium flex items-center gap-2 animate-slide-down';
      onlineMessage.innerHTML = `
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
        </svg>
        <span>Back online</span>
      `;
      document.body.appendChild(onlineMessage);

      setTimeout(() => {
        onlineMessage.style.animation = 'slideUp 0.3s ease-in';
        setTimeout(() => onlineMessage.remove(), 300);
      }, 3000);
    } else {
      // Show indicator
      this.indicator.style.transform = 'translateY(0)';
    }
  }

  destroy(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
    }
    if (this.indicator) {
      this.indicator.remove();
    }
  }
}

// Add animations
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideDown {
      from {
        transform: translate(-50%, -100%);
        opacity: 0;
      }
      to {
        transform: translate(-50%, 0);
        opacity: 1;
      }
    }
    @keyframes slideUp {
      from {
        transform: translate(-50%, 0);
        opacity: 1;
      }
      to {
        transform: translate(-50%, -100%);
        opacity: 0;
      }
    }
    .animate-slide-down {
      animation: slideDown 0.3s ease-out;
    }
  `;
  document.head.appendChild(style);
}

export const networkIndicator = new NetworkIndicator();
