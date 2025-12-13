// Build: 2025-12-13 13:30
import './styles.css';
import { SelectionPage } from './selectionPage';
import { MenuPage } from './menuPage';
import { CartPage } from './cartPage';
import { StatusPage } from './statusPage';
import { cart } from './cart';

type Page = 'selection' | 'menu' | 'cart' | 'status';

class App {
  private currentPage: Page = 'selection';
  private container: HTMLElement;
  private currentPageInstance: SelectionPage | MenuPage | CartPage | StatusPage | null = null;

  constructor() {
    const appElement = document.getElementById('app');
    if (!appElement) {
      throw new Error('App element not found');
    }
    this.container = appElement;
    this.init();
  }

  private async init(): Promise<void> {
    try {
      const APP_VERSION = '1.1.0'; // Updated with cart styles
      console.log(`[PWA] Starting initialization... Version: ${APP_VERSION}`);
      
      // Load cart from storage
      console.log('[PWA] Loading cart from storage...');
      cart.loadFromStorage();

      // Set up global error handler
      window.addEventListener('error', (event) => {
        console.error('[PWA] Global error:', event.error);
      });

      window.addEventListener('unhandledrejection', (event) => {
        console.error('[PWA] Unhandled promise rejection:', event.reason);
      });

      // Set up navigation listener
      window.addEventListener('navigate', ((event: CustomEvent<Page>) => {
        this.navigateTo(event.detail);
      }) as EventListener);

      // Handle browser back/forward
      window.addEventListener('popstate', () => {
        this.handleRouteChange();
      });

      // Initial route
      console.log('[PWA] Loading initial route...');
      this.handleRouteChange();

      console.log('[PWA] ✅ Initialization complete!');
    } catch (error) {
      console.error('[PWA] ❌ Initialization failed:', error);
      this.container.innerHTML = `
        <div style="padding: 2rem; text-align: center;">
          <h2 style="color: #ef4444;">Failed to initialize app</h2>
          <p style="color: #64748b; margin: 1rem 0;">${error instanceof Error ? error.message : 'Unknown error'}</p>
          <button onclick="window.location.reload()" style="padding: 0.75rem 1.5rem; background: #0ea5e9; color: white; border: none; border-radius: 6px; cursor: pointer;">
            Reload Page
          </button>
        </div>
      `;
    }
  }

  private handleRouteChange(): void {
    const hash = window.location.hash.slice(1) || 'selection';
    console.log('[PWA] Route change detected, hash:', hash);
    this.navigateTo(hash as Page);
  }

  private navigateTo(page: Page): void {
    console.log('[PWA] Navigating to:', page, 'Current page:', this.currentPage);
    
    if (this.currentPage === page && this.currentPageInstance) {
      console.log('[PWA] Already on this page, skipping navigation');
      return;
    }

    // Clean up current page
    if (this.currentPageInstance && 'destroy' in this.currentPageInstance) {
      console.log('[PWA] Cleaning up previous page instance');
      this.currentPageInstance.destroy();
    }

    this.currentPage = page;
    window.location.hash = page;

    // Clear container
    console.log('[PWA] Clearing container');
    this.container.innerHTML = '';

    // Render new page
    console.log('[PWA] Creating new page instance:', page);
    switch (page) {
      case 'selection':
        this.currentPageInstance = new SelectionPage(this.container);
        break;
      case 'menu':
        this.currentPageInstance = new MenuPage(this.container);
        break;
      case 'cart':
        this.currentPageInstance = new CartPage(this.container);
        break;
      case 'status':
        this.currentPageInstance = new StatusPage(this.container);
        break;
      default:
        console.log('[PWA] Unknown page, defaulting to selection');
        this.currentPageInstance = new SelectionPage(this.container);
    }
    console.log('[PWA] Page instance created');
  }
}

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new App();
  });
} else {
  new App();
}

// Service worker registration is handled by vite-plugin-pwa
// In development, service worker is disabled to see changes immediately
// In production, it uses NetworkFirst strategy for HTML/CSS/JS to fetch updates

// Force update check on page load (production only)
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  navigator.serviceWorker.getRegistrations().then(registrations => {
    registrations.forEach(registration => {
      registration.update();
    });
  });
}
