// Declare electron API type
declare global {
  interface Window {
    electron?: {
      getServerInfo: () => Promise<{ serverUrl?: string; url?: string; port: number }>;
      showNotification: (title: string, body: string) => Promise<void>;
      getAppVersion: () => Promise<string>;
      restartServer: () => Promise<{ success: boolean; error?: string }>;
      getAutoLaunchStatus: () => Promise<boolean>;
      setAutoLaunch: (enable: boolean) => Promise<{ success: boolean; enabled?: boolean; error?: string }>;
      checkForUpdates: () => Promise<{ success: boolean; error?: string }>;
      installUpdate: () => Promise<{ success: boolean; error?: string }>;
      quitApp: () => Promise<{ success: boolean }>;
    };
  }
}

const DEFAULT_API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

interface RequestOptions extends RequestInit {
  requiresAuth?: boolean;
}

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

class APIClient {
  private baseURL: string;
  private initialized: boolean = false;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
    console.log('🔧 API Client constructed with base URL:', baseURL);
  }

  /**
   * Initialize API client with server URL from Electron
   */
  private async initialize(): Promise<void> {
    if (this.initialized) {
      console.log('✓ API Client already initialized with:', this.baseURL);
      return;
    }

    console.log('🔄 Initializing API Client...');

    // Check if running in Electron
    if (typeof window !== 'undefined' && window.electron) {
      console.log('🖥️  Running in Electron, getting server info...');
      try {
        const serverInfo = await window.electron.getServerInfo();
        console.log('📡 Server info from Electron:', serverInfo);
        const serverUrl = serverInfo.serverUrl || serverInfo.url || `http://localhost:${serverInfo.port}`;
        if (serverUrl) {
          this.baseURL = `${serverUrl}/api`;
          console.log('✅ API Client initialized with Electron server:', this.baseURL);
        }
      } catch (error) {
        console.warn('⚠️  Failed to get server info from Electron, using default URL:', this.baseURL);
        console.error('Error details:', error);
      }
    } else {
      console.log('🌐 Not running in Electron, using default URL:', this.baseURL);
    }

    this.initialized = true;
    console.log('✅ API Client initialization complete. Base URL:', this.baseURL);
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

    console.log(`🌐 API Request: ${restOptions.method || 'GET'} ${url}`);
    console.log('📋 Request headers:', requestHeaders);

    try {
      const response = await fetch(url, {
        ...restOptions,
        headers: requestHeaders,
      });

      console.log(`📥 API Response: ${response.status} ${response.statusText}`);

      if (!response.ok) {
        const error = await response.json().catch(() => ({
          status: 'error',
          message: 'An error occurred',
        }));

        // Handle authentication errors
        if (response.status === 401) {
          // Clear token and redirect to login
          if (typeof window !== 'undefined') {
            localStorage.removeItem('token');
            window.location.href = '/login';
          }
          throw new APIError(error.message || 'Authentication required', response.status, error);
        }

        // Handle authorization errors
        if (response.status === 403) {
          throw new APIError(error.message || 'Insufficient permissions', response.status, error);
        }

        // Handle not found errors
        if (response.status === 404) {
          throw new APIError(error.message || 'Resource not found', response.status, error);
        }

        // Handle validation errors
        if (response.status === 400) {
          throw new APIError(
            error.message || 'Invalid request data',
            response.status,
            error.details || error
          );
        }

        // Handle conflict errors
        if (response.status === 409) {
          throw new APIError(error.message || 'Resource conflict', response.status, error);
        }

        // Handle server errors
        if (response.status >= 500) {
          throw new APIError(
            error.message || 'Server error occurred',
            response.status,
            error,
            error.retryable !== false
          );
        }

        throw new APIError(
          error.message || `HTTP ${response.status}: ${response.statusText}`,
          response.status,
          error
        );
      }

      // Handle 204 No Content
      if (response.status === 204) {
        return {} as T;
      }

      return await response.json();
    } catch (error) {
      // Network errors
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new APIError(
          'Network connection failed. Please check your connection.',
          0,
          null,
          true
        );
      }

      // Re-throw APIError instances
      if (error instanceof APIError) {
        throw error;
      }

      // Wrap other errors
      if (error instanceof Error) {
        throw new APIError(error.message, 0, null, false);
      }

      throw new APIError('An unexpected error occurred', 0, null, false);
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
