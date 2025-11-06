import { Order, Table, MenuItem, Payment } from '@prisma/client';

/**
 * Server-to-Client Events
 * Events that the server emits to connected clients
 */
export interface ServerToClientEvents {
  // Order events
  'order:created': (order: Order) => void;
  'order:updated': (order: Order) => void;
  'order:cancelled': (data: { orderId: string; tableId: number }) => void;

  // Table events
  'table:updated': (table: Table) => void;

  // Menu events
  'menu:updated': (menuItem: MenuItem) => void;

  // Payment events
  'payment:completed': (payment: Payment) => void;
}

/**
 * Client-to-Server Events
 * Events that clients can emit to the server
 */
export interface ClientToServerEvents {
  // Subscription events
  'subscribe:orders': () => void;
  'subscribe:tables': () => void;
  'subscribe:kds': () => void;
  'subscribe:table': (tableId: number) => void;

  // Unsubscription events
  'unsubscribe:orders': () => void;
  'unsubscribe:tables': () => void;
  'unsubscribe:kds': () => void;
  'unsubscribe:table': (tableId: number) => void;
}

/**
 * WebSocket Room Names
 */
export enum WebSocketRoom {
  ORDERS = 'orders',
  TABLES = 'tables',
  KDS = 'kds',
}

/**
 * Helper function to get table-specific room name
 */
export const getTableRoom = (tableId: number): string => `table:${tableId}`;
