import { Category } from '@rms/shared';
import { apiClient } from './api';

export class SelectionPage {
  private container: HTMLElement;
  private buffetCategories: Category[] = [];

  constructor(container: HTMLElement) {
    this.container = container;
    this.init();
  }

  private async init(): Promise<void> {
    try {
      // Render first, then load buffet categories in the background
      this.render();
      await this.loadBuffetCategories();
      // Re-render if buffet categories loaded successfully
      if (this.buffetCategories.length > 0) {
        this.updateBuffetCategories();
      }
    } catch (error) {
      console.error('[SelectionPage] Failed to load buffet categories:', error);
      // Don't show error - just continue without buffet options
      // User can still select regular menu
    }
  }

  private async loadBuffetCategories(): Promise<void> {
    try {
      const categories = await apiClient.getCategories();
      this.buffetCategories = categories.filter(cat => cat.isBuffet);
    } catch (error) {
      console.error('[SelectionPage] Failed to fetch categories:', error);
      this.buffetCategories = [];
    }
  }

  private updateBuffetCategories(): void {
    const buffetCategoriesEl = document.getElementById('buffet-categories');
    if (buffetCategoriesEl) {
      buffetCategoriesEl.innerHTML = this.renderBuffetCategories();
      // Re-setup event listeners for the new buffet category cards
      this.setupBuffetCategoryListeners();
    }
  }

  private getDisplayCategoryName(categoryName: string): string {
    // Map English category names to Italian display names
    const nameMap: { [key: string]: string } = {
      'Dinner': 'CENA',
      'Lunch': 'PRANZO',
      'Buffet': 'ALL YOU CAN EAT'
    };
    
    // Check for exact match first
    if (nameMap[categoryName]) {
      return nameMap[categoryName];
    }
    
    // Check for partial match (case insensitive)
    const lowerName = categoryName.toLowerCase();
    for (const [key, value] of Object.entries(nameMap)) {
      if (lowerName.includes(key.toLowerCase())) {
        return value;
      }
    }
    
    // Return original if no match
    return categoryName;
  }

  private render(): void {
    this.container.innerHTML = `
      <div class="selection-page">
        <div class="selection-hero">
          <div class="selection-hero-content">
            <h1 class="selection-title">Benvenuti</h1>
            <p class="selection-subtitle">Come vuoi cenare oggi?</p>
          </div>
        </div>

        <div class="selection-container">
          <div class="selection-cards">
            <!-- Buffet Option -->
            <div class="selection-card" data-type="buffet">
              <div class="selection-card-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 002-2V2M7 2v20M21 15V2v0a5 5 0 00-5 5v6c0 1.1.9 2 2 2h3zm0 0v7"/>
                </svg>
              </div>
              <h2 class="selection-card-title">ALL YOU CAN EAT</h2>
              <p class="selection-card-description">Tutto quello che puoi mangiare</p>
              <div class="selection-card-badge">Prezzo Fisso</div>
            </div>

            <!-- Regular Menu Option -->
            <div class="selection-card" data-type="regular">
              <div class="selection-card-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                </svg>
              </div>
              <h2 class="selection-card-title">Alla Carta</h2>
              <p class="selection-card-description">Scegli i tuoi piatti preferiti dal menu</p>
              <div class="selection-card-badge">Per Articolo</div>
            </div>
          </div>

          <div class="selection-image">
            <img src="/r_n_r.jpg" alt="Restaurant" />
          </div>
        </div>

        <!-- Buffet Category Modal -->
        <div class="modal" id="buffet-modal" style="display: none;">
          <div class="modal-overlay"></div>
          <div class="modal-content">
            <div class="modal-header">
              <h2 class="modal-title">Seleziona Buffet</h2>
              <button class="modal-close" id="close-buffet-modal">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M18 6L6 18M6 6l12 12"/>
                </svg>
              </button>
            </div>
            <div class="modal-body">
              <div class="buffet-categories" id="buffet-categories">
                ${this.renderBuffetCategories()}
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    this.setupEventListeners();
  }

  private renderBuffetCategories(): string {
    if (this.buffetCategories.length === 0) {
      return '<p class="empty-state">Nessuna opzione buffet disponibile al momento</p>';
    }

    return this.buffetCategories.map(category => {
      const displayName = this.getDisplayCategoryName(category.name);
      const price = (category.buffetPrice || 0).toFixed(2).replace('.', ',');
      return `
        <div class="buffet-category-card" data-category-id="${category.id}">
          <div class="buffet-card-header">
            <div class="buffet-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 002-2V2M7 2v20M21 15V2v0a5 5 0 00-5 5v6c0 1.1.9 2 2 2h3zm0 0v7"/>
              </svg>
            </div>
            <div class="buffet-category-info">
              <h3 class="buffet-category-name">${displayName}</h3>
              <p class="buffet-category-price">€${price} <span class="per-person">/ persona</span></p>
            </div>
          </div>
          
          <div class="buffet-quantity-section">
            <label class="quantity-label">Numero di persone</label>
            <div class="buffet-quantity-selector">
              <button class="buffet-quantity-btn" data-action="decrease" data-category-id="${category.id}" type="button">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                  <path d="M5 12h14"/>
                </svg>
              </button>
              <input type="number" id="quantity-${category.id}" class="buffet-quantity-input" value="1" min="1" max="20" />
              <button class="buffet-quantity-btn" data-action="increase" data-category-id="${category.id}" type="button">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                  <path d="M12 5v14M5 12h14"/>
                </svg>
              </button>
            </div>
          </div>
          
          <button class="buffet-select-btn" data-category-id="${category.id}">
            <span>Seleziona Buffet</span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </button>
        </div>
      `;
    }).join('');
  }

  private setupEventListeners(): void {
    // Regular menu selection
    const regularCard = this.container.querySelector('[data-type="regular"]');
    regularCard?.addEventListener('click', () => {
      sessionStorage.setItem('menuMode', 'regular');
      sessionStorage.removeItem('buffetCategoryId');
      window.dispatchEvent(new CustomEvent('navigate', { detail: 'menu' }));
    });

    // Buffet selection
    const buffetCard = this.container.querySelector('[data-type="buffet"]');
    buffetCard?.addEventListener('click', () => {
      if (this.buffetCategories.length === 0) {
        alert('Nessuna opzione buffet disponibile al momento');
        return;
      }
      this.showBuffetModal();
    });

    // Close modal
    const closeBtn = this.container.querySelector('#close-buffet-modal');
    closeBtn?.addEventListener('click', () => this.hideBuffetModal());

    const overlay = this.container.querySelector('.modal-overlay');
    overlay?.addEventListener('click', () => this.hideBuffetModal());

    // Setup buffet category listeners
    this.setupBuffetCategoryListeners();
  }

  private setupBuffetCategoryListeners(): void {
    // Handle quantity buttons
    const quantityBtns = this.container.querySelectorAll('.buffet-quantity-btn');
    quantityBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const action = btn.getAttribute('data-action');
        const categoryId = btn.getAttribute('data-category-id');
        const input = this.container.querySelector(`#quantity-${categoryId}`) as HTMLInputElement;
        if (input) {
          let value = parseInt(input.value);
          if (action === 'increase' && value < 20) {
            input.value = String(value + 1);
          } else if (action === 'decrease' && value > 1) {
            input.value = String(value - 1);
          }
        }
      });
    });

    // Prevent card click from propagating to input
    const quantityInputs = this.container.querySelectorAll('.buffet-quantity-input');
    quantityInputs.forEach(input => {
      input.addEventListener('click', (e) => e.stopPropagation());
      input.addEventListener('change', (e) => {
        const inputEl = e.target as HTMLInputElement;
        let value = parseInt(inputEl.value);
        if (isNaN(value) || value < 1) {
          inputEl.value = '1';
        } else if (value > 20) {
          inputEl.value = '20';
        }
      });
    });

    // Buffet category selection via button
    const selectBtns = this.container.querySelectorAll('.buffet-select-btn');
    selectBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const categoryId = btn.getAttribute('data-category-id');
        const category = this.buffetCategories.find(c => c.id === categoryId);
        const quantityInput = this.container.querySelector(`#quantity-${categoryId}`) as HTMLInputElement;
        const quantity = quantityInput ? parseInt(quantityInput.value) : 1;
        
        if (category) {
          // Reset body overflow before navigating
          document.body.style.overflow = '';
          sessionStorage.setItem('menuMode', 'buffet');
          sessionStorage.setItem('buffetCategoryId', category.id);
          sessionStorage.setItem('buffetCategoryName', category.name);
          sessionStorage.setItem('buffetPrice', String(category.buffetPrice || 0));
          sessionStorage.setItem('buffetQuantity', String(quantity));
          console.log('🎫 BUFFET SELECTED:', { id: category.id, name: category.name, price: category.buffetPrice, quantity });
          window.dispatchEvent(new CustomEvent('navigate', { detail: 'menu' }));
        }
      });
    });
  }

  private showBuffetModal(): void {
    const modal = this.container.querySelector('#buffet-modal') as HTMLElement;
    if (modal) {
      modal.style.display = 'flex';
      document.body.style.overflow = 'hidden';
    }
  }

  private hideBuffetModal(): void {
    const modal = this.container.querySelector('#buffet-modal') as HTMLElement;
    if (modal) {
      modal.style.display = 'none';
      document.body.style.overflow = '';
    }
  }

  destroy(): void {
    // Reset body overflow on destroy
    document.body.style.overflow = '';
  }
}
