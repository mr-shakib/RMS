# WebSocket Server Implementation

## Overview

This WebSocket server provides real-time bidirectional communication between the server and clients (desktop app, PWA, KDS). It uses Socket.io for WebSocket functionality with JWT authentication.

## Features

- **JWT Authentication**: All WebSocket connections require valid JWT tokens
- **Room-based Subscriptions**: Clients can subscribe to specific rooms for targeted updates
- **Automatic Event Broadcasting**: Service layer methods automatically emit events on data changes
- **CORS Support**: Configured to allow connections from desktop app, PWA, and LAN devices

## Connection

### Client Connection Example

```typescript
import { io } from 'socket.io-client';

const socket = io('http://localhost:5000', {
  auth: {
    token: 'your-jwt-token-here'
  }
});

socket.on('connect', () => {
  console.log('Connected to WebSocket server');
});

socket.on('connect_error', (error) => {
  console.error('Connection error:', error.message);
});
```

## Room Subscriptions

### Available Rooms

1. **orders** - Receives all order-related events
2. **tables** - Receives all table-related events
3. **kds** - Receives kitchen display system events (order creation and updates)
4. **table:{id}** - Receives events for a specific table (e.g., `table:5`)

### Subscription Events

#### Subscribe to Orders Room
```typescript
socket.emit('subscribe:orders');
```

#### Subscribe to Tables Room
```typescript
socket.emit('subscribe:tables');
```

#### Subscribe to KDS Room
```typescript
socket.emit('subscribe:kds');
```

#### Subscribe to Specific Table
```typescript
socket.emit('subscribe:table', tableId); // e.g., tableId = 5
```

#### Unsubscribe from Rooms
```typescript
socket.emit('unsubscribe:orders');
socket.emit('unsubscribe:tables');
socket.emit('unsubscribe:kds');
socket.emit('unsubscribe:table', tableId);
```

## Server-to-Client Events

### Order Events

#### order:created
Emitted when a new order is created.

**Rooms**: `orders`, `kds`, `table:{tableId}`

**Payload**:
```typescript
{
  id: string;
  tableId: number;
  status: 'PENDING' | 'PREPARING' | 'READY' | 'SERVED' | 'PAID';
  subtotal: number;
  tax: number;
  discount: number;
  serviceCharge: number;
  tip: number;
  total: number;
  items: OrderItem[];
  table: Table;
  createdAt: Date;
  updatedAt: Date;
}
```

**Example**:
```typescript
socket.on('order:created', (order) => {
  console.log('New order created:', order);
  // Update UI with new order
});
```

#### order:updated
Emitted when an order status or details are updated.

**Rooms**: `orders`, `kds`, `table:{tableId}`

**Payload**: Same as `order:created`

**Example**:
```typescript
socket.on('order:updated', (order) => {
  console.log('Order updated:', order);
  // Update UI with order changes
});
```

#### order:cancelled
Emitted when an order is cancelled.

**Rooms**: `orders`, `kds`, `table:{tableId}`

**Payload**:
```typescript
{
  orderId: string;
  tableId: number;
}
```

**Example**:
```typescript
socket.on('order:cancelled', ({ orderId, tableId }) => {
  console.log('Order cancelled:', orderId);
  // Remove order from UI
});
```

### Table Events

#### table:updated
Emitted when a table is created, updated, or its status changes.

**Rooms**: `tables`, `table:{tableId}`

**Payload**:
```typescript
{
  id: number;
  name: string;
  qrCodeUrl: string;
  status: 'FREE' | 'OCCUPIED' | 'RESERVED';
  createdAt: Date;
  updatedAt: Date;
}
```

**Example**:
```typescript
socket.on('table:updated', (table) => {
  console.log('Table updated:', table);
  // Update table status in UI
});
```

### Menu Events

#### menu:updated
Emitted when a menu item is created, updated, or availability changes.

**Rooms**: Broadcast to all connected clients

**Payload**:
```typescript
{
  id: string;
  name: string;
  category: string;
  price: number;
  description?: string;
  imageUrl?: string;
  available: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

**Example**:
```typescript
socket.on('menu:updated', (menuItem) => {
  console.log('Menu item updated:', menuItem);
  // Update menu in UI
});
```

### Payment Events

#### payment:completed
Emitted when a payment is successfully processed.

**Rooms**: `orders`, `table:{tableId}`

**Payload**:
```typescript
{
  id: string;
  orderId: string;
  amount: number;
  method: 'CASH' | 'CARD' | 'WALLET';
  reference?: string;
  order?: Order;
  createdAt: Date;
}
```

**Example**:
```typescript
socket.on('payment:completed', (payment) => {
  console.log('Payment completed:', payment);
  // Update order status and show receipt
});
```

## Usage Examples

### Desktop App - Order Management

```typescript
import { io } from 'socket.io-client';

const socket = io('http://localhost:5000', {
  auth: { token: localStorage.getItem('token') }
});

// Subscribe to orders room
socket.emit('subscribe:orders');

// Listen for new orders
socket.on('order:created', (order) => {
  // Add order to list
  addOrderToList(order);
  // Show notification
  showNotification(`New order from ${order.table.name}`);
});

// Listen for order updates
socket.on('order:updated', (order) => {
  // Update order in list
  updateOrderInList(order);
});

// Listen for cancelled orders
socket.on('order:cancelled', ({ orderId }) => {
  // Remove order from list
  removeOrderFromList(orderId);
});
```

### PWA - Customer Order Tracking

```typescript
import { io } from 'socket.io-client';

const tableId = 5; // From QR code scan
const socket = io('http://192.168.1.100:5000', {
  auth: { token: customerToken }
});

// Subscribe to specific table updates
socket.emit('subscribe:table', tableId);

// Listen for order updates
socket.on('order:updated', (order) => {
  if (order.tableId === tableId) {
    updateOrderStatus(order.status);
  }
});

// Listen for payment completion
socket.on('payment:completed', (payment) => {
  if (payment.order?.tableId === tableId) {
    showThankYouMessage();
  }
});
```

### Kitchen Display System

```typescript
import { io } from 'socket.io-client';

const socket = io('http://localhost:5000', {
  auth: { token: chefToken }
});

// Subscribe to KDS room
socket.emit('subscribe:kds');

// Listen for new orders
socket.on('order:created', (order) => {
  // Add to pending orders column
  addToPendingOrders(order);
  // Play notification sound
  playNotificationSound();
});

// Listen for order status updates
socket.on('order:updated', (order) => {
  // Move order to appropriate column
  moveOrderToColumn(order, order.status);
});
```

## Error Handling

### Connection Errors

```typescript
socket.on('connect_error', (error) => {
  if (error.message === 'Authentication required') {
    // Redirect to login
    redirectToLogin();
  } else if (error.message === 'Invalid or expired token') {
    // Refresh token or redirect to login
    refreshTokenOrLogin();
  } else {
    // Show connection error
    showConnectionError(error.message);
  }
});
```

### Reconnection

Socket.io automatically handles reconnection with exponential backoff. You can listen for reconnection events:

```typescript
socket.on('reconnect', (attemptNumber) => {
  console.log('Reconnected after', attemptNumber, 'attempts');
  // Resubscribe to rooms
  socket.emit('subscribe:orders');
  socket.emit('subscribe:tables');
});

socket.on('reconnect_attempt', (attemptNumber) => {
  console.log('Reconnection attempt', attemptNumber);
});

socket.on('reconnect_failed', () => {
  console.error('Failed to reconnect');
  showReconnectionError();
});
```

## Testing

### Manual Testing with Socket.io Client

```bash
npm install -g socket.io-client
```

```javascript
const io = require('socket.io-client');

const socket = io('http://localhost:5000', {
  auth: { token: 'your-jwt-token' }
});

socket.on('connect', () => {
  console.log('Connected!');
  socket.emit('subscribe:orders');
});

socket.on('order:created', (order) => {
  console.log('New order:', order);
});
```

## Architecture

### Event Flow

```
Service Layer (orderService.ts)
    ↓
WebSocket Emitter (emitOrderCreated)
    ↓
Socket.io Server (io.to('orders').emit)
    ↓
Connected Clients (Desktop, PWA, KDS)
```

### Room Distribution

- **orders**: Desktop app order management page
- **tables**: Desktop app table management page
- **kds**: Kitchen display system
- **table:{id}**: PWA customers viewing specific table orders

## Performance Considerations

1. **Event Throttling**: High-frequency events are automatically throttled by Socket.io
2. **Room-based Broadcasting**: Events are only sent to subscribed clients
3. **Payload Size**: Keep event payloads minimal; include only necessary data
4. **Connection Pooling**: Socket.io reuses connections efficiently

## Security

1. **JWT Authentication**: All connections require valid JWT tokens
2. **CORS Protection**: Only allowed origins can connect
3. **Room Authorization**: Future enhancement could add role-based room access
4. **Rate Limiting**: Consider adding rate limiting for subscription events

## Troubleshooting

### WebSocket not connecting

1. Check if server is running: `http://localhost:5000/api/health`
2. Verify JWT token is valid and not expired
3. Check CORS configuration allows your origin
4. Ensure firewall allows WebSocket connections

### Events not received

1. Verify client is subscribed to the correct room
2. Check server logs for event emission
3. Ensure WebSocket connection is established
4. Verify event listener is registered before events are emitted

### Connection drops frequently

1. Check network stability
2. Verify server is not restarting
3. Check for JWT token expiration
4. Review Socket.io reconnection settings
