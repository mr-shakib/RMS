-- First, create the new junction table
CREATE TABLE "MenuItemBuffetCategory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "menuItemId" TEXT NOT NULL,
    "buffetCategoryId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MenuItemBuffetCategory_menuItemId_fkey" FOREIGN KEY ("menuItemId") REFERENCES "MenuItem" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MenuItemBuffetCategory_buffetCategoryId_fkey" FOREIGN KEY ("buffetCategoryId") REFERENCES "Category" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Create indexes
CREATE UNIQUE INDEX "MenuItemBuffetCategory_menuItemId_buffetCategoryId_key" ON "MenuItemBuffetCategory"("menuItemId", "buffetCategoryId");
CREATE INDEX "MenuItemBuffetCategory_menuItemId_idx" ON "MenuItemBuffetCategory"("menuItemId");
CREATE INDEX "MenuItemBuffetCategory_buffetCategoryId_idx" ON "MenuItemBuffetCategory"("buffetCategoryId");

-- Migrate data: Copy buffet assignments from secondaryCategoryId to junction table
-- Only migrate if the secondary category is a buffet category
INSERT INTO "MenuItemBuffetCategory" ("id", "menuItemId", "buffetCategoryId", "createdAt")
SELECT 
    lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)), 2) || '-' || substr('89ab', abs(random()) % 4 + 1, 1) || substr(hex(randomblob(2)), 2) || '-' || hex(randomblob(6))) as id,
    m.id as menuItemId,
    m.secondaryCategoryId as buffetCategoryId,
    CURRENT_TIMESTAMP as createdAt
FROM "MenuItem" m
INNER JOIN "Category" c ON m.secondaryCategoryId = c.id
WHERE m.secondaryCategoryId IS NOT NULL 
  AND c.isBuffet = 1;

-- Migrate data: Copy buffet assignments from tertiaryCategoryId to junction table
-- Only migrate if the tertiary category is a buffet category
INSERT INTO "MenuItemBuffetCategory" ("id", "menuItemId", "buffetCategoryId", "createdAt")
SELECT 
    lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)), 2) || '-' || substr('89ab', abs(random()) % 4 + 1, 1) || substr(hex(randomblob(2)), 2) || '-' || hex(randomblob(6))) as id,
    m.id as menuItemId,
    m.tertiaryCategoryId as buffetCategoryId,
    CURRENT_TIMESTAMP as createdAt
FROM "MenuItem" m
INNER JOIN "Category" c ON m.tertiaryCategoryId = c.id
WHERE m.tertiaryCategoryId IS NOT NULL 
  AND c.isBuffet = 1
  AND NOT EXISTS (
    -- Avoid duplicates if same category exists in both secondary and tertiary
    SELECT 1 FROM "MenuItemBuffetCategory" mibc 
    WHERE mibc.menuItemId = m.id 
    AND mibc.buffetCategoryId = m.tertiaryCategoryId
  );

-- Drop the old foreign key constraints
-- SQLite doesn't support dropping constraints directly, so we need to recreate the table
-- First, create a temporary table with the new schema
CREATE TABLE "MenuItem_new" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "itemNumber" INTEGER,
    "name" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "price" REAL NOT NULL,
    "description" TEXT,
    "imageUrl" TEXT,
    "available" BOOLEAN NOT NULL DEFAULT true,
    "alwaysPriced" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MenuItem_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Copy data from old table to new table (excluding secondaryCategoryId and tertiaryCategoryId)
INSERT INTO "MenuItem_new" ("id", "itemNumber", "name", "categoryId", "price", "description", "imageUrl", "available", "alwaysPriced", "createdAt", "updatedAt")
SELECT "id", "itemNumber", "name", "categoryId", "price", "description", "imageUrl", "available", "alwaysPriced", "createdAt", "updatedAt"
FROM "MenuItem";

-- Drop old table
DROP TABLE "MenuItem";

-- Rename new table
ALTER TABLE "MenuItem_new" RENAME TO "MenuItem";

-- Recreate indexes on MenuItem
CREATE UNIQUE INDEX "MenuItem_itemNumber_key" ON "MenuItem"("itemNumber");
CREATE INDEX "MenuItem_itemNumber_idx" ON "MenuItem"("itemNumber");
CREATE INDEX "MenuItem_categoryId_idx" ON "MenuItem"("categoryId");
CREATE INDEX "MenuItem_available_idx" ON "MenuItem"("available");
