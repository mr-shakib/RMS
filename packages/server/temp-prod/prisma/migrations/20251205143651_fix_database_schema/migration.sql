-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Order" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tableId" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "isBuffet" BOOLEAN NOT NULL DEFAULT false,
    "buffetCategoryId" TEXT,
    "subtotal" REAL NOT NULL,
    "tax" REAL NOT NULL,
    "discount" REAL NOT NULL DEFAULT 0,
    "serviceCharge" REAL NOT NULL DEFAULT 0,
    "tip" REAL NOT NULL DEFAULT 0,
    "total" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Order_buffetCategoryId_fkey" FOREIGN KEY ("buffetCategoryId") REFERENCES "Category" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Order" ("buffetCategoryId", "createdAt", "discount", "id", "isBuffet", "serviceCharge", "status", "subtotal", "tableId", "tax", "tip", "total", "updatedAt") SELECT "buffetCategoryId", "createdAt", "discount", "id", "isBuffet", "serviceCharge", "status", "subtotal", "tableId", "tax", "tip", "total", "updatedAt" FROM "Order";
DROP TABLE "Order";
ALTER TABLE "new_Order" RENAME TO "Order";
CREATE INDEX "Order_tableId_idx" ON "Order"("tableId");
CREATE INDEX "Order_status_idx" ON "Order"("status");
CREATE INDEX "Order_createdAt_idx" ON "Order"("createdAt");
CREATE INDEX "Order_buffetCategoryId_idx" ON "Order"("buffetCategoryId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- RedefineIndex
DROP INDEX "User_username_key";
Pragma writable_schema=1;
CREATE UNIQUE INDEX "sqlite_autoindex_User_2" ON "User"("username");
Pragma writable_schema=0;
