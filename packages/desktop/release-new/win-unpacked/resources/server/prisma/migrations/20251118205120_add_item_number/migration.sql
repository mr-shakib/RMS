/*
  Warnings:

  - A unique constraint covering the columns `[itemNumber]` on the table `MenuItem` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "MenuItem" ADD COLUMN "itemNumber" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "MenuItem_itemNumber_key" ON "MenuItem"("itemNumber");

-- CreateIndex
CREATE INDEX "MenuItem_itemNumber_idx" ON "MenuItem"("itemNumber");
