# Quick Start: Testing WebSocket with Postman

## The Easiest Way (3 Steps)

### Step 1: Get JWT Token in Postman

1. Open Postman
2. Create a new POST request:
   - URL: `http://localhost:5000/api/auth/login`
   - Headers: `Content-Type: application/json`
   - Body (raw JSON):
     ```json
     {
       "username": "admin",
       "password": "admin123"
     }
     ```
3. Click **Send**
4. **Copy the token** from the response:
   ```json
   {
     "status": "success",
     "data": {
       "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."  ← COPY THIS
     }
   }
   ```

### Step 2: Open WebSocket Test Client

1. Open `packages/server/test-websocket.html` in your browser
2. Paste the token
3. Click **Connect**
4. Click the subscription buttons (Orders, Tables, KDS)

### Step 3: Trigger Events in Postman

Now make REST API calls in Postman and watch events appear in real-time!

#### Example 1: Create Menu Item

**Postman Request:**
- Method: `POST`
- URL: `http://localhost:5000/api/menu`
- Headers:
  - `Content-Type: application/json`
  - `Authorization: Bearer YOUR_TOKEN_HERE`
- Body:
  ```json
  {
    "name": "Test Burger",
    "category": "Main Course",
    "price": 12.99,
    "available": true
  }
  ```

**Result:** You'll see `menu:updated` event in the browser instantly! 🎉

#### Example 2: Update Table Status

**Postman Request:**
- Method: `PATCH`
- URL: `http://localhost:5000/api/tables/1/status`
- Headers:
  - `Content-Type: application/json`
  - `Authorization: Bearer YOUR_TOKEN_HERE`
- Body:
  ```json
  {
    "status": "OCCUPIED"
  }
  ```

**Result:** You'll see `table:updated` event in the browser! 🪑

#### Example 3: Create Order

**Postman Request:**
- Method: `POST`
- URL: `http://localhost:5000/api/orders`
- Headers:
  - `Content-Type: application/json`
  - `Authorization: Bearer YOUR_TOKEN_HERE`
- Body:
  ```json
  {
    "tableId": 1,
    "items": [
      {
        "menuItemId": "margherita-pizza",
        "quantity": 2
      }
    ]
  }
  ```

**Result:** You'll see `order:created` event in the browser! 📦

---

## Visual Guide

```
┌─────────────────┐         ┌─────────────────┐         ┌─────────────────┐
│                 │         │                 │         │                 │
│    Postman      │────────▶│  REST API       │────────▶│   WebSocket     │
│  (REST Calls)   │         │  (Server)       │         │   (Browser)     │
│                 │         │                 │         │                 │
└─────────────────┘         └─────────────────┘         └─────────────────┘
                                    │
                                    │ Emits Events
                                    ▼
                            ┌─────────────────┐
                            │   Service Layer │
                            │  - OrderService │
                            │  - TableService │
                            │  - MenuService  │
                            └─────────────────┘
```

---

## All Available Endpoints to Test

### 1. Menu Operations → `menu:updated`

**Create Menu Item:**
```
POST /api/menu
Body: { name, category, price, description, available }
```

**Update Menu Item:**
```
PATCH /api/menu/:id
Body: { name?, category?, price?, description?, available? }
```

**Toggle Availability:**
```
PATCH /api/menu/:id/availability
```

### 2. Table Operations → `table:updated`

**Update Table:**
```
PATCH /api/tables/:id
Body: { name?, status? }
```

**Update Table Status:**
```
PATCH /api/tables/:id/status
Body: { status: "FREE" | "OCCUPIED" | "RESERVED" }
```

### 3. Order Operations → `order:created`, `order:updated`, `order:cancelled`

**Create Order:**
```
POST /api/orders
Body: { tableId, items: [{ menuItemId, quantity, notes? }] }
```

**Update Order Status:**
```
PATCH /api/orders/:id/status
Body: { status: "PENDING" | "PREPARING" | "READY" | "SERVED" }
```

**Cancel Order:**
```
DELETE /api/orders/:id
```

### 4. Payment Operations → `payment:completed`

**Process Payment:**
```
POST /api/payments
Body: { orderId, amount, method: "CASH" | "CARD" | "WALLET" }
```

---

## Tips

### Save Token as Environment Variable

1. In Postman, create an environment
2. Add variable: `token` = `YOUR_TOKEN_HERE`
3. Use `{{token}}` in Authorization headers:
   ```
   Authorization: Bearer {{token}}
   ```

### Create a Collection

Save all these requests in a Postman collection for easy reuse:
1. Click **New Collection**
2. Name it "Restaurant WebSocket Tests"
3. Add all the requests above
4. Share with your team!

### Watch Multiple Event Types

Subscribe to multiple rooms in the browser:
- Click **Orders Room** → See all order events
- Click **Tables Room** → See all table events
- Click **KDS Room** → See kitchen-relevant events
- Click **Specific Table** → See events for one table only

---

## Troubleshooting

### "Authentication required" in browser
- Token expired (24 hours)
- Get a new token from Postman

### No events appearing
- Check if browser shows "Connected" (green)
- Make sure you subscribed to rooms
- Verify Postman request succeeded (200 OK)

### CORS errors
- Use `http://localhost:5000` (not 127.0.0.1)
- Make sure server is running

---

## What You Should See

When you make a Postman request, you should see:

**In Postman:**
```json
{
  "status": "success",
  "data": { ... }
}
```

**In Browser (instantly):**
```
[2:30:45 PM] Menu Updated 🍽️
Test Burger - Main Course - $12.99 - Available: Yes
```

That's real-time WebSocket in action! 🚀

---

## Next Steps

Once you've verified WebSocket works:
1. Integrate with Desktop App (Electron + Next.js)
2. Integrate with PWA (Customer interface)
3. Build Kitchen Display System
4. Add more event types as needed

Happy testing! 🎉
