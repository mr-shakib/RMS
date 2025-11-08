# Error Handling and Validation System

This document describes the comprehensive error handling and validation system implemented across the Restaurant Management System.

## Overview

The error handling system provides:
- **Structured error types** with appropriate HTTP status codes
- **Validation middleware** for request data
- **Database transaction rollback** on errors
- **Printer retry mechanism** with exponential backoff
- **WebSocket reconnection** with exponential backoff
- **Network error detection** and offline mode
- **User-friendly error messages** across all interfaces

## Server-Side Error Handling

### Error Classes

Located in `src/errors/AppError.ts`:

```typescript
- AppError: Base error class with status code and operational flag
- ValidationError: 400 - Invalid request data
- AuthenticationError: 401 - Authentication required
- AuthorizationError: 403 - Insufficient permissions
- NotFoundError: 404 - Resource not found
- ConflictError: 409 - Resource conflict
- DatabaseError: 500 - Database operation failed
- PrinterError: 500 - Printer operation failed (with retryable flag)
- NetworkError: 503 - Network connection failed
```

### Error Handler Middleware

Located in `src/middleware/errorHandler.ts`:

- Catches all errors in Express routes
- Translates Prisma errors to user-friendly messages
- Logs errors with context (path, method, IP, user agent)
- Returns appropriate HTTP status codes
- Includes retry hints for transient errors

### Validation Middleware

Located in `src/middleware/validation.ts`:

Provides declarative validation rules:

```typescript
validate([
  { field: 'name', required: true, type: 'string', min: 1, max: 100 },
  { field: 'price', required: true, type: 'number', min: 0 },
  { field: 'email', pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
  { field: 'items', custom: (value) => Array.isArray(value) && value.length > 0 }
])
```

Pre-built validators:
- `orderValidation`
- `menuItemValidation`
- `tableValidation`
- `paymentValidation`
- `categoryValidation`

### Database Transaction Handling

Located in `src/utils/transaction.ts`:

```typescript
// Execute with automatic rollback on error
await withTransaction(prisma, async (tx) => {
  await tx.order.create({ ... });
  await tx.orderItem.createMany({ ... });
  return result;
});

// Execute with retry for transient errors
await withRetry(async () => {
  return await prisma.order.findMany();
}, 3, 1000);
```

### Printer Error Handling

Located in `src/services/printerService.ts`:

Features:
- **Print queue** with automatic retry (3 attempts)
- **Exponential backoff** between retries (1s, 2s, 4s)
- **PDF fallback** generation if printing fails
- **WebSocket notifications** to desktop UI on errors
- **Graceful degradation** - continues processing other jobs

### WebSocket Error Handling

Located in `src/websocket/index.ts`:

Features:
- Connection confirmation events
- Subscription acknowledgments
- Ping/pong health checks
- Error event handling
- Disconnect reason logging

## Desktop Frontend Error Handling

### Toast Notification System

Located in `src/store/toastStore.ts` and `src/components/Toast.tsx`:

Usage:
```typescript
import { toast } from '@/store/toastStore';

// Success notification
toast.success('Order created successfully');

// Error with action
toast.error('Failed to save', 'Error', {
  label: 'Retry',
  onClick: () => retryOperation()
});

// Warning
toast.warning('Connection unstable');

// Info
toast.info('New feature available');
```

Features:
- Auto-dismiss with configurable duration
- Action buttons for retry/undo
- Stacking multiple toasts
- Slide-in animation
- Dark mode support

### Global Error Boundary

Located in `src/components/ErrorBoundary.tsx`:

Catches React component errors:
- Displays user-friendly error UI
- Shows error details in development
- Provides "Try Again" and "Go Home" actions
- Logs errors to console (can be extended to external service)

### Enhanced API Client

Located in `src/lib/apiClient.ts`:

Features:
- **Automatic token injection** from localStorage
- **Authentication error handling** - auto-redirect to login
- **Network error detection** with retry hints
- **Structured error responses** with details
- **APIError class** with status code and retryable flag

Error handling:
```typescript
try {
  const data = await apiClient.get('/orders');
} catch (error) {
  if (error instanceof APIError) {
    if (error.retryable) {
      toast.error(error.message, 'Error', {
        label: 'Retry',
        onClick: () => retry()
      });
    } else {
      toast.error(error.message);
    }
  }
}
```

### Enhanced Socket Client

Located in `src/lib/socketClient.ts`:

Features:
- **Manual reconnection** with exponential backoff
- **Connection status callbacks** for UI updates
- **Health check** via ping/pong
- **Max retry limit** (10 attempts)
- **Jitter** to prevent thundering herd
- **Graceful disconnect** handling

Usage:
```typescript
// Subscribe to connection status
const unsubscribe = socketClient.onStatusChange((status) => {
  if (status === 'connected') {
    toast.success('Connected to server');
  } else if (status === 'reconnecting') {
    toast.warning('Reconnecting...');
  } else if (status === 'error') {
    toast.error('Connection failed');
  }
});

// Health check
const isHealthy = await socketClient.ping();
```

## PWA Error Handling

### Enhanced API Client

Located in `src/api.ts`:

Features:
- **Request timeout** (15 seconds)
- **Network error detection**
- **Structured error responses**
- **APIError class** with retry hints

### Toast Notification System

Located in `src/toast.ts`:

Vanilla JavaScript implementation:
```typescript
import { toast } from './toast';

toast.success('Order placed successfully');
toast.error('Failed to load menu', {
  label: 'Retry',
  onClick: () => loadMenu()
});
toast.warning('You are offline');
toast.info('Swipe to refresh');
```

### Network Status Indicator

Located in `src/networkIndicator.ts`:

Features:
- **Persistent offline banner** at top of screen
- **"Back online" notification** when reconnected
- **Automatic initialization** on app start
- **Visual feedback** with icons and animations

### Enhanced Offline Queue

Located in `src/offlineQueue.ts`:

Features:
- **Retry logic** with max attempts (5)
- **Exponential backoff** between retries
- **Request timeout** (10 seconds)
- **Smart error handling**:
  - Remove orders with client errors (400-499)
  - Retry server errors (500-599)
  - Retry timeouts and rate limits
- **Error reporting** with detailed messages

### Global Error Handlers

Located in `src/main.ts`:

```typescript
// Catch unhandled errors
window.addEventListener('error', (event) => {
  toast.error('An unexpected error occurred');
});

// Catch unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
  toast.error('An unexpected error occurred');
});
```

## Best Practices

### 1. Always Use Try-Catch

```typescript
try {
  const result = await apiClient.post('/orders', data);
  toast.success('Order created');
  return result;
} catch (error) {
  if (error instanceof APIError) {
    toast.error(error.message);
  } else {
    toast.error('An unexpected error occurred');
  }
  throw error;
}
```

### 2. Provide Retry Actions

```typescript
toast.error('Failed to save changes', 'Error', {
  label: 'Retry',
  onClick: () => saveChanges()
});
```

### 3. Use Validation Middleware

```typescript
router.post('/orders', 
  authenticate,
  orderValidation,  // Validates before handler
  async (req, res) => {
    // Data is already validated
  }
);
```

### 4. Use Transactions for Multi-Step Operations

```typescript
await withTransaction(prisma, async (tx) => {
  const order = await tx.order.create({ ... });
  await tx.orderItem.createMany({ ... });
  await tx.table.update({ ... });
  return order;
});
```

### 5. Handle Network Errors Gracefully

```typescript
if (!networkStatus.isOnline) {
  toast.warning('You are offline. Order will be queued.');
  await offlineQueue.addOrder(order);
  return;
}
```

## Testing Error Handling

### Test Network Errors

```bash
# Disconnect network
# Try to place order in PWA
# Verify order is queued
# Reconnect network
# Verify order is synced
```

### Test Validation Errors

```bash
curl -X POST http://localhost:5000/api/orders \
  -H "Content-Type: application/json" \
  -d '{"tableId": "invalid"}'
# Should return 400 with validation error
```

### Test Printer Errors

```bash
# Disconnect printer
# Try to print receipt
# Verify retry attempts in logs
# Verify PDF fallback is generated
# Verify WebSocket error notification
```

### Test WebSocket Reconnection

```bash
# Stop server
# Observe reconnection attempts in browser console
# Restart server
# Verify automatic reconnection
```

## Monitoring and Logging

All errors are logged with context:
- Timestamp
- Error name and message
- Request path and method
- User IP and user agent
- Stack trace (for programming errors)

Logs can be integrated with external services:
- Sentry for error tracking
- LogRocket for session replay
- CloudWatch for centralized logging

## Future Enhancements

- [ ] Integrate with Sentry for error tracking
- [ ] Add error rate monitoring and alerts
- [ ] Implement circuit breaker pattern for external services
- [ ] Add request ID tracing across services
- [ ] Implement graceful degradation for non-critical features
- [ ] Add error recovery suggestions in UI
- [ ] Implement automatic error reporting to support
