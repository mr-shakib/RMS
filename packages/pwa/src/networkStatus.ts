type NetworkStatusCallback = (isOnline: boolean) => void;

class NetworkStatus {
  private listeners: Set<NetworkStatusCallback> = new Set();
  private _isOnline: boolean = navigator.onLine;

  constructor() {
    window.addEventListener('online', this.handleOnline);
    window.addEventListener('offline', this.handleOffline);
  }

  private handleOnline = () => {
    this._isOnline = true;
    this.notifyListeners();
  };

  private handleOffline = () => {
    this._isOnline = false;
    this.notifyListeners();
  };

  private notifyListeners() {
    this.listeners.forEach((callback) => callback(this._isOnline));
  }

  get isOnline(): boolean {
    return this._isOnline;
  }

  subscribe(callback: NetworkStatusCallback): () => void {
    this.listeners.add(callback);
    // Return unsubscribe function
    return () => {
      this.listeners.delete(callback);
    };
  }

  destroy() {
    window.removeEventListener('online', this.handleOnline);
    window.removeEventListener('offline', this.handleOffline);
    this.listeners.clear();
  }
}

export const networkStatus = new NetworkStatus();
