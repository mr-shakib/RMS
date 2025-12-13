-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_MenuItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "itemNumber" INTEGER,
    "name" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "secondaryCategoryId" TEXT,
    "tertiaryCategoryId" TEXT,
    "price" REAL NOT NULL,
    "description" TEXT,
    "imageUrl" TEXT,
    "available" BOOLEAN NOT NULL DEFAULT true,
    "alwaysPriced" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MenuItem_secondaryCategoryId_fkey" FOREIGN KEY ("secondaryCategoryId") REFERENCES "Category" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "MenuItem_tertiaryCategoryId_fkey" FOREIGN KEY ("tertiaryCategoryId") REFERENCES "Category" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "MenuItem_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_MenuItem" ("alwaysPriced", "available", "categoryId", "createdAt", "description", "id", "imageUrl", "itemNumber", "name", "price", "secondaryCategoryId", "updatedAt") SELECT "alwaysPriced", "available", "categoryId", "createdAt", "description", "id", "imageUrl", "itemNumber", "name", "price", "secondaryCategoryId", "updatedAt" FROM "MenuItem";
DROP TABLE "MenuItem";
ALTER TABLE "new_MenuItem" RENAME TO "MenuItem";
CREATE UNIQUE INDEX "MenuItem_itemNumber_key" ON "MenuItem"("itemNumber");
CREATE INDEX "MenuItem_itemNumber_idx" ON "MenuItem"("itemNumber");
CREATE INDEX "MenuItem_categoryId_idx" ON "MenuItem"("categoryId");
CREATE INDEX "MenuItem_secondaryCategoryId_idx" ON "MenuItem"("secondaryCategoryId");
CREATE INDEX "MenuItem_tertiaryCategoryId_idx" ON "MenuItem"("tertiaryCategoryId");
CREATE INDEX "MenuItem_available_idx" ON "MenuItem"("available");
CREATE TABLE "new_PrinterCategory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "printerId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PrinterCategory_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PrinterCategory_printerId_fkey" FOREIGN KEY ("printerId") REFERENCES "Printer" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_PrinterCategory" ("categoryId", "createdAt", "id", "printerId") SELECT "categoryId", "createdAt", "id", "printerId" FROM "PrinterCategory";
DROP TABLE "PrinterCategory";
ALTER TABLE "new_PrinterCategory" RENAME TO "PrinterCategory";
CREATE INDEX "PrinterCategory_printerId_idx" ON "PrinterCategory"("printerId");
CREATE INDEX "PrinterCategory_categoryId_idx" ON "PrinterCategory"("categoryId");
CREATE UNIQUE INDEX "PrinterCategory_printerId_categoryId_key" ON "PrinterCategory"("printerId", "categoryId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- RedefineIndex
DROP INDEX "User_username_key";
Pragma writable_schema=1;
CREATE UNIQUE INDEX "sqlite_autoindex_User_2" ON "User"("username");
Pragma writable_schema=0;
