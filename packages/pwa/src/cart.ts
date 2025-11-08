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
    return Array.from(this.items.values()).reduce(
      (total, item) => total + item.menuItem.price * item.quantity,
      0
    );
  }

  clear(): void {
    this.items.clear();
    this.isBuffet = false;
    this.buffetCategory = null;
    this.saveToStorage();
    this.notifyListeners();
  }

  setBuffetMode(isBuffet: boolean, category: Category | null): void {
    this.isBuffet = isBuffet;
    this.buffetCategory = category;
    if (isBuffet) {
      // Clear cart when switching to buffet mode
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
    const data = {
      items: this.getItems(),
      isBuffet: this.isBuffet,
      buffetCategory: this.buffetCategory
    };
    localStorage.setItem('rms-cart', JSON.stringify(data));
  }

  loadFromStorage(): void {
    try {
      const stored = localStorage.getItem('rms-cart');
      if (stored) {
        const data = JSON.parse(stored);
        
        // Handle old format (array) or new format (object)
        if (Array.isArray(data)) {
          data.forEach((item: CartItem) => {
            this.items.set(item.menuItem.id, item);
          });
        } else {
          this.isBuffet = data.isBuffet || false;
          this.buffetCategory = data.buffetCategory || null;
          (data.items || []).forEach((item: CartItem) => {
            this.items.set(item.menuItem.id, item);
          });
        }
        
        this.notifyListeners();
      }
    } catch (error) {
      console.error('Failed to load cart from storage:', error);
    }
  }
}

export const cart = new Cart();
