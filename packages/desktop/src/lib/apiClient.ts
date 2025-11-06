// Declare electron API type
declare global {
  interface Window {
    electron?: {
      getServerInfo: () => Promise<{ serverUrl?: string; url?: string; port: number }>;
    };
  }
}

const DEFAULT_API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

interface RequestOptions extends RequestInit {
  requiresAuth?: boolean;
}

class APIClient {
  private baseURL: string;
  private initialized: boolean = false;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  /**
   * Initialize API client with server URL from Electron
   */
  private async initialize(): Promise<void> {
    if (this.initialized) return;

    // Check if running in Electron
    if (typeof window !== 'undefined' && window.electron) {
      try {
        const serverInfo = await window.electron.getServerInfo();
        const serverUrl = serverInfo.serverUrl || serverInfo.url || `http://localhost:${serverInfo.port}`;
        if (serverUrl) {
          this.baseURL = `${serverUrl}/api`;
          console.log('API Client initialized with Electron server:', this.baseURL);
        }
      } catch (error) {
        console.warn('Failed to get server info from Electron, using default URL:', error);
      }
    }

    this.initialized = true;
  }

  private getAuthHeaders(): HeadersInit {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  private async request<T>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<T> {
    // Initialize on first request
    await this.initialize();

    const { requiresAuth = true, headers = {}, ...restOptions } = options;

    const requestHeaders: HeadersInit = {
      'Content-Type': 'application/json',
      ...headers,
      ...(requiresAuth ? this.getAuthHeaders() : {}),
    };

    const url = `${this.baseURL}${endpoint}`;

    try {
      const response = await fetch(url, {
        ...restOptions,
        headers: requestHeaders,
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({
          message: 'An error occurred',
        }));
        throw new Error(error.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      // Handle 204 No Content
      if (response.status === 204) {
        return {} as T;
      }

      return await response.json();
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('An unexpected error occurred');
    }
  }

  // GET request
  async get<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  // POST request
  async post<T>(endpoint: string, data?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  // PATCH request
  async patch<T>(endpoint: string, data?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  // PUT request
  async put<T>(endpoint: string, data?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  // DELETE request
  async delete<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }
}

// Export singleton instance
export const apiClient = new APIClient(DEFAULT_API_BASE_URL);

// Export class for testing or custom instances
export default APIClient;
