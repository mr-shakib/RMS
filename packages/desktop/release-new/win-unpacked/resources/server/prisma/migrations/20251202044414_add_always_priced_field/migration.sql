-- Add alwaysPriced field to MenuItem table
-- This field marks items that should always be individually priced (e.g., beverages, desserts)
-- even when customer orders a buffet

-- Add column with default value false
ALTER TABLE "MenuItem" ADD COLUMN "alwaysPriced" BOOLEAN NOT NULL DEFAULT false;

-- Update existing items in Beverages and Desserts categories to be always priced
-- This assumes you have categories named 'Beverages', 'Drinks', 'Desserts', or 'Sweets'
UPDATE "MenuItem" 
SET "alwaysPriced" = true
WHERE "categoryId" IN (
  SELECT "id" FROM "Category" 
  WHERE LOWER("name") LIKE '%beverage%' 
     OR LOWER("name") LIKE '%drink%' 
     OR LOWER("name") LIKE '%dessert%' 
     OR LOWER("name") LIKE '%sweet%'
);
