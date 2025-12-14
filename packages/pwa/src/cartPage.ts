import { cart, CartItem } from './cart';
import { apiClient } from './api';
import { offlineQueue } from './offlineQueue';
import { networkStatus } from './networkStatus';

export class CartPage {
  private container: HTMLElement;
  private cartItems: CartItem[] = [];
  private specialInstructions: string = '';

  constructor(container: HTMLElement) {
    this.container = container;
    this.init();
  }

  private init(): void {
    this.cartItems = cart.getItems();
    this.render();
    this.setupEventListeners();

    cart.subscribe((items) => {
      this.cartItems = items;
      this.renderCartItems();
      this.updateTotals();
    });
  }

  private render(): void {
    this.container.innerHTML = `
      <div class="header">
        <div class="header-content">
          <button class="back-button" id="back-button">← Indietro</button>
          <div class="header-title">Il Tuo Carrello</div>
        </div>
      </div>

      <div class="cart-container">
        <div id="cart-items"></div>

        <div class="cart-section">
          <label class="cart-label">Istruzioni Speciali (Opzionale)</label>
          <textarea
            id="special-instructions"
            class="cart-textarea"
            placeholder="Eventuali richieste speciali o esigenze alimentari..."
            rows="3"
          ></textarea>
        </div>

        <div class="cart-section">
          <div class="cart-totals">
            <div class="cart-total-row cart-total-final">
              <span>Totale</span>
              <span id="total">€0,00</span>
            </div>
          </div>
        </div>

        <div class="cart-actions">
          <button class="button button-secondary" id="clear-cart-button">
            Svuota Carrello
          </button>
          <button class="button button-primary" id="place-order-button">
            Invia Ordine
          </button>
        </div>
      </div>

      <div class="modal hidden" id="confirmation-modal">
        <div class="modal-overlay"></div>
        <div class="modal-content">
          <div class="modal-body">
            <div class="modal-icon success">✓</div>
            <h2 class="modal-title">Ordine Inviato con Successo!</h2>
            <p class="modal-text">Il tuo ordine è stato inviato in cucina e sarà preparato a breve.</p>
            <p class="modal-order-number" id="order-number"></p>
            <div class="modal-actions">
              <button class="button button-secondary" id="back-to-menu-button">
                Torna al Menu
              </button>
              <button class="button button-primary" id="track-order-button">
                Traccia Ordine
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    this.renderCartItems();
    this.updateTotals();
  }

  private renderCartItems(): void {
    const cartItemsContainer = document.getElementById('cart-items');
    if (!cartItemsContainer) return;

    const buffetMode = cart.getBuffetMode();

    if (this.cartItems.length === 0) {
      cartItemsContainer.innerHTML = `
        <div class="empty-cart">
          <div class="empty-cart-icon">🛒</div>
          <div class="empty-cart-text">Il tuo carrello è vuoto</div>
          <button class="button button-primary" id="browse-menu-button">
            Sfoglia il Menu
          </button>
        </div>
      `;

      const browseButton = document.getElementById('browse-menu-button');
      browseButton?.addEventListener('click', () => {
        window.dispatchEvent(new CustomEvent('navigate', { detail: 'menu' }));
      });

      return;
    }

    let buffetBanner = '';
    if (buffetMode.isBuffet && buffetMode.category) {
      const buffetQuantity = parseInt(sessionStorage.getItem('buffetQuantity') || '1');
      const buffetTotal = (buffetMode.category.buffetPrice || 0) * buffetQuantity;
      buffetBanner = `
        <div class="buffet-banner" style="margin-bottom: 1rem;">
          <div class="buffet-banner-title">🎉 ${buffetMode.category.name}</div>
          <div class="buffet-banner-subtitle">
            ${buffetQuantity} ${buffetQuantity === 1 ? 'persona' : 'persone'} - €${buffetTotal.toFixed(2).replace('.', ',')} totale
          </div>
          <div style="font-size: 0.85em; opacity: 0.9; margin-top: 4px;">
            Tutto quello che puoi mangiare - €${(buffetMode.category.buffetPrice || 0).toFixed(2).replace('.', ',')} a persona
          </div>
        </div>
      `;
    }

    cartItemsContainer.innerHTML = `
      ${buffetBanner}
      <div class="cart-items-list">
        ${this.cartItems.map((item) => this.renderCartItem(item, buffetMode.isBuffet)).join('')}
      </div>
    `;

    this.cartItems.forEach((item) => {
      this.attachCartItemListeners(item);
    });
  }

  private renderCartItem(item: CartItem, isBuffet: boolean = false): string {
    const price = typeof item.menuItem.price === 'number' 
      ? item.menuItem.price.toFixed(2).replace('.', ',') 
      : '0,00';
    
    // Debug logging for buffet mode
    if (isBuffet) {
      console.log('[CartPage] Item:', item.menuItem.name);
      console.log('  alwaysPriced:', item.menuItem.alwaysPriced);
      console.log('  !item.menuItem.alwaysPriced:', !item.menuItem.alwaysPriced);
      console.log('  Will show Incluso:', isBuffet && !item.menuItem.alwaysPriced);
    }
    
    // Show price if not buffet, OR if item is marked as alwaysPriced
    // Explicitly check if alwaysPriced is true (handle undefined/null as false)
    const isAlwaysPriced = item.menuItem.alwaysPriced === true;
    const itemTotal = (isBuffet && !isAlwaysPriced) ? 'Incluso' : `€${(item.menuItem.price * item.quantity).toFixed(2).replace('.', ',')}`;

    return `
      <div class="cart-item" data-item-id="${item.menuItem.id}">
        <div class="cart-item-info">
          <div class="cart-item-name">${item.menuItem.name}</div>
          ${(isBuffet && !isAlwaysPriced) ? '' : `<div class="cart-item-price">€${price} ciascuno</div>`}
          ${item.notes ? `<div class="cart-item-notes">Nota: ${item.notes}</div>` : ''}
        </div>
        <div class="cart-item-controls">
          <div class="quantity-selector">
            <button class="quantity-button" data-action="decrease" data-item-id="${item.menuItem.id}">−</button>
            <span class="quantity-value">${item.quantity}</span>
            <button class="quantity-button" data-action="increase" data-item-id="${item.menuItem.id}">+</button>
          </div>
          <div class="cart-item-total">${itemTotal}</div>
          <button class="remove-button" data-item-id="${item.menuItem.id}">🗑️</button>
        </div>
      </div>
    `;
  }

  private attachCartItemListeners(item: CartItem): void {
    const decreaseBtn = document.querySelector(
      `.cart-item [data-action="decrease"][data-item-id="${item.menuItem.id}"]`
    );
    const increaseBtn = document.querySelector(
      `.cart-item [data-action="increase"][data-item-id="${item.menuItem.id}"]`
    );
    const removeBtn = document.querySelector(
      `.remove-button[data-item-id="${item.menuItem.id}"]`
    );

    decreaseBtn?.addEventListener('click', () => {
      cart.updateQuantity(item.menuItem.id, item.quantity - 1);
    });

    increaseBtn?.addEventListener('click', () => {
      cart.updateQuantity(item.menuItem.id, item.quantity + 1);
    });

    removeBtn?.addEventListener('click', () => {
      cart.removeItem(item.menuItem.id);
    });
  }

  private setupEventListeners(): void {
    const backButton = document.getElementById('back-button');
    backButton?.addEventListener('click', () => {
      window.dispatchEvent(new CustomEvent('navigate', { detail: 'menu' }));
    });

    const clearCartButton = document.getElementById('clear-cart-button');
    clearCartButton?.addEventListener('click', () => {
      if (confirm('Sei sicuro di voler svuotare il carrello?')) {
        cart.clear();
      }
    });

    const instructionsTextarea = document.getElementById('special-instructions') as HTMLTextAreaElement;
    instructionsTextarea?.addEventListener('input', (e) => {
      this.specialInstructions = (e.target as HTMLTextAreaElement).value;
    });

    const placeOrderButton = document.getElementById('place-order-button');
    placeOrderButton?.addEventListener('click', () => {
      this.placeOrder();
    });

    const backToMenuButton = document.getElementById('back-to-menu-button');
    backToMenuButton?.addEventListener('click', () => {
      this.hideModal();
      window.dispatchEvent(new CustomEvent('navigate', { detail: 'menu' }));
    });

    const trackOrderButton = document.getElementById('track-order-button');
    trackOrderButton?.addEventListener('click', () => {
      this.hideModal();
      window.dispatchEvent(new CustomEvent('navigate', { detail: 'status' }));
    });
  }

  private updateTotals(): void {
    const buffetMode = cart.getBuffetMode();
    const subtotal = cart.getSubtotal();
    
    const totalElement = document.getElementById('total');
    if (totalElement) {
      totalElement.textContent = `€${subtotal.toFixed(2).replace('.', ',')}`;
    }
    
    // Show breakdown for buffet mode
    const summaryContainer = document.querySelector('.cart-summary');
    if (summaryContainer && buffetMode.isBuffet && buffetMode.category) {
      const buffetPrice = buffetMode.category.buffetPrice || 0;
      const buffetQuantity = parseInt(sessionStorage.getItem('buffetQuantity') || '1');
      const buffetTotal = buffetPrice * buffetQuantity;
      const additionalItems = this.cartItems.filter(item => item.menuItem.alwaysPriced === true);
      const additionalTotal = additionalItems.reduce((sum, item) => 
        sum + (item.menuItem.price * item.quantity), 0
      );
      
      // Update or create breakdown
      let breakdownEl = summaryContainer.querySelector('.total-breakdown');
      if (!breakdownEl) {
        breakdownEl = document.createElement('div');
        breakdownEl.className = 'total-breakdown';
        summaryContainer.insertBefore(breakdownEl, summaryContainer.querySelector('.cart-total'));
      }
      
      if (additionalTotal > 0) {
        breakdownEl.innerHTML = `
          <div class="breakdown-item">
            <span>Buffet ${buffetMode.category.name} (${buffetQuantity} ${buffetQuantity === 1 ? 'persona' : 'persone'})</span>
            <span>€${buffetTotal.toFixed(2).replace('.', ',')}</span>
          </div>
          <div class="breakdown-item">
            <span>Articoli aggiuntivi</span>
            <span>€${additionalTotal.toFixed(2).replace('.', ',')}</span>
          </div>
          <div class="breakdown-divider"></div>
        `;
      } else {
        breakdownEl.innerHTML = '';
      }
    }
  }

  private async placeOrder(): Promise<void> {
    if (this.cartItems.length === 0) {
      alert('Il tuo carrello è vuoto');
      return;
    }

    const tableId = this.getTableIdFromUrl();
    if (!tableId) {
      alert('ID tavolo non trovato. Scansiona nuovamente il codice QR.');
      return;
    }

    const placeOrderButton = document.getElementById('place-order-button') as HTMLButtonElement;
    if (placeOrderButton) {
      placeOrderButton.disabled = true;
      placeOrderButton.textContent = 'Invio ordine in corso...';
    }

    try {
      const buffetMode = cart.getBuffetMode();
      const buffetQuantity = parseInt(sessionStorage.getItem('buffetQuantity') || '1');
      
      const orderData: any = {
        tableId: parseInt(tableId),
        isBuffet: buffetMode.isBuffet,
        buffetCategoryId: buffetMode.category?.id,
        items: this.cartItems.map((item) => ({
          menuItemId: item.menuItem.id,
          quantity: item.quantity,
          notes: item.notes || this.specialInstructions,
        })),
      };

      // Add buffet quantity if in buffet mode
      if (buffetMode.isBuffet && buffetMode.category) {
        orderData.buffetQuantity = buffetQuantity;
      }

      console.log('📤 SENDING ORDER:', orderData);
      console.log('🎫 Buffet Mode:', buffetMode);
      console.log('👥 Buffet Quantity:', buffetQuantity);

      let order;
      if (networkStatus.isOnline) {
        try {
          order = await apiClient.createOrder(orderData);
          this.showConfirmation(order.id);
          cart.clear();
        } catch (error) {
          console.error('Failed to place order online, queuing:', error);
          await offlineQueue.addOrder(orderData);
          this.showOfflineConfirmation();
          cart.clear();
        }
      } else {
        await offlineQueue.addOrder(orderData);
        this.showOfflineConfirmation();
        cart.clear();
      }
    } catch (error) {
      console.error('Failed to place order:', error);
      alert('Impossibile inviare l\'ordine. Riprova.');
    } finally {
      if (placeOrderButton) {
        placeOrderButton.disabled = false;
        placeOrderButton.textContent = 'Invia Ordine';
      }
    }
  }

  private showConfirmation(orderId: string): void {
    const modal = document.getElementById('confirmation-modal');
    const orderNumber = document.getElementById('order-number');
    const modalIcon = modal?.querySelector('.modal-icon');
    const modalTitle = modal?.querySelector('.modal-title');
    const modalText = modal?.querySelector('.modal-text');
    
    if (modal && orderNumber && modalIcon && modalTitle && modalText) {
      // Reset to success state
      modalIcon.className = 'modal-icon success';
      modalIcon.textContent = '✓';
      modalTitle.textContent = 'Ordine Inviato con Successo!';
      modalText.textContent = 'Il tuo ordine è stato inviato in cucina e sarà preparato a breve.';
      orderNumber.textContent = `Ordine #${orderId.substring(0, 8)}`;
      modal.classList.remove('hidden');
      
      // Close modal when clicking overlay
      const overlay = modal.querySelector('.modal-overlay');
      overlay?.addEventListener('click', () => this.hideModal());
    }
  }

  private showOfflineConfirmation(): void {
    const modal = document.getElementById('confirmation-modal');
    const modalIcon = modal?.querySelector('.modal-icon') as HTMLElement;
    const modalTitle = modal?.querySelector('.modal-title');
    const modalText = modal?.querySelector('.modal-text');
    const orderNumber = document.getElementById('order-number');
    
    if (modal && modalTitle && modalText && orderNumber && modalIcon) {
      modalIcon.className = 'modal-icon';
      modalIcon.textContent = '📡';
      modalIcon.style.background = '#f59e0b';
      modalTitle.textContent = 'Ordine in Coda';
      modalText.textContent = 'Sei offline. Il tuo ordine sarà inviato automaticamente quando la connessione sarà ripristinata.';
      orderNumber.textContent = '';
      modal.classList.remove('hidden');
      
      // Close modal when clicking overlay
      const overlay = modal.querySelector('.modal-overlay');
      overlay?.addEventListener('click', () => this.hideModal());
    }
  }

  private hideModal(): void {
    const modal = document.getElementById('confirmation-modal');
    if (modal) {
      modal.classList.add('hidden');
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
