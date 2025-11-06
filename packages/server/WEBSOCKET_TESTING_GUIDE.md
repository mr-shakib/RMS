# WebSocket Testing Guide

This guide provides multiple ways to test the WebSocket implementation.

## Prerequisites

1. Server must be running: `npm run dev` (in packages/server)
2. You need a valid JWT token (see "Getting a JWT Token" below)

## Getting a JWT Token

### Option 1: Using curl (Command Line)

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

### Option 2: Using PowerShell

```powershell
$body = @{
    username = "admin"
    password = "admin123"
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "http://localhost:5000/api/auth/login" `
    -Method POST `
    -ContentType "application/json" `
    -Body $body

$response.token
```

### Option 3: Using Postman or Thunder Client

1. Create a POST request to `http://localhost:5000/api/auth/login`
2. Set Content-Type header to `application/json`
3. Body (JSON):
   ```json
   {
     "username": "admin",
     "password": "admin123"
   }
   ```
4. Copy the token from the response

---

## Method 1: Automated Test Scripts (Recommended)

### Step 1: Install socket.io-client

```bash
cd packages/server
npm install socket.io-client
```

### Step 2: Start the Test Client

Open a terminal and run:

```bash
node test-websocket-client.js YOUR_JWT_TOKEN_HERE
```

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
```

### Step 3: Trigger Events

Open another terminal and run:

```bash
node test-websocket-trigger.js YOUR_JWT_TOKEN_HERE
```

This will:
1. Create a menu item
2. Update table status
3. Create an order
4. Update order status (PREPARING → READY → SERVED)
5. Process payment
6. Toggle menu availability

Watch the test client terminal to see real-time events!

---

## Method 2: Manual Testing with Browser Console

### Step 1: Include Socket.io Client in HTML

Create a test HTML file or use browser console:

```html
<!DOCTYPE html>
<html>
<head>
  <title>WebSocket Test</title>
  <script src="https://cdn.socket.io/4.6.0/socket.io.min.js"></script>
</head>
<body>
  <h1>WebSocket Test Client</h1>
  <div id="events"></div>

  <script>
    const token = 'YOUR_JWT_TOKEN_HERE';
    
    const socket = io('http://localhost:5000', {
      auth: { token }
    });

    socket.on('connect', () => {
      console.log('Connected!');
      socket.emit('subscribe:orders');
      socket.emit('subscribe:tables');
      socket.emit('subscribe:kds');
    });

    socket.on('order:created', (order) => {
      console.log('Order created:', order);
      document.getElementById('events').innerHTML += 
        `<p>Order created: ${order.id}</p>`;
    });

    socket.on('order:updated', (order) => {
      console.log('Order updated:', order);
      document.getElementById('events').innerHTML += 
        `<p>Order updated: ${order.id} - ${order.status}</p>`;
    });

    socket.on('table:updated', (table) => {
      console.log('Table updated:', table);
      document.getElementById('events').innerHTML += 
        `<p>Table updated: ${table.name} - ${table.status}</p>`;
    });

    socket.on('menu:updated', (menuItem) => {
      console.log('Menu updated:', menuItem);
      document.getElementById('events').innerHTML += 
        `<p>Menu updated: ${menuItem.name}</p>`;
    });

    socket.on('payment:completed', (payment) => {
      console.log('Payment completed:', payment);
      document.getElementById('events').innerHTML += 
        `<p>Payment completed: ${payment.id}</p>`;
    });
  </script>
</body>
</html>
```

---

## Method 3: Using Postman WebSocket

1. Open Postman
2. Create a new WebSocket request
3. URL: `ws://localhost:5000`
4. Add authentication in the connection settings:
   ```json
   {
     "auth": {
       "token": "YOUR_JWT_TOKEN_HERE"
     }
   }
   ```
5. Connect and send subscription messages:
   ```json
   {"event": "subscribe:orders"}
   ```

---

## Method 4: Check Server Logs

The server logs WebSocket events. Watch for:

```
✅ Client connected: abc123 (User: admin)
📦 admin subscribed to orders room
🪑 admin subscribed to tables room
👨‍🍳 admin subscribed to KDS room
📤 Emitted order:created for order xyz789
📤 Emitted order:updated for order xyz789
```

---

## Method 5: Integration Testing with Existing Routes

Use the existing REST API endpoints to trigger WebSocket events:

### Create an Order (triggers order:created)

```bash
curl -X POST http://localhost:5000/api/orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "tableId": 1,
    "items": [
      {
        "menuItemId": "MENU_ITEM_ID",
        "quantity": 2
      }
    ]
  }'
```

### Update Order Status (triggers order:updated)

```bash
curl -X PATCH http://localhost:5000/api/orders/ORDER_ID/status \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"status": "PREPARING"}'
```

### Update Table (triggers table:updated)

```bash
curl -X PATCH http://localhost:5000/api/tables/1/status \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"status": "OCCUPIED"}'
```

### Create Menu Item (triggers menu:updated)

```bash
curl -X POST http://localhost:5000/api/menu \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "Test Item",
    "category": "Appetizers",
    "price": 9.99,
    "available": true
  }'
```

### Process Payment (triggers payment:completed)

```bash
curl -X POST http://localhost:5000/api/payments \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "orderId": "ORDER_ID",
    "amount": 25.50,
    "method": "CARD"
  }'
```

---

## Expected Results

### When Order is Created:
- **orders** room receives `order:created` event
- **kds** room receives `order:created` event
- **table:{tableId}** room receives `order:created` event

### When Order is Updated:
- **orders** room receives `order:updated` event
- **kds** room receives `order:updated` event
- **table:{tableId}** room receives `order:updated` event

### When Order is Cancelled:
- **orders** room receives `order:cancelled` event
- **kds** room receives `order:cancelled` event
- **table:{tableId}** room receives `order:cancelled` event

### When Table is Updated:
- **tables** room receives `table:updated` event
- **table:{tableId}** room receives `table:updated` event

### When Menu is Updated:
- **All connected clients** receive `menu:updated` event

### When Payment is Completed:
- **orders** room receives `payment:completed` event
- **table:{tableId}** room receives `payment:completed` event

---

## Troubleshooting

### Connection Fails

**Error**: "Authentication required" or "Invalid or expired token"

**Solution**: 
1. Get a fresh JWT token by logging in
2. Make sure the token is not expired (default: 24 hours)
3. Verify you're passing the token correctly

### No Events Received

**Checklist**:
1. ✅ Is the server running?
2. ✅ Is the client connected? (check `connect` event)
3. ✅ Did you subscribe to the correct room?
4. ✅ Are you triggering actions that emit events?
5. ✅ Check server logs for event emissions

### Events Received Multiple Times

**Cause**: Multiple subscriptions to the same room

**Solution**: Unsubscribe before subscribing again:
```javascript
socket.emit('unsubscribe:orders');
socket.emit('subscribe:orders');
```

---

## Quick Test Checklist

- [ ] Server starts with "🔌 WebSocket server initialized"
- [ ] Client can connect with valid JWT token
- [ ] Client receives connection confirmation
- [ ] Subscription to rooms works
- [ ] Creating order triggers `order:created` event
- [ ] Updating order triggers `order:updated` event
- [ ] Cancelling order triggers `order:cancelled` event
- [ ] Updating table triggers `table:updated` event
- [ ] Creating/updating menu triggers `menu:updated` event
- [ ] Processing payment triggers `payment:completed` event
- [ ] Events are received in correct rooms
- [ ] Multiple clients can connect simultaneously
- [ ] Disconnection is handled gracefully

---

## Performance Testing

To test with multiple clients:

```javascript
// Create 10 concurrent connections
for (let i = 0; i < 10; i++) {
  const socket = io('http://localhost:5000', {
    auth: { token: 'YOUR_TOKEN' }
  });
  
  socket.on('connect', () => {
    console.log(`Client ${i} connected`);
    socket.emit('subscribe:orders');
  });
}
```

Monitor server logs and memory usage.

---

## Next Steps

Once WebSocket testing is complete:
1. Integrate with Desktop App (Next.js frontend)
2. Integrate with PWA (Customer interface)
3. Integrate with Kitchen Display System
4. Add error handling and reconnection logic in clients
5. Consider adding rate limiting for production
