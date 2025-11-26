export declare enum Role {
    ADMIN = "ADMIN",
    WAITER = "WAITER",
    CHEF = "CHEF"
}
export declare enum TableStatus {
    FREE = "FREE",
    OCCUPIED = "OCCUPIED",
    RESERVED = "RESERVED"
}
export declare enum OrderStatus {
    PENDING = "PENDING",
    PREPARING = "PREPARING",
    READY = "READY",
    SERVED = "SERVED",
    PAID = "PAID",
    CANCELLED = "CANCELLED"
}
export declare enum PaymentMethod {
    CASH = "CASH",
    CARD = "CARD",
    WALLET = "WALLET"
}
export declare const isValidRole: (value: string) => value is Role;
export declare const isValidTableStatus: (value: string) => value is TableStatus;
export declare const isValidOrderStatus: (value: string) => value is OrderStatus;
export declare const isValidPaymentMethod: (value: string) => value is PaymentMethod;
