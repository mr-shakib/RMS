import { CreateOrderDTO } from '@rms/shared';

const DB_NAME = 'rms-offline-queue';
const DB_VERSION = 1;
const STORE_NAME = 'orders';

interface QueuedOrder {
  id: string;
  order: CreateOrderDTO;
  timestamp: number;
  retries: number;
}

class OfflineQueue {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      };
    });
  }

  async addOrder(order: CreateOrderDTO): Promise<string> {
    if (!this.db) await this.init();

    const queuedOrder: QueuedOrder = {
      id: `order-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      order,
      timestamp: Date.now(),
      retries: 0,
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.add(queuedOrder);

      request.onsuccess = () => resolve(queuedOrder.id);
      request.onerror = () => reject(request.error);
    });
  }

  async getQueuedOrders(): Promise<QueuedOrder[]> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async removeOrder(id: string): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async updateRetries(id: string, retries: number): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const getRequest = store.get(id);

      getRequest.onsuccess = () => {
        const order = getRequest.result;
        if (order) {
          order.retries = retries;
          const putRequest = store.put(order);
          putRequest.onsuccess = () => resolve();
          putRequest.onerror = () => reject(putRequest.error);
        } else {
          resolve();
        }
      };
      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  async syncQueue(apiUrl: string): Promise<{ success: number; failed: number; errors: string[] }> {
    const orders = await this.getQueuedOrders();
    let success = 0;
    let failed = 0;
    const errors: string[] = [];
    const maxRetries = 5;

    for (const queuedOrder of orders) {
      try {
        // Skip orders that have exceeded max retries
        if (queuedOrder.retries >= maxRetries) {
          console.warn('[OfflineQueue] Order exceeded max retries:', queuedOrder.id);
          errors.push(`Order ${queuedOrder.id} exceeded max retries`);
          failed++;
          continue;
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

        const response = await fetch(`${apiUrl}/order`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(queuedOrder.order),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          await this.removeOrder(queuedOrder.id);
          success++;
          console.log('[OfflineQueue] ✅ Successfully synced order:', queuedOrder.id);
        } else {
          const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
          
          // Don't retry client errors (400-499) except 408 (timeout) and 429 (rate limit)
          if (response.status >= 400 && response.status < 500 && 
              response.status !== 408 && response.status !== 429) {
            await this.removeOrder(queuedOrder.id);
            errors.push(`Order ${queuedOrder.id}: ${errorData.message || 'Client error'}`);
            console.error('[OfflineQueue] ❌ Client error, removing order:', queuedOrder.id, errorData);
          } else {
            // Retry server errors and specific client errors
            await this.updateRetries(queuedOrder.id, queuedOrder.retries + 1);
            errors.push(`Order ${queuedOrder.id}: ${errorData.message || 'Server error'}`);
            console.error('[OfflineQueue] ⚠️  Server error, will retry:', queuedOrder.id);
          }
          failed++;
        }
      } catch (error) {
        // Network error or timeout, keep in queue for retry
        await this.updateRetries(queuedOrder.id, queuedOrder.retries + 1);
        failed++;
        
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        errors.push(`Order ${queuedOrder.id}: ${errorMessage}`);
        console.error('[OfflineQueue] ⚠️  Network error, will retry:', queuedOrder.id, errorMessage);
      }
    }

    return { success, failed, errors };
  }

  async clearQueue(): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}

export const offlineQueue = new OfflineQueue();
