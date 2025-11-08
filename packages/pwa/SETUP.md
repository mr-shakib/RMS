# PWA Setup Guide

## Prerequisites

- Node.js 20+ and npm 10+
- Access to the Express API server (running on localhost or LAN)

## Installation

1. **Install dependencies:**
   ```bash
   cd packages/pwa
   npm install
   ```

2. **Configure environment:**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and set the API URL:
   ```env
   # For local development
   VITE_API_URL=http://localhost:5000
   
   # For production (use server's LAN IP)
   VITE_API_URL=http://192.168.1.100:5000
   ```

## Development

Start the development server:

```bash
npm run dev
```

The PWA will be available at `http://localhost:3001`

To test with a table ID, add the query parameter:
```
http://localhost:3001/?table=5
```

## Building for Production

Build the PWA:

```bash
npm run build
```

The production files will be in the `dist/` directory.

## Deployment

### Option 1: Serve from Express Server

1. Build the PWA
2. Copy the contents of `dist/` to the server's public directory
3. The server will serve the PWA at the root path

```bash
npm run build
cp -r dist/* ../server/public/
```

### Option 2: Separate Hosting

1. Build the PWA
2. Deploy the `dist/` directory to any static hosting service
3. Ensure CORS is configured on the API server to allow requests from the PWA domain

## Testing

### Local Testing

1. Start the API server: `npm run dev --workspace=packages/server`
2. Start the PWA: `npm run dev --workspace=packages/pwa`
3. Open `http://localhost:3001/?table=1` in your browser

### Network Testing (iPad/Tablet)

1. Find your computer's LAN IP address:
   - Windows: `ipconfig`
   - Mac/Linux: `ifconfig` or `ip addr`

2. Start both server and PWA in development mode

3. On your iPad/tablet, navigate to:
   ```
   http://[YOUR_IP]:3001/?table=1
   ```

4. Test the following:
   - Menu browsing and search
   - Adding items to cart
   - Placing an order
   - Tracking order status
   - Offline functionality (turn off WiFi)

### Production Testing

1. Build and deploy the PWA
2. Generate QR codes for tables (from desktop app)
3. Scan QR code with iPad/tablet
4. Test complete order flow

## Troubleshooting

### PWA not loading

- Check that the API server is running
- Verify the `VITE_API_URL` is correct
- Check browser console for errors
- Ensure the device is on the same network as the server

### Service Worker not registering

- Service workers require HTTPS in production (or localhost in development)
- Check browser console for service worker errors
- Clear browser cache and reload

### Offline queue not working

- Check that IndexedDB is supported in the browser
- Verify service worker is registered
- Check browser console for IndexedDB errors

### WebSocket connection failing

- Verify Socket.io server is running on the API server
- Check CORS configuration on the server
- The app will fall back to polling if WebSocket fails

### Menu not loading

- Verify the API server has menu items in the database
- Check network tab in browser dev tools
- Ensure `/menu` endpoint is accessible

## Browser Compatibility

Tested and supported on:
- Safari (iOS 14+)
- Chrome (Android 10+)
- Chrome/Edge (Desktop)
- Firefox (Desktop)

## Performance Tips

1. **Images**: Use optimized images for menu items (WebP format, max 800x600px)
2. **Caching**: Service worker caches menu data for 5 minutes
3. **Network**: Use WiFi for best performance
4. **Devices**: Test on actual iPad/tablet devices for accurate performance

## Security Notes

- The PWA is designed for use on a local network only
- No authentication is required for customers
- Orders are associated with table IDs only
- Do not expose the API server to the public internet without proper security measures

## Support

For issues or questions, refer to:
- Main README: `../../README.md`
- API Documentation: `../server/README.md`
- Implementation Details: `IMPLEMENTATION.md`
