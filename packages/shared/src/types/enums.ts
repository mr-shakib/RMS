// Enum types for type safety across the application
// These match the database schema values

export enum Role {
  ADMIN = 'ADMIN',
  WAITER = 'WAITER',
  CHEF = 'CHEF',
}

export enum TableStatus {
  FREE = 'FREE',
  OCCUPIED = 'OCCUPIED',
  RESERVED = 'RESERVED',
}

export enum OrderStatus {
  PENDING = 'PENDING',
  PREPARING = 'PREPARING',
  READY = 'READY',
  SERVED = 'SERVED',
  PAID = 'PAID',
  CANCELLED = 'CANCELLED',
}

export enum PaymentMethod {
  CASH = 'CASH',
  CARD = 'CARD',
  WALLET = 'WALLET',
}

// Type guards for runtime validation
export const isValidRole = (value: string): value is Role => {
  return Object.values(Role).includes(value as Role);
};

export const isValidTableStatus = (value: string): value is TableStatus => {
  return Object.values(TableStatus).includes(value as TableStatus);
};

export const isValidOrderStatus = (value: string): value is OrderStatus => {
  return Object.values(OrderStatus).includes(value as OrderStatus);
};

export const isValidPaymentMethod = (value: string): value is PaymentMethod => {
  return Object.values(PaymentMethod).includes(value as PaymentMethod);
};
