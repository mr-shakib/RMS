// Enums matching Prisma schema
export var Role;
(function (Role) {
    Role["ADMIN"] = "ADMIN";
    Role["WAITER"] = "WAITER";
    Role["CHEF"] = "CHEF";
})(Role || (Role = {}));
export var TableStatus;
(function (TableStatus) {
    TableStatus["FREE"] = "FREE";
    TableStatus["OCCUPIED"] = "OCCUPIED";
    TableStatus["RESERVED"] = "RESERVED";
})(TableStatus || (TableStatus = {}));
export var OrderStatus;
(function (OrderStatus) {
    OrderStatus["PENDING"] = "PENDING";
    OrderStatus["PREPARING"] = "PREPARING";
    OrderStatus["READY"] = "READY";
    OrderStatus["SERVED"] = "SERVED";
    OrderStatus["PAID"] = "PAID";
    OrderStatus["CANCELLED"] = "CANCELLED";
})(OrderStatus || (OrderStatus = {}));
export var PaymentMethod;
(function (PaymentMethod) {
    PaymentMethod["CASH"] = "CASH";
    PaymentMethod["CARD"] = "CARD";
    PaymentMethod["WALLET"] = "WALLET";
})(PaymentMethod || (PaymentMethod = {}));
