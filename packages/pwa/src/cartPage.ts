import { cart, CartItem } from './cart';
import { apiClient } from './api';
import { offlineQueue } from './offlineQueue';
import { networkStatus } from './networkStatus';

export class CartPage {
  private container: HTMLElement;
  private cartItems: CartItem[] = [];
  private taxPercentage: number = 10;
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
          <button class="back-button" id="back-button">← Back</button>
          <div class="header-title">Your Cart</div>
        </div>
      </div>

      <div class="cart-container">
        <div id="cart-items"></div>

        <div class="cart-section">
          <label class="cart-label">Special Instructions (Optional)</label>
          <textarea
            id="special-instructions"
            class="cart-textarea"
            placeholder="Any special requests or dietary requirements..."
            rows="3"
          ></textarea>
        </div>

        <div class="cart-section">
          <div class="cart-totals">
            <div class="cart-total-row">
              <span>Subtotal</span>
              <span id="subtotal">$0.00</span>
            </div>
            <div class="cart-total-row">
              <span>Tax (${this.taxPercentage}%)</span>
              <span id="tax">$0.00</span>
            </div>
            <div class="cart-total-row cart-total-final">
              <span>Total</span>
              <span id="total">$0.00</span>
            </div>
          </div>
        </div>

        <div class="cart-actions">
          <button class="button button-secondary" id="clear-cart-button">
            Clear Cart
          </button>
          <button class="button button-primary" id="place-order-button">
            Place Order
          </button>
        </div>
      </div>

      <div class="modal hidden" id="confirmation-modal">
        <div class="modal-overlay"></div>
        <div class="modal-content">
          <div class="modal-body">
            <div class="modal-icon success">✓</div>
            <h2 class="modal-title">Order Placed Successfully!</h2>
            <p class="modal-text">Your order has been sent to the kitchen and will be prepared shortly.</p>
            <p class="modal-order-number" id="order-number"></p>
            <div class="modal-actions">
              <button class="button button-secondary" id="back-to-menu-button">
                Back to Menu
              </button>
              <button class="button button-primary" id="track-order-button">
                Track Order
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
          <div class="empty-cart-text">Your cart is empty</div>
          <button class="button button-primary" id="browse-menu-button">
            Browse Menu
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
      buffetBanner = `
        <div class="buffet-banner" style="margin-bottom: 1rem;">
          <div class="buffet-banner-title">🎉 ${buffetMode.category.name}</div>
          <div class="buffet-banner-subtitle">
            All-you-can-eat for $${(buffetMode.category.buffetPrice || 0).toFixed(2)}
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
      ? item.menuItem.price.toFixed(2) 
      : '0.00';
    const itemTotal = isBuffet ? 'Included' : `$${(item.menuItem.price * item.quantity).toFixed(2)}`;

    return `
      <div class="cart-item" data-item-id="${item.menuItem.id}">
        <div class="cart-item-info">
          <div class="cart-item-name">${item.menuItem.name}</div>
          <div class="cart-item-price">${isBuffet ? 'Buffet Item' : `$${price} each`}</div>
          ${item.notes ? `<div class="cart-item-notes">Note: ${item.notes}</div>` : ''}
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
      if (confirm('Are you sure you want to clear your cart?')) {
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
    let subtotal = 0;

    if (buffetMode.isBuffet && buffetMode.category) {
      subtotal = buffetMode.category.buffetPrice || 0;
    } else {
      subtotal = cart.getSubtotal();
    }

    const tax = subtotal * (this.taxPercentage / 100);
    const total = subtotal + tax;

    const subtotalElement = document.getElementById('subtotal');
    const taxElement = document.getElementById('tax');
    const totalElement = document.getElementById('total');

    if (subtotalElement) subtotalElement.textContent = `$${subtotal.toFixed(2)}`;
    if (taxElement) taxElement.textContent = `$${tax.toFixed(2)}`;
    if (totalElement) totalElement.textContent = `$${total.toFixed(2)}`;
  }

  private async placeOrder(): Promise<void> {
    if (this.cartItems.length === 0) {
      alert('Your cart is empty');
      return;
    }

    const tableId = this.getTableIdFromUrl();
    if (!tableId) {
      alert('Table ID not found. Please scan the QR code again.');
      return;
    }

    const placeOrderButton = document.getElementById('place-order-button') as HTMLButtonElement;
    if (placeOrderButton) {
      placeOrderButton.disabled = true;
      placeOrderButton.textContent = 'Placing Order...';
    }

    try {
      const buffetMode = cart.getBuffetMode();
      
      const orderData = {
        tableId: parseInt(tableId),
        isBuffet: buffetMode.isBuffet,
        buffetCategoryId: buffetMode.category?.id,
        items: this.cartItems.map((item) => ({
          menuItemId: item.menuItem.id,
          quantity: item.quantity,
          notes: item.notes || this.specialInstructions,
        })),
      };

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
      alert('Failed to place order. Please try again.');
    } finally {
      if (placeOrderButton) {
        placeOrderButton.disabled = false;
        placeOrderButton.textContent = 'Place Order';
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
      modalTitle.textContent = 'Order Placed Successfully!';
      modalText.textContent = 'Your order has been sent to the kitchen and will be prepared shortly.';
      orderNumber.textContent = `Order #${orderId.substring(0, 8)}`;
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
      modalTitle.textContent = 'Order Queued';
      modalText.textContent = 'You are offline. Your order will be sent automatically when connection is restored.';
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
