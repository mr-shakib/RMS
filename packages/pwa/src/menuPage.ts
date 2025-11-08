import { MenuItem, Category } from '@rms/shared';
import { apiClient } from './api';
import { cart } from './cart';
import { networkStatus } from './networkStatus';

export class MenuPage {
  private menuItems: MenuItem[] = [];
  private filteredItems: MenuItem[] = [];
  private categories: Category[] = [];
  private selectedCategory: string = 'All';
  private searchQuery: string = '';
  private container: HTMLElement;
  private isBuffetMode: boolean = false;
  private buffetCategoryId: string | null = null;
  private buffetCategoryName: string | null = null;
  private buffetPrice: number = 0;

  constructor(container: HTMLElement) {
    this.container = container;
    // Get mode from session storage
    const mode = sessionStorage.getItem('menuMode') || 'regular';
    this.isBuffetMode = mode === 'buffet';
    this.buffetCategoryId = sessionStorage.getItem('buffetCategoryId');
    this.buffetCategoryName = sessionStorage.getItem('buffetCategoryName');
    this.buffetPrice = parseFloat(sessionStorage.getItem('buffetPrice') || '0');
    
    // Set cart mode
    if (this.isBuffetMode && this.buffetCategoryId) {
      cart.setBuffetMode(true, {
        id: this.buffetCategoryId,
        name: this.buffetCategoryName || '',
        buffetPrice: this.buffetPrice
      } as any);
    }
    
    this.init();
  }

  private async init(): Promise<void> {
    try {
      this.render();
      await this.loadMenu();
      this.setupEventListeners();
      
      networkStatus.subscribe(() => {
        // Handle network status changes
      });

      cart.subscribe(() => {
        this.updateCartBadge();
        this.updateQuantityDisplays();
      });
    } catch (error) {
      console.error('[MenuPage] Initialization failed:', error);
      this.showError('Failed to load menu');
    }
  }

  private async loadMenu(): Promise<void> {
    try {
      this.showLoading();
      this.menuItems = await apiClient.getMenu();
      this.extractCategories();
      this.filterItems();
      this.renderMenu();
    } catch (error) {
      console.error('[MenuPage] Failed to load menu:', error);
      this.showError('Failed to load menu');
    }
  }

  private extractCategories(): void {
    const categoryMap = new Map<string, Category>();
    
    this.menuItems.forEach((item) => {
      if (item.category) {
        categoryMap.set(item.category.id, item.category);
      }
    });
    
    this.categories = Array.from(categoryMap.values()).sort((a, b) => a.sortOrder - b.sortOrder);
  }

  private filterItems(): void {
    this.filteredItems = this.menuItems.filter((item) => {
      // If buffet mode, only show items from selected buffet category
      if (this.isBuffetMode && this.buffetCategoryId) {
        if (item.categoryId !== this.buffetCategoryId) {
          return false;
        }
      }

      // If regular mode, exclude buffet categories
      if (!this.isBuffetMode && item.category?.isBuffet) {
        return false;
      }

      const matchesCategory =
        this.selectedCategory === 'All' ||
        item.category?.name === this.selectedCategory;
      
      const matchesSearch =
        this.searchQuery === '' ||
        item.name.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        item.description?.toLowerCase().includes(this.searchQuery.toLowerCase());

      return matchesCategory && matchesSearch && item.available;
    });
  }

  private render(): void {
    const tableId = this.getTableIdFromUrl();
    
    this.container.innerHTML = `
      <div class="menu-page">
        <div class="header">
          <div class="header-content">
            <div class="header-left">
              <button class="back-button" id="back-button">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M19 12H5M12 19l-7-7 7-7"/>
                </svg>
              </button>
              <div>
                <div class="header-title">Table ${tableId || '?'}</div>
                <div class="header-subtitle">${this.isBuffetMode ? this.buffetCategoryName : 'À la Carte'}</div>
              </div>
            </div>
            <button class="cart-button" id="cart-button">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
                <path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/>
              </svg>
              <span class="cart-badge" id="cart-badge" style="display: none;">0</span>
            </button>
          </div>
        </div>

        ${this.isBuffetMode ? `
          <div class="menu-banner">
            <div class="menu-banner-title">${this.buffetCategoryName}</div>
            <div class="menu-banner-subtitle">All-you-can-eat for $${this.buffetPrice.toFixed(2)}</div>
          </div>
        ` : ''}

        <div class="menu-search">
          <input
            type="text"
            class="search-input"
            id="search-input"
            placeholder="Search menu..."
          />
        </div>

        <div class="menu-categories" id="category-tabs-container">
          <div class="category-tabs" id="category-tabs"></div>
        </div>

        <div class="menu-content" id="menu-content">
          <div class="loading-state">
            <div class="loading-spinner"></div>
            <p>Loading menu...</p>
          </div>
        </div>
      </div>
    `;

    this.updateCartBadge();
  }

  private renderMenu(): void {
    const menuContent = document.getElementById('menu-content');
    if (!menuContent) return;

    this.renderCategoryTabs();

    if (this.filteredItems.length === 0) {
      menuContent.innerHTML = `
        <div class="empty-state">
          <p>No menu items found</p>
        </div>
      `;
      return;
    }

    menuContent.innerHTML = `
      <div class="menu-grid">
        ${this.filteredItems.map((item) => this.renderMenuItem(item)).join('')}
      </div>
    `;

    this.filteredItems.forEach((item) => {
      this.attachMenuItemListeners(item);
    });

    this.updateQuantityDisplays();
  }

  private renderMenuItem(item: MenuItem): string {
    const imageUrl = item.imageUrl || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=300&fit=crop';
    const price = this.isBuffetMode ? 'Included' : `$${(typeof item.price === 'number' ? item.price : 0).toFixed(2)}`;
    const cartItem = cart.getItems().find(ci => ci.menuItem.id === item.id);
    const quantity = cartItem?.quantity || 0;
    
    return `
      <div class="menu-item-card" data-item-id="${item.id}">
        <img
          src="${imageUrl}"
          alt="${item.name}"
          class="menu-item-image"
          onerror="this.src='https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=300&fit=crop'"
        />
        <div class="menu-item-content">
          <div class="menu-item-header">
            <h3 class="menu-item-name">${item.name}</h3>
          </div>
          ${item.description ? `<p class="menu-item-description">${item.description}</p>` : ''}
          <div class="menu-item-footer">
            <div class="menu-item-price">${price}</div>
            ${quantity > 0 ? `
              <div class="menu-item-actions">
                <div class="quantity-controls">
                  <button class="quantity-btn" data-action="decrease" data-item-id="${item.id}">−</button>
                  <span class="quantity-display" id="qty-${item.id}">${quantity}</span>
                  <button class="quantity-btn" data-action="increase" data-item-id="${item.id}">+</button>
                </div>
              </div>
            ` : `
              <button class="add-to-cart-btn" data-action="add" data-item-id="${item.id}">Add</button>
            `}
          </div>
        </div>
      </div>
    `;
  }

  private renderCategoryTabs(): void {
    const tabsContainer = document.getElementById('category-tabs');
    if (!tabsContainer) return;

    if (this.isBuffetMode) {
      // In buffet mode, don't show category tabs
      const container = document.getElementById('category-tabs-container');
      if (container) container.style.display = 'none';
      return;
    }

    const categoryNames = ['All', ...this.categories.filter(c => !c.isBuffet).map(c => c.name)];
    
    tabsContainer.innerHTML = categoryNames
      .map(
        (category) => `
        <button
          class="category-tab ${category === this.selectedCategory ? 'active' : ''}"
          data-category="${category}"
        >
          ${category}
        </button>
      `
      )
      .join('');
  }

  private attachMenuItemListeners(item: MenuItem): void {
    const addBtn = document.querySelector(
      `[data-action="add"][data-item-id="${item.id}"]`
    );
    const decreaseBtn = document.querySelector(
      `[data-action="decrease"][data-item-id="${item.id}"]`
    );
    const increaseBtn = document.querySelector(
      `[data-action="increase"][data-item-id="${item.id}"]`
    );

    addBtn?.addEventListener('click', () => {
      cart.addItem(item, 1);
      this.renderMenu(); // Re-render to show quantity controls
    });

    decreaseBtn?.addEventListener('click', () => {
      const cartItem = cart.getItems().find(ci => ci.menuItem.id === item.id);
      const currentQty = cartItem?.quantity || 0;
      
      if (currentQty > 0) {
        const newQty = currentQty - 1;
        if (newQty === 0) {
          cart.removeItem(item.id);
          this.renderMenu(); // Re-render to show add button
        } else {
          cart.updateQuantity(item.id, newQty);
        }
      }
    });

    increaseBtn?.addEventListener('click', () => {
      const cartItem = cart.getItems().find(ci => ci.menuItem.id === item.id);
      const currentQty = cartItem?.quantity || 0;
      cart.updateQuantity(item.id, currentQty + 1);
    });
  }

  private updateQuantityDisplays(): void {
    const cartItems = cart.getItems();
    
    this.filteredItems.forEach(item => {
      const qtyElement = document.getElementById(`qty-${item.id}`);
      if (qtyElement) {
        const cartItem = cartItems.find(ci => ci.menuItem.id === item.id);
        qtyElement.textContent = (cartItem?.quantity || 0).toString();
      }
    });
  }

  private setupEventListeners(): void {
    const searchInput = document.getElementById('search-input') as HTMLInputElement;
    searchInput?.addEventListener('input', (e) => {
      this.searchQuery = (e.target as HTMLInputElement).value;
      this.filterItems();
      this.renderMenu();
    });

    document.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (target.classList.contains('category-tab')) {
        this.selectedCategory = target.dataset.category || 'All';
        this.filterItems();
        this.renderMenu();
      }
    });

    const cartButton = document.getElementById('cart-button');
    cartButton?.addEventListener('click', () => {
      window.dispatchEvent(new CustomEvent('navigate', { detail: 'cart' }));
    });

    const backButton = document.getElementById('back-button');
    backButton?.addEventListener('click', () => {
      sessionStorage.clear();
      cart.clear();
      window.dispatchEvent(new CustomEvent('navigate', { detail: 'selection' }));
    });
  }

  private showLoading(): void {
    const menuContent = document.getElementById('menu-content');
    if (menuContent) {
      menuContent.innerHTML = `
        <div class="loading-state">
          <div class="loading-spinner"></div>
          <p>Loading menu...</p>
        </div>
      `;
    }
  }

  private showError(message: string): void {
    const menuContent = document.getElementById('menu-content');
    if (menuContent) {
      menuContent.innerHTML = `
        <div class="error-state">
          <div class="error-icon">⚠️</div>
          <h2>Oops!</h2>
          <p>${message}</p>
          <button onclick="window.location.reload()" class="btn btn-primary">Retry</button>
        </div>
      `;
    }
  }

  private updateCartBadge(): void {
    const badge = document.getElementById('cart-badge');
    if (badge) {
      const count = cart.getItemCount();
      badge.textContent = count.toString();
      badge.style.display = count > 0 ? 'flex' : 'none';
    }
  }

  private getTableIdFromUrl(): string | null {
    const params = new URLSearchParams(window.location.search);
    return params.get('table');
  }

  destroy(): void {
    // Cleanup if needed
  }
}
