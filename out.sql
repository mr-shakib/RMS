-- 1. Attach the OLD database so we can read from it
-- REPLACE 'backup.db' with your actual backup file path!
ATTACH 'packages\server\prisma\prisma\dev_backup copy.db' AS old_db;

-- Turn off foreign keys temporarily to prevent errors during copy
PRAGMA foreign_keys=OFF;

BEGIN TRANSACTION;

-- ========================================================
-- 2. Clear the NEW DB (Target) to avoid ID conflicts
-- ========================================================
DELETE FROM main.User;
DELETE FROM main."Table";
DELETE FROM main.Category;
DELETE FROM main.MenuItem;
DELETE FROM main."Order";
DELETE FROM main.OrderItem;
DELETE FROM main.Payment;
DELETE FROM main.Setting;

-- ========================================================
-- 3. Copy Data & Fill Defaults for New Columns
-- ========================================================

-- Users
-- We add 'WAITER' as the default role for old users
INSERT INTO main.User (id, username, password, role, createdAt, updatedAt)
SELECT id, username, password, 'WAITER', createdAt, updatedAt 
FROM old_db.User;

-- Tables
-- We generate a placeholder QR Code URL and set status to 'FREE'
INSERT INTO main."Table" (id, name, qrCodeUrl, status, createdAt, updatedAt)
SELECT id, name, 'pending-url-'||id, 'FREE', createdAt, updatedAt
FROM old_db."Table";

-- Categories
-- We set isBuffet=0 (False) and sortOrder=0
INSERT INTO main.Category (id, name, isBuffet, buffetPrice, sortOrder, createdAt, updatedAt)
SELECT id, name, 0, NULL, 0, createdAt, updatedAt
FROM old_db.Category;

-- MenuItems
-- We set available=1 (True) and alwaysPriced=0 (False)
INSERT INTO main.MenuItem (id, name, categoryId, secondaryCategoryId, price, description, imageUrl, available, alwaysPriced, createdAt, updatedAt)
SELECT id, name, categoryId, NULL, price, description, imageUrl, 1, 0, createdAt, updatedAt
FROM old_db.MenuItem;

-- ========================================================
-- 4. Copy transactional data (Orders, Payments, etc.)
-- Only run these if your OLD DB actually has these tables.
-- If your old DB was empty of orders, you can remove these lines.
-- ========================================================

-- Orders
-- Providing defaults for isBuffet, subtotal, tax, etc if they didn't exist
INSERT INTO main."Order" (id, tableId, status, isBuffet, subtotal, tax, discount, serviceCharge, tip, total, createdAt, updatedAt)
SELECT id, tableId, status, 0, total, 0, 0, 0, 0, total, createdAt, updatedAt
FROM old_db."Order";

-- OrderItems
INSERT INTO main.OrderItem (id, orderId, menuItemId, quantity, price, notes, createdAt)
SELECT id, orderId, menuItemId, quantity, price, notes, createdAt
FROM old_db.OrderItem;

-- Payments
INSERT INTO main.Payment (id, orderId, amount, method, reference, createdAt)
SELECT id, orderId, amount, method, reference, createdAt
FROM old_db.Payment;

-- Settings
INSERT INTO main.Setting (key, value, updatedAt)
SELECT key, value, updatedAt
FROM old_db.Setting;

COMMIT;
PRAGMA foreign_keys=ON;
DETACH old_db;