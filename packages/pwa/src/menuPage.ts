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
  private tableName: string = '';

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
      await Promise.all([
        this.loadMenu(),
        this.loadTableInfo(),
        this.checkActiveOrder()
      ]);
      this.setupEventListeners();
      
      networkStatus.subscribe(() => {
        // Handle network status changes
      });

      cart.subscribe(() => {
        this.updateCartDisplay();
        this.updateQuantityDisplays();
      });
    } catch (error) {
      console.error('[MenuPage] Initialization failed:', error);
      this.showError('Failed to load menu');
    }
  }

  private async loadTableInfo(): Promise<void> {
    try {
      const tableId = this.getTableIdFromUrl();
      console.log('[MenuPage] Loading table info for tableId:', tableId);
      
      if (tableId) {
        console.log('[MenuPage] Calling API getTable with ID:', parseInt(tableId));
        const table = await apiClient.getTable(parseInt(tableId));
        console.log('[MenuPage] Received table data:', table);
        
        this.tableName = table.name;
        console.log('[MenuPage] Set tableName to:', this.tableName);
        
        // Update header with table name
        this.updateHeader();
      } else {
        console.log('[MenuPage] No tableId found in URL');
      }
    } catch (error) {
      console.error('[MenuPage] Failed to load table info:', error);
      // Use table ID as fallback
      const tableId = this.getTableIdFromUrl();
      this.tableName = `Table ${tableId || '?'}`;
      console.log('[MenuPage] Using fallback tableName:', this.tableName);
      this.updateHeader();
    }
  }

  private async checkActiveOrder(): Promise<void> {
    try {
      const tableId = this.getTableIdFromUrl();
      if (!tableId) return;

      const order = await apiClient.getOrderStatus(parseInt(tableId));
      
      // Check if there's an active order (not PAID or CANCELLED)
      if (order && order.status !== 'PAID' && order.status !== 'CANCELLED') {
        this.showTrackOrderButton();
      }
    } catch (error) {
      console.error('[MenuPage] Failed to check active order:', error);
    }
  }

  private showTrackOrderButton(): void {
    // Add track order button to header if not already present
    const headerLeft = document.querySelector('.header-left');
    if (headerLeft && !document.getElementById('track-order-header-btn')) {
      const trackButton = document.createElement('button');
      trackButton.id = 'track-order-header-btn';
      trackButton.className = 'track-order-btn';
      trackButton.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 20px; height: 20px; margin-right: 4px;">
          <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
        </svg>
        Track Order
      `;
      trackButton.onclick = () => {
        window.dispatchEvent(new CustomEvent('navigate', { detail: 'status' }));
      };
      
      const headerContent = headerLeft.querySelector('div');
      if (headerContent) {
        headerLeft.insertBefore(trackButton, headerContent);
      }
    }
  }

  private updateHeader(): void {
    console.log('[MenuPage] updateHeader called with tableName:', this.tableName);
    const headerTitle = document.querySelector('.header-title');
    console.log('[MenuPage] Found header element:', headerTitle);
    
    if (headerTitle) {
      console.log('[MenuPage] Current header text:', headerTitle.textContent);
      headerTitle.textContent = this.tableName;
      console.log('[MenuPage] Updated header text to:', headerTitle.textContent);
    } else {
      console.error('[MenuPage] Header title element not found!');
    }
  }

  private async loadMenu(): Promise<void> {
    try {
      console.log('[MenuPage] Starting to load menu...');
      this.showLoading();
      
      console.log('[MenuPage] Calling apiClient.getMenu()...');
      this.menuItems = await apiClient.getMenu();
      console.log('[MenuPage] Menu items loaded:', this.menuItems.length);
      
      console.log('[MenuPage] Extracting categories...');
      this.extractCategories();
      console.log('[MenuPage] Categories extracted:', this.categories.length);
      
      console.log('[MenuPage] Filtering items...');
      this.filterItems();
      console.log('[MenuPage] Filtered items:', this.filteredItems.length);
      
      console.log('[MenuPage] Rendering menu...');
      this.renderMenu();
      console.log('[MenuPage] Menu rendered successfully');
    } catch (error) {
      console.error('[MenuPage] Failed to load menu:', error);
      if (error instanceof Error) {
        console.error('[MenuPage] Error name:', error.name);
        console.error('[MenuPage] Error message:', error.message);
        console.error('[MenuPage] Error stack:', error.stack);
      }
      this.showError('Failed to load menu. Please check your connection and try again.');
    }
  }

  private extractCategories(): void {
    const categoryMap = new Map<string, Category>();
    
    this.menuItems.forEach((item) => {
      // Add primary category
      if (item.category) {
        categoryMap.set(item.category.id, item.category);
      }
      // Also add secondary category if it exists
      const secondaryCategory = (item as any).secondaryCategory;
      if (secondaryCategory) {
        categoryMap.set(secondaryCategory.id, secondaryCategory);
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

      // If regular mode, don't filter out buffet items from the data
      // Buffet items with secondaryCategoryId should appear in regular categories
      // We just don't show buffet categories in the UI tabs (handled in renderCategoryTabs)

      // Category filtering - check both primary and secondary categories
      const matchesCategory =
        this.selectedCategory === 'All' ||
        item.category?.name === this.selectedCategory ||
        // Also check secondaryCategory if it exists
        ((item as any).secondaryCategory?.name === this.selectedCategory);
      
      const matchesSearch =
        this.searchQuery === '' ||
        item.name.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        item.description?.toLowerCase().includes(this.searchQuery.toLowerCase());

      return matchesCategory && matchesSearch && item.available;
    });
  }

  private render(): void {
    const tableId = this.getTableIdFromUrl();
    // Display table name if loaded, otherwise show loading
    const displayName = this.tableName || `Table ${tableId || '?'}`;
    
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
                <div class="header-title">${displayName}</div>
                <div class="header-subtitle">${this.isBuffetMode ? this.buffetCategoryName : 'À la Carte'}</div>
              </div>
            </div>
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

        <!-- Bottom Cart Bar -->
        <div class="bottom-cart-bar" id="bottom-cart-bar" style="display: none;">
          <div class="bottom-cart-content">
            <div class="bottom-cart-info">
              <div class="bottom-cart-items-count" id="bottom-cart-items-count">0 items</div>
              <div class="bottom-cart-total" id="bottom-cart-total">$0.00</div>
            </div>
            <button class="bottom-cart-button" id="bottom-cart-button">
              <span>View Cart</span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    `;

    this.updateCartDisplay();
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

    const bottomCartButton = document.getElementById('bottom-cart-button');
    bottomCartButton?.addEventListener('click', () => {
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

  private updateCartDisplay(): void {
    const cartBar = document.getElementById('bottom-cart-bar');
    const itemsCount = document.getElementById('bottom-cart-items-count');
    const totalElement = document.getElementById('bottom-cart-total');
    
    const count = cart.getItemCount();
    const total = cart.getSubtotal();
    
    if (cartBar) {
      if (count > 0) {
        cartBar.style.display = 'block';
        if (itemsCount) {
          itemsCount.textContent = `${count} ${count === 1 ? 'item' : 'items'}`;
        }
        if (totalElement) {
          totalElement.textContent = `$${total.toFixed(2)}`;
        }
      } else {
        cartBar.style.display = 'none';
      }
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
