# Quick Start Guide - PWA Setup

## Problem: "Safari can't open the page"

This happens because the PWA needs to be served by the Express server, not as a separate application.

## Solution: One-Command Setup

Run this command from the root directory:

```bash
npm run setup:pwa
```

This will:
1. Detect your computer's IP address
2. Configure the PWA with the correct API URL
3. Build the PWA
4. Copy it to the server's public directory

## Start the Server

```bash
npm run dev:server
```

## Access the PWA

**From your computer:**
```
http://localhost:5000/?table=1
```

**From iPad/Phone (same WiFi network):**
```
http://[YOUR_IP]:5000/?table=1
```

Example: `http://192.168.1.100:5000/?table=1`

## How It Works

```
┌─────────────┐
│  QR Code    │  Scan with iPad
│  on Table   │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────┐
│  Express Server :5000       │
│  ┌─────────────────────┐    │
│  │  PWA (Static Files) │    │  Served from /public
│  └─────────────────────┘    │
│  ┌─────────────────────┐    │
│  │  API Routes         │    │  /api/*, /menu, /order
│  └─────────────────────┘    │
└─────────────────────────────┘
```

## QR Code URLs

Generate QR codes that point to:
```
http://[YOUR_SERVER_IP]:5000/?table=[TABLE_NUMBER]
```

Examples:
- Table 1: `http://192.168.1.100:5000/?table=1`
- Table 2: `http://192.168.1.100:5000/?table=2`
- Table 5: `http://192.168.1.100:5000/?table=5`

## Troubleshooting

### Still can't connect?

1. **Check server is running:**
   ```bash
   npm run dev:server
   # Should see: "🚀 Server running on http://localhost:5000"
   ```

2. **Test from your computer first:**
   ```
   http://localhost:5000/?table=1
   ```

3. **Verify IP address:**
   ```bash
   # Windows
   ipconfig
   
   # Mac/Linux
   ifconfig
   ```

4. **Check firewall:**
   - Allow Node.js through your firewall
   - Allow port 5000

5. **Same network:**
   - Both devices must be on the same WiFi

### Need to rebuild?

If you change the PWA code:
```bash
npm run setup:pwa
```

Then restart the server:
```bash
npm run dev:server
```

## Development Workflow

### Full Stack Development

```bash
# Terminal 1: Server + PWA
npm run dev:server

# Terminal 2: Desktop App
npm run dev:desktop
```

### PWA-Only Development

For faster PWA development (hot reload):

```bash
# Terminal 1: API Server
npm run dev:server

# Terminal 2: PWA Dev Server
npm run dev:pwa
```

Access at: `http://localhost:3001/?table=1`

**Note:** Remember to run `npm run setup:pwa` before final testing!

## Complete Setup (First Time)

```bash
# 1. Install dependencies
npm install

# 2. Setup database
npm run prisma:generate --workspace=packages/server
npm run prisma:migrate --workspace=packages/server
npm run prisma:seed --workspace=packages/server

# 3. Setup PWA
npm run setup:pwa

# 4. Start server
npm run dev:server

# 5. Start desktop app (optional)
npm run dev:desktop
```

## Testing Checklist

- [ ] Server starts: `npm run dev:server`
- [ ] Access from computer: `http://localhost:5000/?table=1`
- [ ] Menu loads
- [ ] Can add items to cart
- [ ] Can place order
- [ ] Access from iPad: `http://[YOUR_IP]:5000/?table=1`
- [ ] Order appears in desktop app (if running)

## Need Help?

See the full guide: [PWA_SETUP_GUIDE.md](./PWA_SETUP_GUIDE.md)
