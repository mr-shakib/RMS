import { MenuItem, Category } from '@rms/shared';

export interface CartItem {
  menuItem: MenuItem;
  quantity: number;
  notes?: string;
}

type CartChangeCallback = (cart: CartItem[]) => void;

class Cart {
  private items: Map<string, CartItem> = new Map();
  private listeners: Set<CartChangeCallback> = new Set();
  private isBuffet: boolean = false;
  private buffetCategory: Category | null = null;
  private saveTimeout: number | null = null;

  addItem(menuItem: MenuItem, quantity: number = 1): void {
    const existingItem = this.items.get(menuItem.id);
    
    if (existingItem) {
      existingItem.quantity += quantity;
    } else {
      this.items.set(menuItem.id, {
        menuItem,
        quantity,
      });
    }
    
    this.saveToStorage();
    this.notifyListeners();
  }

  removeItem(menuItemId: string): void {
    this.items.delete(menuItemId);
    this.saveToStorage();
    this.notifyListeners();
  }

  updateQuantity(menuItemId: string, quantity: number): void {
    const item = this.items.get(menuItemId);
    if (item) {
      if (quantity <= 0) {
        this.removeItem(menuItemId);
      } else {
        item.quantity = quantity;
        this.saveToStorage();
        this.notifyListeners();
      }
    }
  }

  updateNotes(menuItemId: string, notes: string): void {
    const item = this.items.get(menuItemId);
    if (item) {
      item.notes = notes;
      this.saveToStorage();
      this.notifyListeners();
    }
  }

  getItems(): CartItem[] {
    return Array.from(this.items.values());
  }

  getItemCount(): number {
    return Array.from(this.items.values()).reduce(
      (total, item) => total + item.quantity,
      0
    );
  }

  getSubtotal(): number {
    let subtotal = 0;
    
    // If buffet mode, include buffet price once
    if (this.isBuffet && this.buffetCategory) {
      subtotal += this.buffetCategory.buffetPrice || 0;
    }
    
    // Add prices for items
    Array.from(this.items.values()).forEach(item => {
      // In buffet mode, only add price for alwaysPriced items
      if (this.isBuffet) {
        if (item.menuItem.alwaysPriced === true) {
          subtotal += item.menuItem.price * item.quantity;
        }
        // Items without alwaysPriced or with false don't add to subtotal
      } else {
        // Regular mode: all items add to subtotal
        subtotal += item.menuItem.price * item.quantity;
      }
    });
    
    return subtotal;
  }

  clear(): void {
    this.items.clear();
    this.isBuffet = false;
    this.buffetCategory = null;
    this.saveToStorage();
    this.notifyListeners();
  }

  setBuffetMode(isBuffet: boolean, category: Category | null): void {
    const wasBuffet = this.isBuffet;
    const wasSameCategory = this.buffetCategory?.id === category?.id;
    
    this.isBuffet = isBuffet;
    this.buffetCategory = category;
    
    // Only clear cart when switching FROM non-buffet TO buffet mode
    // or when switching between different buffet categories
    if (isBuffet && (!wasBuffet || !wasSameCategory)) {
      console.log('[Cart] Switching to buffet mode or different category, clearing cart');
      this.items.clear();
    }
    
    this.saveToStorage();
    this.notifyListeners();
  }

  getBuffetMode(): { isBuffet: boolean; category: Category | null } {
    return {
      isBuffet: this.isBuffet,
      category: this.buffetCategory
    };
  }

  subscribe(callback: CartChangeCallback): () => void {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  private notifyListeners(): void {
    const items = this.getItems();
    this.listeners.forEach((callback) => callback(items));
  }

  private saveToStorage(): void {
    // Debounce saves to avoid blocking UI on rapid clicks
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
    
    this.saveTimeout = window.setTimeout(() => {
      try {
        // Only save IDs and quantities, not full MenuItem objects (too large/circular refs)
        const data = {
          items: this.getItems().map(item => ({
            menuItemId: item.menuItem.id,
            quantity: item.quantity,
            notes: item.notes
          })),
          isBuffet: this.isBuffet,
          buffetCategory: this.buffetCategory ? {
            id: this.buffetCategory.id,
            name: this.buffetCategory.name,
            buffetPrice: this.buffetCategory.buffetPrice,
            isBuffet: this.buffetCategory.isBuffet
          } : null
        };
        localStorage.setItem('rms-cart', JSON.stringify(data));
      } catch (error) {
        console.error('[Cart] Failed to save to storage:', error);
        // Don't throw - allow app to continue even if storage fails
      }
      this.saveTimeout = null;
    }, 100); // Save after 100ms of no activity
  }

  loadFromStorage(menuItems?: MenuItem[]): void {
    try {
      const stored = localStorage.getItem('rms-cart');
      if (stored) {
        const data = JSON.parse(stored);
        
        // Handle old format (array with full objects) or new format (IDs only)
        if (Array.isArray(data)) {
          // Old format - try to use it if it has full MenuItem objects
          data.forEach((item: CartItem) => {
            if (item.menuItem && item.menuItem.id) {
              this.items.set(item.menuItem.id, item);
            }
          });
        } else if (data.items) {
          // New format - need to reconstruct from menu items if provided
          this.isBuffet = data.isBuffet || false;
          this.buffetCategory = data.buffetCategory || null;
          
          if (menuItems && menuItems.length > 0) {
            // Reconstruct cart items from IDs
            data.items.forEach((savedItem: any) => {
              const menuItem = menuItems.find(mi => mi.id === savedItem.menuItemId);
              if (menuItem) {
                this.items.set(menuItem.id, {
                  menuItem,
                  quantity: savedItem.quantity,
                  notes: savedItem.notes
                });
              }
            });
          }
          // If no menuItems provided, cart will be empty until menu loads
        }
        
        this.notifyListeners();
      }
    } catch (error) {
      console.error('[Cart] Failed to load from storage:', error);
      // Clear corrupted data
      localStorage.removeItem('rms-cart');
    }
  }
}

export const cart = new Cart();
