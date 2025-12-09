// Script to manually clear service workers and caches
// Add this to your HTML with: <script src="/clear-sw.js"></script>
// Or run in browser console

(function() {
  if ('serviceWorker' in navigator) {
    // Clear all caches
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cacheName) {
          console.log('Deleting cache:', cacheName);
          return caches.delete(cacheName);
        })
      );
    }).then(function() {
      console.log('All caches cleared');
    });

    // Unregister all service workers
    navigator.serviceWorker.getRegistrations().then(function(registrations) {
      for(let registration of registrations) {
        console.log('Unregistering service worker:', registration);
        registration.unregister();
      }
    }).then(function() {
      console.log('All service workers unregistered');
      console.log('Please reload the page to see fresh content');
    });
  }
})();
