# Testing WebSocket with Postman

This guide shows you how to test the WebSocket implementation using Postman.

## Prerequisites

- Postman Desktop App (WebSocket support requires desktop version)
- Server running on `http://localhost:5000`

---

## Part 1: Get JWT Token via REST API

### Step 1: Create Login Request

1. Open Postman
2. Click **New** → **HTTP Request**
3. Set up the request:
   - **Method**: `POST`
   - **URL**: `http://localhost:5000/api/auth/login`
   - **Headers**:
     - Key: `Content-Type`
     - Value: `application/json`
   - **Body** (select "raw" and "JSON"):
     ```json
     {
       "username": "admin",
       "password": "admin123"
     }
     ```

4. Click **Send**

### Step 2: Copy the Token

You should get a response like:
```json
{
  "status": "success",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "...",
      "username": "admin",
      "role": "ADMIN"
    }
  }
}
```

**Copy the token value** - you'll need it for WebSocket connection.

---

## Part 2: Test WebSocket Connection

### Step 1: Create WebSocket Request

1. In Postman, click **New** → **WebSocket Request**
2. Enter URL: `ws://localhost:5000`
3. Click **Connect**

### Step 2: Authenticate

After connecting, you need to authenticate. Postman WebSocket doesn't support the `auth` handshake parameter directly, so we need to use a workaround.

**Option A: Use Socket.io Client (Recommended)**

Unfortunately, Postman's WebSocket client doesn't fully support Socket.io's authentication mechanism. Use the Node.js test client instead:

```bash
cd packages/server
node test-websocket-client.js YOUR_TOKEN_HERE
```

**Option B: Use Browser Console (Alternative)**

See "Part 3: Browser Testing" below.

---

## Part 3: Test via Browser Console

This is the easiest way to test WebSocket with Postman-like control.

### Step 1: Create HTML Test File

Create a file `test-websocket.html`:

```html
<!DOCTYPE html>
<html>
<head>
  <title>WebSocket Test</title>
  <script src="https://cdn.socket.io/4.6.0/socket.io.min.js"></script>
  <style>
    body { font-family: Arial, sans-serif; padding: 20px; background: #f5f5f5; }
    .container { max-width: 800px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; }
    input, button { padding: 10px; margin: 5px; font-size: 14px; }
    input { width: 500px; }
    button { background: #007bff; color: white; border: none; cursor: pointer; border-radius: 4px; }
    button:hover { background: #0056b3; }
    .events { margin-top: 20px; padding: 10px; background: #f8f9fa; border-radius: 4px; max-height: 400px; overflow-y: auto; }
    .event { padding: 8px; margin: 5px 0; background: white; border-left: 4px solid #007bff; border-radius: 4px; }
    .status { padding: 10px; margin: 10px 0; border-radius: 4px; }
    .connected { background: #d4edda; color: #155724; }
    .disconnected { background: #f8d7da; color: #721c24; }
  </style>
</head>
<body>
  <div class="container">
    <h1>🔌 WebSocket Test Client</h1>
    
    <div>
      <label>JWT Token:</label><br>
      <input type="text" id="token" placeholder="Paste your JWT token here">
      <button onclick="connect()">Connect</button>
      <button onclick="disconnect()">Disconnect</button>
    </div>

    <div id="status" class="status disconnected">
      ❌ Disconnected
    </div>

    <div>
      <h3>Subscribe to Rooms:</h3>
      <button onclick="subscribe('orders')">📦 Orders</button>
      <button onclick="subscribe('tables')">🪑 Tables</button>
      <button onclick="subscribe('kds')">👨‍🍳 KDS</button>
      <button onclick="subscribeTable()">🪑 Table (specific)</button>
    </div>

    <div>
      <h3>Events Log:</h3>
      <button onclick="clearEvents()">Clear Log</button>
      <div id="events" class="events">
        <p>No events yet. Connect and subscribe to rooms to see events.</p>
      </div>
    </div>
  </div>

  <script>
    let socket = null;

    function connect() {
      const token = document.getElementById('token').value;
      if (!token) {
        alert('Please enter a JWT token');
        return;
      }

      socket = io('http://localhost:5000', {
        auth: { token }
      });

      socket.on('connect', () => {
        updateStatus('✅ Connected', 'connected');
        addEvent('System', 'Connected to WebSocket server', { socketId: socket.id });
      });

      socket.on('connect_error', (error) => {
        updateStatus('❌ Connection Error: ' + error.message, 'disconnected');
        addEvent('Error', error.message, {});
      });

      socket.on('disconnect', (reason) => {
        updateStatus('❌ Disconnected: ' + reason, 'disconnected');
        addEvent('System', 'Disconnected', { reason });
      });

      // Order events
      socket.on('order:created', (order) => {
        addEvent('Order Created', `Order ${order.id} created for Table ${order.tableId}`, order);
      });

      socket.on('order:updated', (order) => {
        addEvent('Order Updated', `Order ${order.id} status: ${order.status}`, order);
      });

      socket.on('order:cancelled', (data) => {
        addEvent('Order Cancelled', `Order ${data.orderId} cancelled`, data);
      });

      // Table events
      socket.on('table:updated', (table) => {
        addEvent('Table Updated', `${table.name} status: ${table.status}`, table);
      });

      // Menu events
      socket.on('menu:updated', (menuItem) => {
        addEvent('Menu Updated', `${menuItem.name} - $${menuItem.price}`, menuItem);
      });

      // Payment events
      socket.on('payment:completed', (payment) => {
        addEvent('Payment Completed', `Payment ${payment.id} - $${payment.amount}`, payment);
      });
    }

    function disconnect() {
      if (socket) {
        socket.disconnect();
        socket = null;
      }
    }

    function subscribe(room) {
      if (!socket || !socket.connected) {
        alert('Please connect first');
        return;
      }
      socket.emit(`subscribe:${room}`);
      addEvent('System', `Subscribed to ${room} room`, {});
    }

    function subscribeTable() {
      const tableId = prompt('Enter table ID:', '1');
      if (tableId && socket && socket.connected) {
        socket.emit('subscribe:table', parseInt(tableId));
        addEvent('System', `Subscribed to table:${tableId} room`, {});
      }
    }

    function updateStatus(message, className) {
      const status = document.getElementById('status');
      status.textContent = message;
      status.className = 'status ' + className;
    }

    function addEvent(type, message, data) {
      const events = document.getElementById('events');
      const event = document.createElement('div');
      event.className = 'event';
      
      const time = new Date().toLocaleTimeString();
      event.innerHTML = `
        <strong>[${time}] ${type}</strong><br>
        ${message}<br>
        <small style="color: #666;">${JSON.stringify(data, null, 2)}</small>
      `;
      
      events.insertBefore(event, events.firstChild);
    }

    function clearEvents() {
      document.getElementById('events').innerHTML = '<p>Events cleared.</p>';
    }
  </script>
</body>
</html>
```

### Step 2: Use the HTML Test Client

1. Save the file as `test-websocket.html` in `packages/server/`
2. Open it in your browser
3. Paste your JWT token (from Postman login)
4. Click **Connect**
5. Click the subscription buttons (Orders, Tables, KDS)
6. Use Postman to trigger events (see Part 4)

---

## Part 4: Trigger Events via Postman REST API

Now use Postman to trigger actions that will emit WebSocket events.

### Setup: Create Environment Variable

1. In Postman, create an environment variable:
   - Variable: `token`
   - Value: Your JWT token from Part 1

2. Use `{{token}}` in Authorization headers

### Test 1: Create Menu Item (triggers menu:updated)

**Request:**
- Method: `POST`
- URL: `http://localhost:5000/api/menu`
- Headers:
  - `Content-Type`: `application/json`
  - `Authorization`: `Bearer {{token}}`
- Body:
  ```json
  {
    "name": "Test Burger",
    "category": "Main Course",
    "price": 12.99,
    "description": "A delicious test burger",
    "available": true
  }
  ```

**Expected WebSocket Event**: `menu:updated`

### Test 2: Update Table Status (triggers table:updated)

**Request:**
- Method: `PATCH`
- URL: `http://localhost:5000/api/tables/1/status`
- Headers:
  - `Content-Type`: `application/json`
  - `Authorization`: `Bearer {{token}}`
- Body:
  ```json
  {
    "status": "OCCUPIED"
  }
  ```

**Expected WebSocket Event**: `table:updated`

### Test 3: Create Order (triggers order:created)

First, get a menu item ID from the menu list:

**Get Menu Items:**
- Method: `GET`
- URL: `http://localhost:5000/api/menu`
- Headers:
  - `Authorization`: `Bearer {{token}}`

Copy a menu item ID, then:

**Create Order:**
- Method: `POST`
- URL: `http://localhost:5000/api/orders`
- Headers:
  - `Content-Type`: `application/json`
  - `Authorization`: `Bearer {{token}}`
- Body:
  ```json
  {
    "tableId": 1,
    "items": [
      {
        "menuItemId": "PASTE_MENU_ITEM_ID_HERE",
        "quantity": 2,
        "notes": "No onions"
      }
    ]
  }
  ```

**Expected WebSocket Events**: 
- `order:created` (sent to orders, kds, and table:1 rooms)

### Test 4: Update Order Status (triggers order:updated)

Copy the order ID from Test 3 response, then:

**Update to PREPARING:**
- Method: `PATCH`
- URL: `http://localhost:5000/api/orders/ORDER_ID/status`
- Headers:
  - `Content-Type`: `application/json`
  - `Authorization`: `Bearer {{token}}`
- Body:
  ```json
  {
    "status": "PREPARING"
  }
  ```

**Expected WebSocket Event**: `order:updated`

Repeat with statuses: `READY`, `SERVED`

### Test 5: Process Payment (triggers payment:completed)

**Request:**
- Method: `POST`
- URL: `http://localhost:5000/api/payments`
- Headers:
  - `Content-Type`: `application/json`
  - `Authorization`: `Bearer {{token}}`
- Body:
  ```json
  {
    "orderId": "ORDER_ID_FROM_TEST_3",
    "amount": 25.98,
    "method": "CARD"
  }
  ```

**Expected WebSocket Event**: `payment:completed`

---

## Part 5: Create Postman Collection

### Import This Collection

Save this as `websocket-test.postman_collection.json`:

```json
{
  "info": {
    "name": "Restaurant Management - WebSocket Tests",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "1. Login (Get Token)",
      "request": {
        "method": "POST",
        "header": [
          {
            "key": "Content-Type",
            "value": "application/json"
          }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"username\": \"admin\",\n  \"password\": \"admin123\"\n}"
        },
        "url": {
          "raw": "http://localhost:5000/api/auth/login",
          "protocol": "http",
          "host": ["localhost"],
          "port": "5000",
          "path": ["api", "auth", "login"]
        }
      }
    },
    {
      "name": "2. Get Menu Items",
      "request": {
        "method": "GET",
        "header": [
          {
            "key": "Authorization",
            "value": "Bearer {{token}}"
          }
        ],
        "url": {
          "raw": "http://localhost:5000/api/menu",
          "protocol": "http",
          "host": ["localhost"],
          "port": "5000",
          "path": ["api", "menu"]
        }
      }
    },
    {
      "name": "3. Create Menu Item → menu:updated",
      "request": {
        "method": "POST",
        "header": [
          {
            "key": "Content-Type",
            "value": "application/json"
          },
          {
            "key": "Authorization",
            "value": "Bearer {{token}}"
          }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"name\": \"Test Burger\",\n  \"category\": \"Main Course\",\n  \"price\": 12.99,\n  \"description\": \"A delicious test burger\",\n  \"available\": true\n}"
        },
        "url": {
          "raw": "http://localhost:5000/api/menu",
          "protocol": "http",
          "host": ["localhost"],
          "port": "5000",
          "path": ["api", "menu"]
        }
      }
    },
    {
      "name": "4. Update Table Status → table:updated",
      "request": {
        "method": "PATCH",
        "header": [
          {
            "key": "Content-Type",
            "value": "application/json"
          },
          {
            "key": "Authorization",
            "value": "Bearer {{token}}"
          }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"status\": \"OCCUPIED\"\n}"
        },
        "url": {
          "raw": "http://localhost:5000/api/tables/1/status",
          "protocol": "http",
          "host": ["localhost"],
          "port": "5000",
          "path": ["api", "tables", "1", "status"]
        }
      }
    },
    {
      "name": "5. Create Order → order:created",
      "request": {
        "method": "POST",
        "header": [
          {
            "key": "Content-Type",
            "value": "application/json"
          },
          {
            "key": "Authorization",
            "value": "Bearer {{token}}"
          }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"tableId\": 1,\n  \"items\": [\n    {\n      \"menuItemId\": \"margherita-pizza\",\n      \"quantity\": 2\n    }\n  ]\n}"
        },
        "url": {
          "raw": "http://localhost:5000/api/orders",
          "protocol": "http",
          "host": ["localhost"],
          "port": "5000",
          "path": ["api", "orders"]
        }
      }
    }
  ]
}
```

Import this into Postman: **Import** → **Upload Files** → Select the JSON file

---

## Quick Testing Workflow

1. **Start Server**: `npm run dev` in packages/server
2. **Login in Postman**: Run "1. Login (Get Token)" request
3. **Copy Token**: Save it as environment variable `{{token}}`
4. **Open HTML Test Client**: Open `test-websocket.html` in browser
5. **Connect WebSocket**: Paste token and click Connect
6. **Subscribe to Rooms**: Click Orders, Tables, KDS buttons
7. **Trigger Events in Postman**: Run requests 3, 4, 5
8. **Watch Events**: See real-time events in browser

---

## Troubleshooting

### "Authentication required" error
- Token expired (24 hours validity)
- Get a new token from Login request

### No events in browser
- Check if WebSocket is connected (green status)
- Make sure you subscribed to the correct rooms
- Check browser console for errors

### CORS errors
- Make sure you're using `http://localhost:5000` (not 127.0.0.1)
- Server CORS is configured for localhost

---

## Summary

**Best Testing Method with Postman:**

1. Use Postman for REST API calls (login, create orders, etc.)
2. Use the HTML test client for WebSocket connection
3. Watch events appear in real-time as you make Postman requests

This gives you full control and visibility of both REST and WebSocket!
