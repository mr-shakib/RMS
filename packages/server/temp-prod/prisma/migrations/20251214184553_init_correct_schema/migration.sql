/*
  Warnings:

  - You are about to drop the column `address` on the `Printer` table. All the data in the column will be lost.
  - You are about to drop the column `productId` on the `Printer` table. All the data in the column will be lost.
  - You are about to drop the column `serialPath` on the `Printer` table. All the data in the column will be lost.
  - You are about to drop the column `sortOrder` on the `Printer` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `Printer` table. All the data in the column will be lost.
  - You are about to drop the column `vendorId` on the `Printer` table. All the data in the column will be lost.
  - You are about to alter the column `port` on the `Printer` table. The data in that column could be lost. The data in that column will be cast from `String` to `Int`.
  - Added the required column `ipAddress` to the `Printer` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Printer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "ipAddress" TEXT NOT NULL,
    "port" INTEGER NOT NULL DEFAULT 9100,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Printer" ("createdAt", "id", "isActive", "name", "port", "updatedAt") SELECT "createdAt", "id", "isActive", "name", coalesce("port", 9100) AS "port", "updatedAt" FROM "Printer";
DROP TABLE "Printer";
ALTER TABLE "new_Printer" RENAME TO "Printer";
CREATE INDEX "Printer_isActive_idx" ON "Printer"("isActive");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "OrderItem_menuItemId_idx" ON "OrderItem"("menuItemId");
