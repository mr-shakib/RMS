export const APP_VERSION = '1.0.1'; // Increment this on every deployment
export const CACHE_VERSION = 'v1.0.1';

// Force reload if version mismatch
export function checkVersion() {
  const storedVersion = localStorage.getItem('app_version');
  
  if (storedVersion && storedVersion !== APP_VERSION) {
    console.log(`Version changed from ${storedVersion} to ${APP_VERSION}, clearing cache...`);
    
    // Clear all caches
    if ('caches' in window) {
      caches.keys().then(keys => {
        keys.forEach(key => caches.delete(key));
      });
    }
    
    // Unregister service workers
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(registrations => {
        registrations.forEach(registration => registration.unregister());
      });
    }
    
    // Clear local storage except essentials
    const tableId = localStorage.getItem('tableId');
    const tableName = localStorage.getItem('tableName');
    localStorage.clear();
    if (tableId) localStorage.setItem('tableId', tableId);
    if (tableName) localStorage.setItem('tableName', tableName);
    
    // Update version and reload
    localStorage.setItem('app_version', APP_VERSION);
    window.location.reload();
  } else if (!storedVersion) {
    // First time, just store version
    localStorage.setItem('app_version', APP_VERSION);
  }
}
