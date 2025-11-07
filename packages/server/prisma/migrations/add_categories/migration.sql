-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "isBuffet" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- Create default categories
INSERT INTO "Category" ("id", "name", "isBuffet", "sortOrder", "createdAt", "updatedAt") VALUES
('cat-buffet', 'Buffet', 1, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('cat-appetizers', 'Appetizers', 0, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('cat-main', 'Main Course', 0, 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('cat-desserts', 'Desserts', 0, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('cat-beverages', 'Beverages', 0, 4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('cat-sides', 'Sides', 0, 5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('cat-salads', 'Salads', 0, 6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('cat-soups', 'Soups', 0, 7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('cat-specials', 'Specials', 0, 8, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Migrate existing menu items to use categoryId
-- First, add the new column
ALTER TABLE "MenuItem" ADD COLUMN "categoryId" TEXT;

-- Update existing items to map old category strings to new category IDs
UPDATE "MenuItem" SET "categoryId" = 'cat-buffet' WHERE "category" = 'Buffet';
UPDATE "MenuItem" SET "categoryId" = 'cat-appetizers' WHERE "category" = 'Appetizers';
UPDATE "MenuItem" SET "categoryId" = 'cat-main' WHERE "category" = 'Main Course';
UPDATE "MenuItem" SET "categoryId" = 'cat-desserts' WHERE "category" = 'Desserts';
UPDATE "MenuItem" SET "categoryId" = 'cat-beverages' WHERE "category" = 'Beverages';
UPDATE "MenuItem" SET "categoryId" = 'cat-sides' WHERE "category" = 'Sides';
UPDATE "MenuItem" SET "categoryId" = 'cat-salads' WHERE "category" = 'Salads';
UPDATE "MenuItem" SET "categoryId" = 'cat-soups' WHERE "category" = 'Soups';
UPDATE "MenuItem" SET "categoryId" = 'cat-specials' WHERE "category" = 'Specials';

-- Set a default category for any items that don't match
UPDATE "MenuItem" SET "categoryId" = 'cat-main' WHERE "categoryId" IS NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Category_name_key" ON "Category"("name");

-- CreateIndex
CREATE INDEX "Category_sortOrder_idx" ON "Category"("sortOrder");

-- Drop the old category column and index
DROP INDEX "MenuItem_category_idx";

-- RedefineTables (SQLite doesn't support DROP COLUMN, so we recreate the table)
PRAGMA foreign_keys=OFF;

CREATE TABLE "new_MenuItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "price" REAL NOT NULL,
    "description" TEXT,
    "imageUrl" TEXT,
    "available" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MenuItem_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

INSERT INTO "new_MenuItem" SELECT "id", "name", "categoryId", "price", "description", "imageUrl", "available", "createdAt", "updatedAt" FROM "MenuItem";

DROP TABLE "MenuItem";

ALTER TABLE "new_MenuItem" RENAME TO "MenuItem";

CREATE INDEX "MenuItem_categoryId_idx" ON "MenuItem"("categoryId");
CREATE INDEX "MenuItem_available_idx" ON "MenuItem"("available");

PRAGMA foreign_keys=ON;
