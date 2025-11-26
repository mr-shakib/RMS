import type { Order } from '@rms/shared';
import { apiClient } from './api';
import { io, Socket } from 'socket.io-client';

// Define OrderStatus locally to avoid module import issues
enum OrderStatus {
  PENDING = 'PENDING',
  PREPARING = 'PREPARING',
  READY = 'READY',
  SERVED = 'SERVED',
  PAID = 'PAID',
  CANCELLED = 'CANCELLED'
}

export class StatusPage {
  private container: HTMLElement;
  private order: Order | null = null;
  private orders: Order[] = [];
  private tableId: number | null = null;
  private pollInterval: number | null = null;
  private socket: Socket | null = null;

  constructor(container: HTMLElement) {
    this.container = container;
    this.init();
  }

  private async init(): Promise<void> {
    this.tableId = this.getTableIdFromUrl();
    if (!this.tableId) {
      this.showError('Table ID not found. Please scan the QR code again.');
      return;
    }

    this.render();
    await this.loadOrders();
    this.startPolling();
    this.connectWebSocket();
  }

  private render(): void {
    this.container.innerHTML = `
      <div class="header">
        <div class="header-content">
          <button class="back-button" id="back-button">← Back</button>
          <div class="header-title">Order Status</div>
        </div>
      </div>

      <div class="status-container">
        <div id="status-content"></div>
      </div>
    `;

    const backButton = document.getElementById('back-button');
    backButton?.addEventListener('click', () => {
      this.cleanup();
      window.dispatchEvent(new CustomEvent('navigate', { detail: 'menu' }));
    });
  }

  private async loadOrders(): Promise<void> {
    if (!this.tableId) return;

    try {
      this.orders = await apiClient.getTableOrders(this.tableId);
      // Default to the first order if available
      this.order = this.orders.length > 0 ? this.orders[0] : null;
      this.renderOrderStatus();
    } catch (error) {
      console.error('Failed to load orders:', error);
      this.showError('Failed to load orders. Please try again.');
    }
  }

  private renderOrderStatus(): void {
    const statusContent = document.getElementById('status-content');
    if (!statusContent) return;

    if (!this.order) {
      statusContent.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📋</div>
          <div class="empty-state-text">No active order for this table</div>
          <button class="button button-primary" id="browse-menu-button">
            Browse Menu
          </button>
        </div>
      `;

      const browseButton = document.getElementById('browse-menu-button');
      browseButton?.addEventListener('click', () => {
        this.cleanup();
        window.dispatchEvent(new CustomEvent('navigate', { detail: 'menu' }));
      });

      return;
    }

    const statusInfo = this.getStatusInfo(this.order.status);
    const estimatedTime = this.getEstimatedTime(this.order.status);

    statusContent.innerHTML = `
      ${this.orders.length > 1 ? this.renderOrderSelector() : ''}
      
      <div class="status-card">
        <div class="status-header">
          <div class="status-icon" style="background-color: ${statusInfo.color}">
            ${statusInfo.icon}
          </div>
          <div class="status-info">
            <div class="status-title">${statusInfo.title}</div>
            <div class="status-subtitle">${statusInfo.subtitle}</div>
          </div>
        </div>

        <div class="progress-bar">
          ${this.renderProgressBar(this.order.status)}
        </div>

        ${estimatedTime ? `
          <div class="estimated-time">
            <span class="estimated-time-label">Estimated time:</span>
            <span class="estimated-time-value">${estimatedTime}</span>
          </div>
        ` : ''}

        <div class="order-details">
          <div class="order-details-header">Order Details</div>
          <div class="order-number">Order #${this.order.id.substring(0, 8)}</div>
          <div class="order-time">Placed at ${new Date(this.order.createdAt).toLocaleTimeString()}</div>
        </div>

        ${this.renderKitchenInstructions()}

        ${this.renderOrderItems()}

        <div class="order-summary">
          <div class="order-summary-header">Order Summary</div>
          <div class="order-total">
            <span>Total Amount</span>
            <span class="order-total-value">$${this.order.total.toFixed(2)}</span>
          </div>
        </div>

        <div class="status-actions">
          <button class="button button-secondary" id="call-waiter-button">
            📞 Call Waiter
          </button>
          <button class="button button-primary" id="refresh-button">
            🔄 Refresh Status
          </button>
        </div>
      </div>
    `;

    // Attach event listeners for order selector
    if (this.orders.length > 1) {
      this.orders.forEach((_, index) => {
        const orderButton = document.getElementById(`order-select-${index}`);
        orderButton?.addEventListener('click', () => {
          this.selectOrder(index);
        });
      });
    }

    // Attach event listeners for actions
    const callWaiterButton = document.getElementById('call-waiter-button');
    callWaiterButton?.addEventListener('click', () => {
      this.callWaiter();
    });

    const refreshButton = document.getElementById('refresh-button');
    refreshButton?.addEventListener('click', () => {
      this.loadOrders();
    });
  }

  private renderOrderSelector(): string {
    return `
      <div class="order-selector">
        <div class="order-selector-title">Select Order to Track</div>
        <div class="order-selector-list">
          ${this.orders.map((order, index) => {
            const statusInfo = this.getStatusInfo(order.status);
            const isActive = this.order?.id === order.id;
            return `
              <button 
                class="order-selector-item ${isActive ? 'active' : ''}" 
                id="order-select-${index}"
              >
                <div class="order-selector-item-header">
                  <span class="order-selector-item-number">Order #${order.id.substring(0, 8)}</span>
                  <span class="order-selector-item-badge" style="background-color: ${statusInfo.color}">
                    ${statusInfo.title}
                  </span>
                </div>
                <div class="order-selector-item-details">
                  <span class="order-selector-item-time">${new Date(order.createdAt).toLocaleTimeString()}</span>
                  <span class="order-selector-item-total">$${order.total.toFixed(2)}</span>
                </div>
              </button>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }

  private renderOrderItems(): string {
    if (!this.order?.items || this.order.items.length === 0) {
      return '';
    }

    return `
      <div class="order-items">
        <div class="order-items-header">Order Items</div>
        <div class="order-items-list">
          ${this.order.items.map(item => {
            const itemTotal = item.quantity * item.price;
            return `
              <div class="order-item">
                <div class="order-item-details">
                  <div class="order-item-name">${item.menuItem?.name || 'Unknown Item'}</div>
                  ${item.notes ? `<div class="order-item-notes">Note: ${item.notes}</div>` : ''}
                </div>
                <div class="order-item-quantity">× ${item.quantity}</div>
                <div class="order-item-price">$${itemTotal.toFixed(2)}</div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }

  private renderKitchenInstructions(): string {
    const notes = (this.order?.items || [])
      .map((i) => i.notes)
      .filter((n): n is string => !!n && n.trim().length > 0);
    if (notes.length === 0) return '';
    const unique = Array.from(new Set(notes.map((n) => n.trim())));
    if (unique.length === 1) {
      return `
        <div class="order-details">
          <div class="order-details-header">Kitchen Instructions</div>
          <div>${unique[0]}</div>
        </div>
      `;
    }
    return `
      <div class="order-details">
        <div class="order-details-header">Kitchen Instructions</div>
        <div>
          ${unique.map((n) => `<div>• ${n}</div>`).join('')}
        </div>
      </div>
    `;
  }

  private selectOrder(index: number): void {
    this.order = this.orders[index];
    this.renderOrderStatus();
  }

  private renderProgressBar(status: OrderStatus): string {
    const steps = [
      { status: OrderStatus.PENDING, label: 'Received' },
      { status: OrderStatus.PREPARING, label: 'Preparing' },
      { status: OrderStatus.READY, label: 'Ready' },
      { status: OrderStatus.SERVED, label: 'Served' },
    ];

    const currentIndex = steps.findIndex((step) => step.status === status);

    return `
      <div class="progress-steps">
        ${steps
          .map((step, index) => {
            const isActive = index <= currentIndex;
            const isCurrent = index === currentIndex;
            return `
              <div class="progress-step ${isActive ? 'active' : ''} ${isCurrent ? 'current' : ''}">
                <div class="progress-step-circle">${index + 1}</div>
                <div class="progress-step-label">${step.label}</div>
              </div>
            `;
          })
          .join('<div class="progress-step-line"></div>')}
      </div>
    `;
  }

  private getStatusInfo(status: OrderStatus): {
    icon: string;
    title: string;
    subtitle: string;
    color: string;
  } {
    switch (status) {
      case OrderStatus.PENDING:
        return {
          icon: '📝',
          title: 'Order Received',
          subtitle: 'Your order has been received and will be prepared shortly',
          color: '#f59e0b',
        };
      case OrderStatus.PREPARING:
        return {
          icon: '👨‍🍳',
          title: 'Preparing Your Order',
          subtitle: 'Our kitchen is working on your delicious meal',
          color: '#0ea5e9',
        };
      case OrderStatus.READY:
        return {
          icon: '✅',
          title: 'Order Ready',
          subtitle: 'Your order is ready and will be served soon',
          color: '#10b981',
        };
      case OrderStatus.SERVED:
        return {
          icon: '🍽️',
          title: 'Order Served',
          subtitle: 'Enjoy your meal!',
          color: '#10b981',
        };
      case OrderStatus.PAID:
        return {
          icon: '💳',
          title: 'Order Completed',
          subtitle: 'Thank you for your order!',
          color: '#64748b',
        };
      case OrderStatus.CANCELLED:
        return {
          icon: '❌',
          title: 'Order Cancelled',
          subtitle: 'This order has been cancelled',
          color: '#ef4444',
        };
      default:
        return {
          icon: '❓',
          title: 'Unknown Status',
          subtitle: 'Please contact staff for assistance',
          color: '#64748b',
        };
    }
  }

  private getEstimatedTime(status: OrderStatus): string | null {
    switch (status) {
      case OrderStatus.PENDING:
        return '15-20 minutes';
      case OrderStatus.PREPARING:
        return '10-15 minutes';
      case OrderStatus.READY:
        return 'Soon';
      default:
        return null;
    }
  }

  private startPolling(): void {
    // Poll every 10 seconds
    this.pollInterval = window.setInterval(() => {
      this.loadOrders();
    }, 10000);
  }

  private connectWebSocket(): void {
    if (!this.tableId) return;

    try {
      // Get API URL dynamically - same logic as api.ts
      let API_URL: string;
      if (import.meta.env.VITE_API_URL) {
        API_URL = import.meta.env.VITE_API_URL;
      } else if (typeof window !== 'undefined') {
        const { protocol, hostname, port } = window.location;
        // Use port from URL if present and not empty, otherwise default to 5000
        const apiPort = (port && port.trim() !== '') ? port : '5000';
        API_URL = `${protocol}//${hostname}:${apiPort}`;
      } else {
        API_URL = 'http://localhost:5000';
      }

      this.socket = io(API_URL);

      this.socket.on('connect', () => {
        console.log('[WebSocket] Connected');
        // Subscribe to table-specific updates
        this.socket?.emit('subscribe:table', this.tableId);
      });

      this.socket.on('order:updated', (updatedOrder: Order) => {
        if (updatedOrder.tableId === this.tableId) {
          console.log('[WebSocket] Order updated:', updatedOrder);
          this.order = updatedOrder;
          this.renderOrderStatus();
        }
      });

      this.socket.on('disconnect', () => {
        console.log('[WebSocket] Disconnected');
      });
    } catch (error) {
      console.error('[WebSocket] Connection failed:', error);
      // Continue with polling fallback
    }
  }

  private callWaiter(): void {
    // This is a placeholder for the optional "Call Waiter" feature
    // In a real implementation, this could send a notification to staff
    alert('A waiter has been notified and will be with you shortly!');
  }

  private showError(message: string): void {
    const statusContent = document.getElementById('status-content');
    if (statusContent) {
      statusContent.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">⚠️</div>
          <div class="empty-state-text">${message}</div>
        </div>
      `;
    }
  }

  private getTableIdFromUrl(): number | null {
    const params = new URLSearchParams(window.location.search);
    const tableId = params.get('table');
    return tableId ? parseInt(tableId) : null;
  }

  private cleanup(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }

    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  destroy(): void {
    this.cleanup();
  }
}
