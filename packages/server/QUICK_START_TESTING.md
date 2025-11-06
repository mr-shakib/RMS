# Quick Start: Testing WebSocket Implementation

Follow these steps to test the WebSocket server in 5 minutes!

## Step 1: Make Sure Server is Running

The server should already be running. Check the terminal for:
```
🔌 WebSocket server initialized
🚀 Server running on http://localhost:5000
```

If not running, start it:
```bash
cd packages/server
npm run dev
```

## Step 2: Install Socket.io Client

```bash
cd packages/server
npm install socket.io-client
```

## Step 3: Get a JWT Token

### Option A: Using PowerShell Script (Easiest)

```powershell
cd packages/server
.\test-websocket.ps1
```

This will:
- Login as admin
- Display your token
- Copy it to clipboard
- Show you the exact commands to run

### Option B: Get Token Only

```powershell
cd packages/server
.\get-token.ps1
```

### Option C: Manual Login

Use Postman, Thunder Client, or any HTTP client:

**Request:**
- Method: POST
- URL: `http://localhost:5000/api/auth/login`
- Headers: `Content-Type: application/json`
- Body:
  ```json
  {
    "username": "admin",
    "password": "admin123"
  }
  ```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": { ... }
}
```

Copy the token value.

## Step 4: Start the WebSocket Test Client

Open a **NEW terminal** (keep the server running in the first one):

```bash
cd packages/server
node test-websocket-client.js YOUR_TOKEN_HERE
```

Replace `YOUR_TOKEN_HERE` with the token from Step 3.

You should see:
```
🔌 Connecting to WebSocket server...

✅ Connected to WebSocket server
   Socket ID: abc123...

📡 Subscribing to rooms...
   ✓ Subscribed to orders room
   ✓ Subscribed to tables room
   ✓ Subscribed to KDS room
   ✓ Subscribed to table:1 room

👂 Listening for events...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Press Ctrl+C to exit
```

## Step 5: Trigger WebSocket Events

Open a **THIRD terminal** (keep both server and client running):

```bash
cd packages/server
node test-websocket-trigger.js YOUR_TOKEN_HERE
```

This will automatically:
1. Create a menu item → triggers `menu:updated`
2. Update table status → triggers `table:updated`
3. Create an order → triggers `order:created`
4. Update order status multiple times → triggers `order:updated`
5. Process payment → triggers `payment:completed`
6. Toggle menu availability → triggers `menu:updated`

## Step 6: Watch the Magic! ✨

Go back to the **test client terminal** (from Step 4).

You should see real-time events appearing:

```
🍽️  MENU UPDATED
   Item ID: cm123...
   Name: Test Burger
   Category: Main Course
   Price: $12.99
   Available: Yes

🪑 TABLE UPDATED
   Table ID: 1
   Name: Table 1
   Status: OCCUPIED

📦 ORDER CREATED
   Order ID: cm456...
   Table: 1
   Status: PENDING
   Total: $25.98
   Items: 1

🔄 ORDER UPDATED
   Order ID: cm456...
   Table: 1
   Status: PREPARING
   Total: $25.98

🔄 ORDER UPDATED
   Order ID: cm456...
   Table: 1
   Status: READY
   Total: $25.98

🔄 ORDER UPDATED
   Order ID: cm456...
   Table: 1
   Status: SERVED
   Total: $25.98

💰 PAYMENT COMPLETED
   Payment ID: cm789...
   Order ID: cm456...
   Amount: $25.98
   Method: CARD

🍽️  MENU UPDATED
   Item ID: cm123...
   Name: Test Burger
   Category: Main Course
   Price: $12.99
   Available: No
```

## Success! 🎉

If you see events appearing in real-time, your WebSocket implementation is working perfectly!

## What Just Happened?

1. **Server** is running with WebSocket support
2. **Test Client** connected and subscribed to rooms
3. **Trigger Script** made REST API calls
4. **Service Layer** emitted WebSocket events
5. **Test Client** received events in real-time

## Troubleshooting

### "Authentication required" error
- Your token might be expired or invalid
- Get a new token using Step 3

### "Cannot find module 'socket.io-client'"
- Run: `npm install socket.io-client` in packages/server

### No events appearing
- Make sure all 3 terminals are running:
  1. Server (`npm run dev`)
  2. Test client (`node test-websocket-client.js TOKEN`)
  3. Trigger script (`node test-websocket-trigger.js TOKEN`)

### Connection refused
- Make sure server is running on port 5000
- Check: `http://localhost:5000/api/health`

## Next Steps

Now that WebSocket is working, you can:

1. **Test with Multiple Clients**: Run the test client in multiple terminals to see how events broadcast to all subscribers

2. **Test Specific Rooms**: Modify the test client to subscribe to specific table rooms:
   ```javascript
   socket.emit('subscribe:table', 5);
   ```

3. **Test from Browser**: Open the browser console and use the Socket.io CDN to connect

4. **Integrate with Frontend**: Start building the Desktop App or PWA with WebSocket support

5. **Build Kitchen Display**: Create the KDS interface that subscribes to the `kds` room

## Manual Testing

You can also trigger events manually using any HTTP client:

### Create an Order
```bash
POST http://localhost:5000/api/orders
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "tableId": 1,
  "items": [
    {
      "menuItemId": "MENU_ITEM_ID",
      "quantity": 2
    }
  ]
}
```

### Update Order Status
```bash
PATCH http://localhost:5000/api/orders/ORDER_ID/status
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "status": "PREPARING"
}
```

Watch the test client terminal to see events in real-time!

## Clean Up

When done testing:
1. Press `Ctrl+C` in the test client terminal
2. Press `Ctrl+C` in the server terminal (if you want to stop it)

---

**Need more help?** Check `WEBSOCKET_TESTING_GUIDE.md` for detailed testing methods.
