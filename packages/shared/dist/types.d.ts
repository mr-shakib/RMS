import { Role, TableStatus, OrderStatus, PaymentMethod } from './enums';
export interface User {
    id: string;
    username: string;
    role: Role;
    createdAt: Date;
    updatedAt: Date;
}
export interface Table {
    id: number;
    name: string;
    qrCodeUrl: string;
    status: TableStatus;
    createdAt: Date;
    updatedAt: Date;
}
export interface Category {
    id: string;
    name: string;
    isBuffet: boolean;
    buffetPrice?: number;
    sortOrder: number;
    createdAt: Date;
    updatedAt: Date;
}
export interface MenuItem {
    id: string;
    itemNumber?: number;
    name: string;
    categoryId: string;
    category?: Category;
    secondaryCategoryId?: string;
    secondaryCategory?: Category;
    price: number;
    description?: string;
    imageUrl?: string;
    available: boolean;
    alwaysPriced?: boolean;
    createdAt: Date;
    updatedAt: Date;
}
export interface Order {
    id: string;
    tableId: number;
    status: OrderStatus;
    isBuffet: boolean;
    buffetCategoryId?: string;
    subtotal: number;
    tax: number;
    discount: number;
    serviceCharge: number;
    tip: number;
    total: number;
    items?: OrderItemWithMenuItem[];
    createdAt: Date;
    updatedAt: Date;
}
export interface OrderItem {
    id: string;
    orderId: string;
    menuItemId: string;
    quantity: number;
    price: number;
    notes?: string;
    createdAt: Date;
}
export interface OrderItemWithMenuItem extends OrderItem {
    menuItem?: MenuItem;
}
export interface Payment {
    id: string;
    orderId: string;
    amount: number;
    method: PaymentMethod;
    reference?: string;
    createdAt: Date;
}
export interface Setting {
    key: string;
    value: string;
    updatedAt: Date;
}
export interface CreateOrderDTO {
    tableId: number;
    isBuffet?: boolean;
    buffetCategoryId?: string;
    items: {
        menuItemId: string;
        quantity: number;
        notes?: string;
    }[];
}
export interface UpdateOrderStatusDTO {
    status: OrderStatus;
}
export interface CreateCategoryDTO {
    name: string;
    isBuffet?: boolean;
    buffetPrice?: number;
    sortOrder?: number;
}
export interface CreateMenuItemDTO {
    name: string;
    categoryId: string;
    secondaryCategoryId?: string;
    price: number;
    description?: string;
    imageUrl?: string;
    available?: boolean;
    itemNumber?: number;
    alwaysPriced?: boolean;
}
export interface CreateTableDTO {
    name: string;
}
export interface PaymentDTO {
    orderId: string;
    amount: number;
    method: PaymentMethod;
    reference?: string;
}
export interface SalesReportDTO {
    startDate: string;
    endDate: string;
    groupBy?: 'day' | 'week' | 'month';
}
export interface ServerEvents {
    'order:created': (order: Order) => void;
    'order:updated': (order: Order) => void;
    'order:cancelled': (orderId: string) => void;
    'table:updated': (table: Table) => void;
    'menu:updated': (menuItem: MenuItem) => void;
    'payment:completed': (payment: Payment) => void;
}
export interface ClientEvents {
    'subscribe:orders': () => void;
    'subscribe:tables': () => void;
    'subscribe:kds': () => void;
    'unsubscribe:orders': () => void;
    'unsubscribe:tables': () => void;
    'unsubscribe:kds': () => void;
}
