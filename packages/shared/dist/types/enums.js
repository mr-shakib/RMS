"use strict";
// Enum types for type safety across the application
// These match the database schema values
Object.defineProperty(exports, "__esModule", { value: true });
exports.isValidPaymentMethod = exports.isValidOrderStatus = exports.isValidTableStatus = exports.isValidRole = exports.PaymentMethod = exports.OrderStatus = exports.TableStatus = exports.Role = void 0;
var Role;
(function (Role) {
    Role["ADMIN"] = "ADMIN";
    Role["WAITER"] = "WAITER";
    Role["CHEF"] = "CHEF";
})(Role || (exports.Role = Role = {}));
var TableStatus;
(function (TableStatus) {
    TableStatus["FREE"] = "FREE";
    TableStatus["OCCUPIED"] = "OCCUPIED";
    TableStatus["RESERVED"] = "RESERVED";
})(TableStatus || (exports.TableStatus = TableStatus = {}));
var OrderStatus;
(function (OrderStatus) {
    OrderStatus["PENDING"] = "PENDING";
    OrderStatus["PREPARING"] = "PREPARING";
    OrderStatus["READY"] = "READY";
    OrderStatus["SERVED"] = "SERVED";
    OrderStatus["PAID"] = "PAID";
    OrderStatus["CANCELLED"] = "CANCELLED";
})(OrderStatus || (exports.OrderStatus = OrderStatus = {}));
var PaymentMethod;
(function (PaymentMethod) {
    PaymentMethod["CASH"] = "CASH";
    PaymentMethod["CARD"] = "CARD";
    PaymentMethod["WALLET"] = "WALLET";
})(PaymentMethod || (exports.PaymentMethod = PaymentMethod = {}));
// Type guards for runtime validation
const isValidRole = (value) => {
    return Object.values(Role).includes(value);
};
exports.isValidRole = isValidRole;
const isValidTableStatus = (value) => {
    return Object.values(TableStatus).includes(value);
};
exports.isValidTableStatus = isValidTableStatus;
const isValidOrderStatus = (value) => {
    return Object.values(OrderStatus).includes(value);
};
exports.isValidOrderStatus = isValidOrderStatus;
const isValidPaymentMethod = (value) => {
    return Object.values(PaymentMethod).includes(value);
};
exports.isValidPaymentMethod = isValidPaymentMethod;
