import { MenuItem, Category } from '@rms/shared';
import { apiClient } from './api';
import { cart } from './cart';
import { networkStatus } from './networkStatus';

export class MenuPage {
  private menuItems: MenuItem[] = [];
  private filteredItems: MenuItem[] = [];
  private categories: Category[] = [];
  private selectedCategory: string = 'Tutti';
  private searchQuery: string = '';
  private priceFilter: 'all' | 'incluso' | 'priced' = 'all'; // Filter by price type
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
      
      // Ensure scrolling is enabled after DOM is rendered
      requestAnimationFrame(() => {
        document.body.style.overflow = '';
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        
        // Also ensure the menu-content can scroll
        const menuContent = document.getElementById('menu-content');
        if (menuContent) {
          menuContent.style.overflowY = 'auto';
          console.log('[MenuPage] Enabled scrolling on menu-content');
        }
      });
      
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
      this.showError('Impossibile caricare il menu');
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
        Traccia Ordine
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
      this.showError('Impossibile caricare il menu. Controlla la connessione e riprova.');
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
    
    // Set default category for à la carte mode
    if (!this.isBuffetMode && this.selectedCategory === 'Tutti') {
      // Find Beverages or Drinks category
      const drinksCategory = this.categories.find(cat => 
        !cat.isBuffet && (cat.name === 'Drinks' || cat.name === 'Beverages')
      );
      
      if (drinksCategory) {
        this.selectedCategory = drinksCategory.name;
        console.log('[MenuPage] Set default category to:', this.selectedCategory);
      } else {
        console.log('[MenuPage] Drinks/Beverages category not found, using Tutti');
      }
    }
  }

  private getItemBuffetCategories(item: MenuItem): Category[] {
    const buffetCategories: Category[] = [];
    
    // Check if there are multiple instances of this item (merged duplicates)
    const allInstances = (item as any)._allBuffetInstances as MenuItem[] | undefined;
    
    if (allInstances && allInstances.length > 1) {
      // Item exists in multiple buffet categories - collect all unique buffet categories
      const categoryMap = new Map<string, Category>();
      
      allInstances.forEach(instance => {
        // Add primary category if it's buffet
        if (instance.category && instance.category.isBuffet) {
          categoryMap.set(instance.category.id, instance.category);
        }
        
        // Add secondary category if it's buffet
        const secondaryCategory = (instance as any).secondaryCategory;
        if (secondaryCategory && secondaryCategory.isBuffet) {
          categoryMap.set(secondaryCategory.id, secondaryCategory);
        }
      });
      
      return Array.from(categoryMap.values());
    }
    
    // Single item - check its own categories
    if (item.category && item.category.isBuffet) {
      buffetCategories.push(item.category);
    }
    
    const secondaryCategory = (item as any).secondaryCategory;
    if (secondaryCategory && secondaryCategory.isBuffet) {
      buffetCategories.push(secondaryCategory);
    }
    
    return buffetCategories;
  }

  private filterItems(): void {
    // Get buffet category references
    const lunchBuffetCategory = this.categories.find(cat => 
      cat.isBuffet && (cat.name.toLowerCase().includes('lunch') || cat.name.toLowerCase().includes('pranzo'))
    );
    const dinnerBuffetCategory = this.categories.find(cat => 
      cat.isBuffet && (cat.name.toLowerCase().includes('dinner') || cat.name.toLowerCase().includes('cena'))
    );

    let items = this.menuItems.filter((item) => {
      // If buffet mode, only show items from selected buffet category (check both primary and secondary)
      if (this.isBuffetMode && this.buffetCategoryId) {
        const secondaryCategoryId = (item as any).secondaryCategoryId;
        let isInThisBuffet = item.categoryId === this.buffetCategoryId || secondaryCategoryId === this.buffetCategoryId;
        
        // Special case: If item has lunch buffet as secondary category, show it in BOTH lunch and dinner buffets
        // This indicates the item was added to both buffets
        if (!isInThisBuffet && lunchBuffetCategory && secondaryCategoryId === lunchBuffetCategory.id) {
          // If current buffet is dinner and item has lunch as secondary, include it
          if (this.buffetCategoryId === dinnerBuffetCategory?.id) {
            isInThisBuffet = true;
          }
        }
        
        if (!isInThisBuffet) {
          return false;
        }
      }

      // Category filtering - check both primary and secondary categories
      const matchesCategory =
        this.selectedCategory === 'Tutti' ||
        item.category?.name === this.selectedCategory ||
        ((item as any).secondaryCategory?.name === this.selectedCategory);
      
      const matchesSearch =
        this.searchQuery === '' ||
        item.name.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        item.description?.toLowerCase().includes(this.searchQuery.toLowerCase());

      // Price filter (only applies in buffet mode)
      let matchesPriceFilter = true;
      if (this.isBuffetMode && this.priceFilter !== 'all') {
        const isIncluso = !item.alwaysPriced; // Items without alwaysPriced are incluso
        if (this.priceFilter === 'incluso') {
          matchesPriceFilter = isIncluso;
        } else if (this.priceFilter === 'priced') {
          matchesPriceFilter = !isIncluso;
        }
      }

      return matchesCategory && matchesSearch && matchesPriceFilter && item.available;
    });

    // Deduplicate items when showing "All" (Tutti)
    if (this.selectedCategory === 'Tutti') {
      const uniqueItems = new Map<string, MenuItem>();
      
      // In buffet mode, also track items by name to merge duplicate buffet items
      if (this.isBuffetMode) {
        const itemsByName = new Map<string, MenuItem[]>();
        
        // Group items by name
        items.forEach(item => {
          const normalizedName = item.name.toLowerCase().trim();
          if (!itemsByName.has(normalizedName)) {
            itemsByName.set(normalizedName, []);
          }
          itemsByName.get(normalizedName)!.push(item);
        });
        
        // For each group, take the first item (this will be the one we show)
        itemsByName.forEach((itemGroup) => {
          if (itemGroup.length > 0) {
            // Use the first item as the representative
            const representativeItem = itemGroup[0];
            uniqueItems.set(representativeItem.id, representativeItem);
            
            // Store all items in this group for tag display
            (representativeItem as any)._allBuffetInstances = itemGroup;
          }
        });
      } else {
        // Regular mode: just deduplicate by ID
        items.forEach(item => {
          if (!uniqueItems.has(item.id)) {
            uniqueItems.set(item.id, item);
          }
        });
      }
      
      items = Array.from(uniqueItems.values());
    }

    this.filteredItems = items;
  }

  private render(): void {
    const tableId = this.getTableIdFromUrl();
    const displayName = this.tableName || `Tavolo ${tableId || '?'}`;
    const displayBuffetName = this.getDisplayCategoryName(this.buffetCategoryName || '');
    const modeText = this.isBuffetMode ? displayBuffetName : 'Alla Carta';
    
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
                <div class="header-subtitle">${modeText}</div>
              </div>
            </div>
          </div>
        </div>

        ${this.isBuffetMode ? `
          <div class="menu-banner">
            <div class="menu-banner-title">${displayBuffetName}</div>
            <div class="menu-banner-subtitle">Tutto quello che puoi mangiare per €${this.buffetPrice.toFixed(2).replace('.', ',')}</div>
          </div>
        ` : ''}

        <div class="menu-search">
          <input
            type="text"
            class="search-input"
            id="search-input"
            placeholder="Cerca nel menu..."
          />
        </div>

        ${this.isBuffetMode ? `
          <div class="price-filter-container">
            <button class="price-filter-btn ${this.priceFilter === 'all' ? 'active' : ''}" data-filter="all">Tutti</button>
            <button class="price-filter-btn ${this.priceFilter === 'incluso' ? 'active' : ''}" data-filter="incluso">Incluso</button>
            <button class="price-filter-btn ${this.priceFilter === 'priced' ? 'active' : ''}" data-filter="priced">A Pagamento</button>
          </div>
        ` : ''}

        <div class="menu-categories" id="category-tabs-container">
          <div class="category-tabs" id="category-tabs"></div>
        </div>

        <div class="menu-content" id="menu-content">
          <div class="loading-state">
            <div class="loading-spinner"></div>
            <p>Caricamento del menu...</p>
          </div>
        </div>

        <div class="bottom-cart-bar" id="bottom-cart-bar" style="display: none;">
          <div class="bottom-cart-content">
            <div class="bottom-cart-info">
              <div class="bottom-cart-items-count" id="bottom-cart-items-count">0 articoli</div>
              <div class="bottom-cart-total" id="bottom-cart-total">€0,00</div>
            </div>
            <button class="bottom-cart-button" id="bottom-cart-button">
              <span>Vedi Carrello</span>
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

  private getDisplayCategoryName(categoryName: string): string {
    const nameMap: { [key: string]: string } = {
      'Dinner': 'CENA',
      'Lunch': 'PRANZO',
      'Buffet': 'ALL YOU CAN EAT'
    };
    
    if (nameMap[categoryName]) {
      return nameMap[categoryName];
    }
    
    const lowerName = categoryName.toLowerCase();
    for (const [key, value] of Object.entries(nameMap)) {
      if (lowerName.includes(key.toLowerCase())) {
        return value;
      }
    }
    
    return categoryName;
  }

  private renderMenu(): void {
    const menuContent = document.getElementById('menu-content');
    if (!menuContent) return;

    this.renderCategoryTabs();
    this.renderPriceFilters();

    if (this.filteredItems.length === 0) {
      menuContent.innerHTML = `
        <div class="empty-state">
          <p>Nessun articolo trovato</p>
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
    // Debug log to check alwaysPriced field
    if (this.isBuffetMode) {
      console.log('[MenuPage] Item:', item.name);
      console.log('  alwaysPriced:', item.alwaysPriced);
      console.log('  typeof alwaysPriced:', typeof item.alwaysPriced);
      console.log('  !item.alwaysPriced:', !item.alwaysPriced);
      console.log('  isBuffetMode && !item.alwaysPriced:', this.isBuffetMode && !item.alwaysPriced);
    }
    const imageUrl = item.imageUrl || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=300&fit=crop';
    // Show price if not buffet mode, OR if item is marked as alwaysPriced
    // Explicitly check if alwaysPriced is true (handle undefined/null as false)
    const isAlwaysPriced = item.alwaysPriced === true;
    const showIncluso = (this.isBuffetMode && !isAlwaysPriced);
    const priceValue = (typeof item.price === 'number' ? item.price : 0).toFixed(2).replace('.', ',');
    const price = showIncluso ? 'Incluso' : `€${priceValue}`;
    
    if (this.isBuffetMode) {
      console.log('  isAlwaysPriced:', isAlwaysPriced, '- Will show:', showIncluso ? 'Incluso' : `€${priceValue}`);
    }
    
    const cartItem = cart.getItems().find(ci => ci.menuItem.id === item.id);
    const quantity = cartItem?.quantity || 0;
    
    // Get buffet categories for this item (when showing All in buffet mode)
    const buffetCategories = this.isBuffetMode && this.selectedCategory === 'Tutti' 
      ? this.getItemBuffetCategories(item)
      : [];
    const showBuffetTags = buffetCategories.length > 0;
    
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
            ${showBuffetTags ? `
              <div class="buffet-tags">
                ${buffetCategories.map(cat => {
                  const displayName = this.getDisplayCategoryName(cat.name);
                  return `<span class="buffet-tag">${displayName}</span>`;
                }).join('')}
              </div>
            ` : ''}
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
              <button class="add-to-cart-btn" data-action="add" data-item-id="${item.id}">Aggiungi</button>
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
      // In buffet mode, show secondary categories for filtering
      const container = document.getElementById('category-tabs-container');
      if (container) container.style.display = 'block';
      
      // Get unique secondary categories from buffet items
      const secondaryCategories = new Map<string, string>();
      this.menuItems.forEach(item => {
        const secondaryCategory = (item as any).secondaryCategory;
        if (secondaryCategory && item.categoryId === this.buffetCategoryId) {
          secondaryCategories.set(secondaryCategory.id, secondaryCategory.name);
        }
      });
      
      const categoryNames = ['Tutti', ...Array.from(secondaryCategories.values())];
      
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
      return;
    }

    const categoryNames = ['Tutti', ...this.categories.filter(c => !c.isBuffet).map(c => c.name)];
    
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

  private renderPriceFilters(): void {
    const filterContainer = document.querySelector('.price-filter-container');
    if (!filterContainer) return;

    filterContainer.innerHTML = `
      <button class="price-filter-btn ${this.priceFilter === 'all' ? 'active' : ''}" data-filter="all">Tutti</button>
      <button class="price-filter-btn ${this.priceFilter === 'incluso' ? 'active' : ''}" data-filter="incluso">Incluso</button>
      <button class="price-filter-btn ${this.priceFilter === 'priced' ? 'active' : ''}" data-filter="priced">A Pagamento</button>
    `;
  }

  private attachMenuItemListeners(item: MenuItem): void {
    const addBtn = document.querySelector(`[data-action="add"][data-item-id="${item.id}"]`);
    const decreaseBtn = document.querySelector(`[data-action="decrease"][data-item-id="${item.id}"]`);
    const increaseBtn = document.querySelector(`[data-action="increase"][data-item-id="${item.id}"]`);

    addBtn?.addEventListener('click', () => {
      cart.addItem(item, 1);
      this.renderMenu();
    });

    decreaseBtn?.addEventListener('click', () => {
      const cartItem = cart.getItems().find(ci => ci.menuItem.id === item.id);
      const currentQty = cartItem?.quantity || 0;
      
      if (currentQty > 0) {
        const newQty = currentQty - 1;
        if (newQty === 0) {
          cart.removeItem(item.id);
          this.renderMenu();
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
        this.selectedCategory = target.dataset.category || 'Tutti';
        this.filterItems();
        this.renderMenu();
      }
      
      // Handle price filter buttons
      if (target.classList.contains('price-filter-btn')) {
        const filter = target.dataset.filter as 'all' | 'incluso' | 'priced';
        if (filter) {
          this.priceFilter = filter;
          this.filterItems();
          this.renderMenu();
        }
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
          <p>Caricamento del menu...</p>
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
          <h2>Ops!</h2>
          <p>${message}</p>
          <button onclick="window.location.reload()" class="btn btn-primary">Riprova</button>
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
          itemsCount.textContent = `${count} ${count === 1 ? 'articolo' : 'articoli'}`;
        }
        if (totalElement) {
          totalElement.textContent = `€${total.toFixed(2).replace('.', ',')}`;
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
