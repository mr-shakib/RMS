import { MenuItem, CreateOrderDTO, Order, Category } from '@rms/shared';

export class APIError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public details?: any,
    public retryable: boolean = false
  ) {
    super(message);
    this.name = 'APIError';
  }
}

export class ApiClient {
  private baseUrl: string;
  private requestTimeout = 15000; // 15 seconds

  constructor(baseUrl?: string) {
    // Get API URL dynamically at runtime
    if (!baseUrl) {
      if (typeof window !== 'undefined') {
        const { protocol, hostname, port } = window.location;
        // Use port from URL if present and not empty, otherwise default to 5000
        const apiPort = (port && port.trim() !== '') ? port : '5000';
        this.baseUrl = `${protocol}//${hostname}:${apiPort}/api`;
      } else {
        this.baseUrl = 'http://localhost:5000/api';
      }
    } else {
      this.baseUrl = baseUrl;
    }
  }

  private async fetchWithTimeout(url: string, options: RequestInit = {}): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.requestTimeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new APIError('Request timeout. Please try again.', 0, null, true);
      }
      throw error;
    }
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const error = await response.json().catch(() => ({
        status: 'error',
        message: 'An error occurred',
      }));

      if (response.status === 400) {
        throw new APIError(
          error.message || 'Invalid request data',
          response.status,
          error.details
        );
      }

      if (response.status === 404) {
        throw new APIError(error.message || 'Resource not found', response.status);
      }

      if (response.status === 409) {
        throw new APIError(error.message || 'Resource conflict', response.status);
      }

      if (response.status >= 500) {
        throw new APIError(
          error.message || 'Server error occurred',
          response.status,
          null,
          error.retryable !== false
        );
      }

      throw new APIError(
        error.message || `HTTP ${response.status}: ${response.statusText}`,
        response.status
      );
    }

    return await response.json();
  }

  async getMenu(): Promise<MenuItem[]> {
    try {
      const url = `${this.baseUrl}/menu`;
      console.log('[API] Fetching menu from:', url);
      
      const response = await this.fetchWithTimeout(url);
      console.log('[API] Menu response status:', response.status, response.statusText);
      
      const data = await this.handleResponse<any>(response);
      console.log('[API] Menu data:', data);
      
      const menuItems = data.data?.menuItems || [];
      console.log('[API] Extracted menu items count:', menuItems.length);
      
      // DEBUG: Check category fields and alwaysPriced in ALL items
      console.log('[API] CHECKING ALL ITEMS FOR CATEGORY DATA:');
      menuItems.forEach((item: any) => {
        // Validate and fix alwaysPriced field
        if (item.alwaysPriced == null) {
          console.warn(`⚠️  Item "${item.name}" has null/undefined alwaysPriced, defaulting to false`);
          item.alwaysPriced = false;
        } else if (typeof item.alwaysPriced !== 'boolean') {
          console.warn(`⚠️  Item "${item.name}" has non-boolean alwaysPriced: ${item.alwaysPriced} (${typeof item.alwaysPriced}), converting to boolean`);
          item.alwaysPriced = Boolean(item.alwaysPriced);
        }
        
        if (item.buffetCategories && item.buffetCategories.length > 0) {
          console.log(`  ${item.name}:`);
          console.log(`    categoryId:`, item.categoryId);
          console.log(`    category:`, item.category?.name);
          console.log(`    alwaysPriced:`, item.alwaysPriced);
          console.log(`    buffetCategories:`, item.buffetCategories.map((bc: any) => bc.buffetCategory?.name));
        }
      });
      
      return menuItems;
    } catch (error) {
      console.error('[API] getMenu error:', error);
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new APIError('Network connection failed', 0, null, true);
      }
      throw error;
    }
  }

  async getCategories(): Promise<Category[]> {
    try {
      const url = `${this.baseUrl}/categories`;
      console.log('[API] Fetching categories from:', url);
      
      const response = await this.fetchWithTimeout(url);
      console.log('[API] Categories response status:', response.status, response.statusText);
      
      const data = await this.handleResponse<any>(response);
      console.log('[API] Categories data:', data);
      
      const categories = data.data?.categories || [];
      console.log('[API] Extracted categories count:', categories.length);
      
      return categories;
    } catch (error) {
      console.error('[API] getCategories error:', error);
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new APIError('Network connection failed', 0, null, true);
      }
      throw error;
    }
  }

  async getTable(tableId: number): Promise<any> {
    try {
      const url = `${this.baseUrl}/tables/${tableId}`;
      console.log('[API] Fetching table from:', url);
      
      const response = await this.fetchWithTimeout(url);
      console.log('[API] Response status:', response.status, response.statusText);
      
      const data = await this.handleResponse<any>(response);
      console.log('[API] Parsed response data:', data);
      
      const table = data.data?.table || data;
      console.log('[API] Extracted table:', table);
      
      return table;
    } catch (error) {
      console.error('[API] getTable error:', error);
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new APIError('Network connection failed', 0, null, true);
      }
      throw error;
    }
  }

  async createOrder(order: CreateOrderDTO): Promise<Order> {
    try {
      const response = await this.fetchWithTimeout(`${this.baseUrl}/order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(order),
      });
      const data = await this.handleResponse<any>(response);
      return data.data?.order || data;
    } catch (error) {
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new APIError('Network connection failed', 0, null, true);
      }
      throw error;
    }
  }

  async getOrderStatus(tableId: number): Promise<Order | null> {
    try {
      const response = await this.fetchWithTimeout(`${this.baseUrl}/order/${tableId}`);
      if (response.status === 404) {
        return null;
      }
      const data = await this.handleResponse<any>(response);
      return data.data?.order || null;
    } catch (error) {
      if (error instanceof APIError && error.statusCode === 404) {
        return null;
      }
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new APIError('Network connection failed', 0, null, true);
      }
      throw error;
    }
  }

  async getTableOrders(tableId: number): Promise<Order[]> {
    try {
      const response = await this.fetchWithTimeout(`${this.baseUrl}/order/${tableId}/all`);
      const data = await this.handleResponse<any>(response);
      return data.data?.orders || [];
    } catch (error) {
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new APIError('Network connection failed', 0, null, true);
      }
      throw error;
    }
  }
}

export const apiClient = new ApiClient();
