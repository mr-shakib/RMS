# API Documentation

Complete API reference for the Restaurant Management System.

## Base URL

```
http://localhost:5000/api
```

For LAN access from other devices:
```
http://[YOUR_IP]:5000/api
```

## Authentication

Most API endpoints require authentication using JWT tokens.

### Headers

```http
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

### Authentication Flow

1. Login to receive JWT token
2. Include token in `Authorization` header for subsequent requests
3. Token expires after 24 hours

---

## Authentication Endpoints

### Login

Authenticate user and receive JWT token.

**Endpoint**: `POST /api/auth/login`

**Request Body**:
```json
{
  "username": "admin",
  "password": "admin123"
}
```

**Response** (200 OK):
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "username": "admin",
    "role": "ADMIN"
  }
}
```

**Error Responses**:
- `400 Bad Request`: Missing username or password
- `401 Unauthorized`: Invalid credentials

---

### Logout

Invalidate current session.

**Endpoint**: `POST /api/auth/logout`

**Headers**: Requires authentication

**Response** (200 OK):
```json
{
  "message": "Logged out successfully"
}
```

---

### Get Current User

Get details of currently authenticated user.

**Endpoint**: `GET /api/auth/me`

**Headers**: Requires authentication

**Response** (200 OK):
```json
{
  "id": "uuid",
  "username": "admin",
  "role": "ADMIN",
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

---

## Order Endpoints

### List Orders

Get all orders with optional filtering.

**Endpoint**: `GET /api/orders`

**Headers**: Requires authentication

**Query Parameters**:
- `status` (optional): Filter by order status (PENDING, PREPARING, READY, SERVED, PAID, CANCELLED)
- `tableId` (optional): Filter by table ID
- `startDate` (optional): Filter orders after this date (ISO 8601)
- `endDate` (optional): Filter orders before this date (ISO 8601)
- `limit` (optional): Number of results (default: 50)
- `offset` (optional): Pagination offset (default: 0)

**Example Request**:
```
GET /api/orders?status=PENDING&limit=10
```

**Response** (200 OK):
```json
{
  "orders": [
    {
      "id": "uuid",
      "tableId": 1,
      "table": {
        "id": 1,
        "name": "Table 1",
        "status": "OCCUPIED"
      },
      "status": "PENDING",
      "subtotal": 45.00,
      "tax": 4.50,
      "discount": 0.00,
      "serviceCharge": 0.00,
      "tip": 0.00,
      "total": 49.50,
      "items": [
        {
          "id": "uuid",
          "menuItemId": "uuid",
          "menuItem": {
            "name": "Burger",
            "price": 15.00
          },
          "quantity": 3,
          "price": 15.00,
          "notes": "No onions"
        }
      ],
      "createdAt": "2024-01-01T12:00:00.000Z",
      "updatedAt": "2024-01-01T12:00:00.000Z"
    }
  ],
  "total": 1,
  "limit": 10,
  "offset": 0
}
```

---

### Get Order by ID

Get detailed information about a specific order.

**Endpoint**: `GET /api/orders/:id`

**Headers**: Requires authentication

**Response** (200 OK):
```json
{
  "id": "uuid",
  "tableId": 1,
  "table": {
    "id": 1,
    "name": "Table 1",
    "status": "OCCUPIED"
  },
  "status": "PENDING",
  "subtotal": 45.00,
  "tax": 4.50,
  "discount": 0.00,
  "serviceCharge": 0.00,
  "tip": 0.00,
  "total": 49.50,
  "items": [
    {
      "id": "uuid",
      "menuItemId": "uuid",
      "menuItem": {
        "id": "uuid",
        "name": "Burger",
        "category": "Main Course",
        "price": 15.00,
        "imageUrl": "/images/burger.jpg"
      },
      "quantity": 3,
      "price": 15.00,
      "notes": "No onions"
    }
  ],
  "payment": null,
  "createdAt": "2024-01-01T12:00:00.000Z",
  "updatedAt": "2024-01-01T12:00:00.000Z"
}
```

**Error Responses**:
- `404 Not Found`: Order not found

---

### Create Order

Create a new order.

**Endpoint**: `POST /api/orders`

**Headers**: Requires authentication

**Request Body**:
```json
{
  "tableId": 1,
  "items": [
    {
      "menuItemId": "uuid",
      "quantity": 2,
      "notes": "Extra spicy"
    },
    {
      "menuItemId": "uuid",
      "quantity": 1
    }
  ]
}
```

**Response** (201 Created):
```json
{
  "id": "uuid",
  "tableId": 1,
  "status": "PENDING",
  "subtotal": 30.00,
  "tax": 3.00,
  "discount": 0.00,
  "serviceCharge": 0.00,
  "tip": 0.00,
  "total": 33.00,
  "items": [...],
  "createdAt": "2024-01-01T12:00:00.000Z"
}
```

**Error Responses**:
- `400 Bad Request`: Invalid request data
- `404 Not Found`: Table or menu item not found

**Side Effects**:
- Table status updated to OCCUPIED
- Kitchen ticket printed (if printer configured)
- WebSocket event `order:created` emitted

---

### Update Order Status

Update the status of an existing order.

**Endpoint**: `PATCH /api/orders/:id`

**Headers**: Requires authentication

**Request Body**:
```json
{
  "status": "PREPARING"
}
```

**Valid Status Transitions**:
- PENDING → PREPARING
- PREPARING → READY
- READY → SERVED
- SERVED → PAID
- Any → CANCELLED

**Response** (200 OK):
```json
{
  "id": "uuid",
  "status": "PREPARING",
  "updatedAt": "2024-01-01T12:05:00.000Z"
}
```

**Error Responses**:
- `400 Bad Request`: Invalid status transition
- `404 Not Found`: Order not found

**Side Effects**:
- WebSocket event `order:updated` emitted
- Table status updated when order completed

---

### Cancel Order

Cancel an existing order.

**Endpoint**: `DELETE /api/orders/:id`

**Headers**: Requires authentication

**Response** (200 OK):
```json
{
  "message": "Order cancelled successfully"
}
```

**Error Responses**:
- `400 Bad Request`: Cannot cancel paid orders
- `404 Not Found`: Order not found

**Side Effects**:
- Order status set to CANCELLED
- Table status updated to FREE
- WebSocket event `order:cancelled` emitted

---

### Get Orders by Table

Get all orders for a specific table.

**Endpoint**: `GET /api/orders/table/:tableId`

**Headers**: Requires authentication

**Response** (200 OK):
```json
{
  "orders": [...]
}
```

---

## Table Endpoints

### List Tables

Get all tables.

**Endpoint**: `GET /api/tables`

**Headers**: Requires authentication

**Response** (200 OK):
```json
{
  "tables": [
    {
      "id": 1,
      "name": "Table 1",
      "qrCodeUrl": "/qr-codes/table-1.png",
      "status": "FREE",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

---

### Create Table

Create a new table.

**Endpoint**: `POST /api/tables`

**Headers**: Requires authentication (Admin only)

**Request Body**:
```json
{
  "name": "Table 10"
}
```

**Response** (201 Created):
```json
{
  "id": 10,
  "name": "Table 10",
  "qrCodeUrl": "/qr-codes/table-10.png",
  "status": "FREE",
  "createdAt": "2024-01-01T12:00:00.000Z"
}
```

**Side Effects**:
- QR code automatically generated

---

### Update Table

Update table information.

**Endpoint**: `PATCH /api/tables/:id`

**Headers**: Requires authentication (Admin only)

**Request Body**:
```json
{
  "name": "VIP Table 1",
  "status": "RESERVED"
}
```

**Response** (200 OK):
```json
{
  "id": 1,
  "name": "VIP Table 1",
  "status": "RESERVED",
  "updatedAt": "2024-01-01T12:00:00.000Z"
}
```

**Side Effects**:
- WebSocket event `table:updated` emitted

---

### Delete Table

Delete a table.

**Endpoint**: `DELETE /api/tables/:id`

**Headers**: Requires authentication (Admin only)

**Response** (200 OK):
```json
{
  "message": "Table deleted successfully"
}
```

**Error Responses**:
- `400 Bad Request`: Cannot delete table with active orders
- `404 Not Found`: Table not found

---

### Get Table QR Code

Generate and retrieve QR code for a table.

**Endpoint**: `GET /api/tables/:id/qr`

**Headers**: Requires authentication

**Query Parameters**:
- `format` (optional): Response format (`json` or `image`, default: `json`)

**Response** (200 OK) - JSON format:
```json
{
  "qrCodeUrl": "/qr-codes/table-1.png",
  "url": "http://192.168.1.100:5000/?table=1"
}
```

**Response** (200 OK) - Image format:
- Content-Type: `image/png`
- Binary PNG image data

---

## Menu Endpoints

### List Menu Items

Get all menu items with optional filtering.

**Endpoint**: `GET /api/menu`

**Headers**: Requires authentication

**Query Parameters**:
- `category` (optional): Filter by category
- `available` (optional): Filter by availability (`true` or `false`)
- `search` (optional): Search by name

**Example Request**:
```
GET /api/menu?category=Main%20Course&available=true
```

**Response** (200 OK):
```json
{
  "menuItems": [
    {
      "id": "uuid",
      "name": "Grilled Chicken",
      "category": "Main Course",
      "price": 18.50,
      "description": "Tender grilled chicken with herbs",
      "imageUrl": "/images/chicken.jpg",
      "available": true,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

---

### Get Menu Item

Get details of a specific menu item.

**Endpoint**: `GET /api/menu/:id`

**Headers**: Requires authentication

**Response** (200 OK):
```json
{
  "id": "uuid",
  "name": "Grilled Chicken",
  "category": "Main Course",
  "price": 18.50,
  "description": "Tender grilled chicken with herbs",
  "imageUrl": "/images/chicken.jpg",
  "available": true,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

---

### Create Menu Item

Create a new menu item.

**Endpoint**: `POST /api/menu`

**Headers**: Requires authentication (Admin only)

**Request Body**:
```json
{
  "name": "Caesar Salad",
  "category": "Appetizers",
  "price": 12.00,
  "description": "Fresh romaine lettuce with Caesar dressing",
  "imageUrl": "/images/caesar-salad.jpg",
  "available": true
}
```

**Response** (201 Created):
```json
{
  "id": "uuid",
  "name": "Caesar Salad",
  "category": "Appetizers",
  "price": 12.00,
  "description": "Fresh romaine lettuce with Caesar dressing",
  "imageUrl": "/images/caesar-salad.jpg",
  "available": true,
  "createdAt": "2024-01-01T12:00:00.000Z"
}
```

---

### Update Menu Item

Update an existing menu item.

**Endpoint**: `PATCH /api/menu/:id`

**Headers**: Requires authentication (Admin only)

**Request Body** (all fields optional):
```json
{
  "name": "Caesar Salad Deluxe",
  "price": 14.00,
  "available": false
}
```

**Response** (200 OK):
```json
{
  "id": "uuid",
  "name": "Caesar Salad Deluxe",
  "price": 14.00,
  "available": false,
  "updatedAt": "2024-01-01T12:00:00.000Z"
}
```

**Side Effects**:
- WebSocket event `menu:updated` emitted

---

### Delete Menu Item

Delete a menu item.

**Endpoint**: `DELETE /api/menu/:id`

**Headers**: Requires authentication (Admin only)

**Response** (200 OK):
```json
{
  "message": "Menu item deleted successfully"
}
```

**Error Responses**:
- `400 Bad Request`: Cannot delete item in active orders
- `404 Not Found`: Menu item not found

---

### Toggle Menu Item Availability

Quick toggle for menu item availability.

**Endpoint**: `PATCH /api/menu/:id/availability`

**Headers**: Requires authentication (Admin only)

**Response** (200 OK):
```json
{
  "id": "uuid",
  "available": false,
  "updatedAt": "2024-01-01T12:00:00.000Z"
}
```

**Side Effects**:
- WebSocket event `menu:updated` emitted

---

## Payment Endpoints

### Process Payment

Process payment for an order.

**Endpoint**: `POST /api/payments`

**Headers**: Requires authentication

**Request Body**:
```json
{
  "orderId": "uuid",
  "amount": 49.50,
  "method": "CARD",
  "reference": "CARD-1234"
}
```

**Payment Methods**:
- `CASH`
- `CARD`
- `WALLET`

**Response** (201 Created):
```json
{
  "id": "uuid",
  "orderId": "uuid",
  "amount": 49.50,
  "method": "CARD",
  "reference": "CARD-1234",
  "createdAt": "2024-01-01T12:00:00.000Z"
}
```

**Side Effects**:
- Order status updated to PAID
- Table status updated to FREE
- Customer receipt printed (if printer configured)
- WebSocket event `payment:completed` emitted

---

### Get Payment

Get payment details for an order.

**Endpoint**: `GET /api/payments/:orderId`

**Headers**: Requires authentication

**Response** (200 OK):
```json
{
  "id": "uuid",
  "orderId": "uuid",
  "amount": 49.50,
  "method": "CARD",
  "reference": "CARD-1234",
  "createdAt": "2024-01-01T12:00:00.000Z"
}
```

---

## Report Endpoints

### Sales Report

Generate sales report for a date range.

**Endpoint**: `GET /api/reports/sales`

**Headers**: Requires authentication (Admin only)

**Query Parameters**:
- `startDate` (required): Start date (ISO 8601)
- `endDate` (required): End date (ISO 8601)
- `groupBy` (optional): Grouping (`day`, `week`, `month`, default: `day`)

**Example Request**:
```
GET /api/reports/sales?startDate=2024-01-01&endDate=2024-01-31&groupBy=day
```

**Response** (200 OK):
```json
{
  "report": [
    {
      "date": "2024-01-01",
      "totalSales": 1250.00,
      "orderCount": 45,
      "averageOrderValue": 27.78
    },
    {
      "date": "2024-01-02",
      "totalSales": 1450.00,
      "orderCount": 52,
      "averageOrderValue": 27.88
    }
  ],
  "summary": {
    "totalSales": 38500.00,
    "totalOrders": 1250,
    "averageOrderValue": 30.80
  }
}
```

---

### Top Selling Items

Get top-selling menu items.

**Endpoint**: `GET /api/reports/top-items`

**Headers**: Requires authentication (Admin only)

**Query Parameters**:
- `startDate` (optional): Start date (ISO 8601)
- `endDate` (optional): End date (ISO 8601)
- `limit` (optional): Number of items (default: 10)

**Response** (200 OK):
```json
{
  "items": [
    {
      "menuItemId": "uuid",
      "name": "Burger",
      "category": "Main Course",
      "quantitySold": 245,
      "revenue": 3675.00
    }
  ]
}
```

---

### Order History Report

Get detailed order history.

**Endpoint**: `GET /api/reports/orders`

**Headers**: Requires authentication (Admin only)

**Query Parameters**:
- `startDate` (optional): Start date (ISO 8601)
- `endDate` (optional): End date (ISO 8601)
- `status` (optional): Filter by status
- `tableId` (optional): Filter by table
- `format` (optional): Export format (`json`, `csv`, `pdf`, default: `json`)

**Response** (200 OK):
```json
{
  "orders": [...],
  "total": 150
}
```

---

## Settings Endpoints

### Get Settings

Get all system settings.

**Endpoint**: `GET /api/settings`

**Headers**: Requires authentication (Admin only)

**Response** (200 OK):
```json
{
  "business_name": "My Restaurant",
  "business_address": "123 Main St",
  "business_logo_url": "/images/logo.png",
  "tax_percentage": "10",
  "currency": "USD",
  "server_port": "5000",
  "printer_type": "network",
  "printer_address": "192.168.1.50",
  "theme": "light"
}
```

---

### Update Settings

Update system settings.

**Endpoint**: `PATCH /api/settings`

**Headers**: Requires authentication (Admin only)

**Request Body**:
```json
{
  "business_name": "New Restaurant Name",
  "tax_percentage": "12",
  "theme": "dark"
}
```

**Response** (200 OK):
```json
{
  "message": "Settings updated successfully",
  "settings": {
    "business_name": "New Restaurant Name",
    "tax_percentage": "12",
    "theme": "dark"
  }
}
```

---

### Create Backup

Create database backup.

**Endpoint**: `POST /api/settings/backup`

**Headers**: Requires authentication (Admin only)

**Response** (200 OK):
- Content-Type: `application/octet-stream`
- Content-Disposition: `attachment; filename="backup-2024-01-01.db"`
- Binary database file

---

### Restore Backup

Restore database from backup.

**Endpoint**: `POST /api/settings/restore`

**Headers**: Requires authentication (Admin only)

**Request**: Multipart form data with database file

**Response** (200 OK):
```json
{
  "message": "Database restored successfully"
}
```

---

## PWA Public Endpoints

These endpoints do not require authentication and are used by the customer-facing PWA.

### Get Menu (Public)

Get available menu items for customer ordering.

**Endpoint**: `GET /menu`

**Response** (200 OK):
```json
{
  "menuItems": [
    {
      "id": "uuid",
      "name": "Burger",
      "category": "Main Course",
      "price": 15.00,
      "description": "Juicy beef burger",
      "imageUrl": "/images/burger.jpg"
    }
  ]
}
```

---

### Place Order (Public)

Place an order from PWA.

**Endpoint**: `POST /order`

**Request Body**:
```json
{
  "tableId": 1,
  "items": [
    {
      "menuItemId": "uuid",
      "quantity": 2,
      "notes": "No onions"
    }
  ]
}
```

**Response** (201 Created):
```json
{
  "orderId": "uuid",
  "tableId": 1,
  "total": 30.00,
  "status": "PENDING",
  "message": "Order placed successfully"
}
```

---

### Get Order Status (Public)

Get current order status for a table.

**Endpoint**: `GET /order/:tableId`

**Response** (200 OK):
```json
{
  "order": {
    "id": "uuid",
    "status": "PREPARING",
    "items": [...],
    "total": 30.00,
    "createdAt": "2024-01-01T12:00:00.000Z"
  }
}
```

---

## WebSocket Events

### Connection

Connect to WebSocket server:

```javascript
const socket = io('http://localhost:5000', {
  auth: {
    token: 'your-jwt-token'
  }
});
```

### Client → Server Events

#### Subscribe to Orders
```javascript
socket.emit('subscribe:orders');
```

#### Subscribe to Tables
```javascript
socket.emit('subscribe:tables');
```

#### Subscribe to KDS
```javascript
socket.emit('subscribe:kds');
```

#### Subscribe to Specific Table
```javascript
socket.emit('subscribe:table', { tableId: 1 });
```

#### Unsubscribe
```javascript
socket.emit('unsubscribe:orders');
socket.emit('unsubscribe:tables');
socket.emit('unsubscribe:kds');
```

### Server → Client Events

#### Order Created
```javascript
socket.on('order:created', (order) => {
  console.log('New order:', order);
});
```

#### Order Updated
```javascript
socket.on('order:updated', (order) => {
  console.log('Order updated:', order);
});
```

#### Order Cancelled
```javascript
socket.on('order:cancelled', (orderId) => {
  console.log('Order cancelled:', orderId);
});
```

#### Table Updated
```javascript
socket.on('table:updated', (table) => {
  console.log('Table updated:', table);
});
```

#### Menu Updated
```javascript
socket.on('menu:updated', (menuItem) => {
  console.log('Menu item updated:', menuItem);
});
```

#### Payment Completed
```javascript
socket.on('payment:completed', (payment) => {
  console.log('Payment completed:', payment);
});
```

---

## Error Responses

All endpoints may return the following error responses:

### 400 Bad Request
```json
{
  "error": "Validation error",
  "message": "Invalid request data",
  "details": [
    "Field 'name' is required",
    "Field 'price' must be a positive number"
  ]
}
```

### 401 Unauthorized
```json
{
  "error": "Authentication required",
  "message": "No token provided"
}
```

### 403 Forbidden
```json
{
  "error": "Insufficient permissions",
  "message": "Admin role required"
}
```

### 404 Not Found
```json
{
  "error": "Resource not found",
  "message": "Order not found"
}
```

### 500 Internal Server Error
```json
{
  "error": "Internal server error",
  "message": "An unexpected error occurred"
}
```

---

## Rate Limiting

Public endpoints (PWA) are rate-limited to prevent abuse:

- **Menu endpoint**: 100 requests per minute per IP
- **Order endpoint**: 20 requests per minute per IP

Rate limit headers:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
```

---

## Testing with cURL

### Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

### Get Orders (with token)
```bash
curl -X GET http://localhost:5000/api/orders \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Create Order
```bash
curl -X POST http://localhost:5000/api/orders \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "tableId": 1,
    "items": [
      {"menuItemId": "uuid", "quantity": 2}
    ]
  }'
```

---

## Postman Collection

A Postman collection with all endpoints is available at:
`docs/postman/RMS-API.postman_collection.json`

Import this collection into Postman for easy API testing.
