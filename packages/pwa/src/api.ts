import { MenuItem, CreateOrderDTO, Order, Category } from '@rms/shared';

// Get API URL dynamically
// In production, the PWA is served by the API server, so we use the same origin
// This ensures mobile devices use the correct LAN IP instead of localhost
function getApiUrl(): string {
  // If VITE_API_URL is set, use it (for development)
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  
  // In production, use the current origin (same server serving the PWA)
  // This automatically uses the correct IP address
  if (typeof window !== 'undefined') {
    const { protocol, hostname, port } = window.location;
    // Default to port 5000 if not specified
    const apiPort = port || '5000';
    return `${protocol}//${hostname}:${apiPort}`;
  }
  
  // Fallback (should never happen in browser)
  return 'http://localhost:5000';
}

const API_URL = getApiUrl();

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

  constructor(baseUrl: string = API_URL) {
    this.baseUrl = baseUrl;
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
      const response = await this.fetchWithTimeout(`${this.baseUrl}/menu`);
      const data = await this.handleResponse<any>(response);
      return data.data?.menuItems || [];
    } catch (error) {
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new APIError('Network connection failed', 0, null, true);
      }
      throw error;
    }
  }

  async getCategories(): Promise<Category[]> {
    try {
      const response = await this.fetchWithTimeout(`${this.baseUrl}/categories`);
      const data = await this.handleResponse<any>(response);
      return data.data?.categories || [];
    } catch (error) {
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
}

export const apiClient = new ApiClient();
