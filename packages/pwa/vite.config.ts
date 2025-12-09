import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  optimizeDeps: {
    include: ['@rms/shared']
  },
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      strategies: 'generateSW',
      injectRegister: 'auto',
      manifest: {
        name: 'Restaurant Ordering System',
        short_name: 'RMS Order',
        description: 'Customer ordering system for restaurant tables',
        start_url: '/',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#c9a961',
        orientation: 'portrait',
        icons: [
          {
            src: '/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable',
          },
          {
            src: '/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,jpg,jpeg,svg,ico}'],
        cleanupOutdatedCaches: true,
        skipWaiting: true,
        clientsClaim: true,
        // Add cache busting for HTML files
        navigateFallback: null,
        // Prevent caching of HTML in production to ensure updates are seen
        navigateFallbackDenylist: [/^\/(api|admin)/],
        runtimeCaching: [
          {
            urlPattern: /^https?:\/\/.*\/menu$/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'menu-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 5, // 5 minutes
              },
              networkTimeoutSeconds: 10,
            },
          },
          {
            urlPattern: /\.(png|jpg|jpeg|svg|gif)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'image-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
              },
            },
          },
          // Use NetworkFirst for CSS and JS to ensure updates are fetched
          {
            urlPattern: /\.(js|css)$/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'assets-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 7, // 7 days
              },
              networkTimeoutSeconds: 5,
            },
          },
          // Use NetworkFirst for HTML pages
          {
            urlPattern: /\.html$/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'html-cache',
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 60 * 60 * 24, // 1 day
              },
              networkTimeoutSeconds: 3,
            },
          },
        ],
      },
      devOptions: {
        enabled: false, // Disable service worker in development
        type: 'module',
      },
    }),
  ],
  build: {
    target: 'es2022',
    outDir: 'dist',
    rollupOptions: {
      output: {
        manualChunks: undefined,
      },
    },
    // Add versioning to bust cache on updates
    assetsInlineLimit: 0,
  },
  server: {
    port: 3001,
    // Disable caching during development
    headers: {
      'Cache-Control': 'no-store',
    },
  },
});
