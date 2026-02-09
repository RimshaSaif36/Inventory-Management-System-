/*
  Warnings:

  - Added the required column `modelId` to the `Products` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Products` table without a default value. This is not possible if the table is not empty.

*/
-- CreateTable
CREATE TABLE "Brand" (
    "brandId" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Category" (
    "categoryId" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "brandId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Category_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand" ("brandId") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Model" (
    "modelId" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "categoryId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Model_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("categoryId") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Insert default Brand
INSERT INTO "Brand" ("brandId", "name", "description", "createdAt", "updatedAt") 
VALUES ('default-brand', 'Default Brand', 'Default brand for existing products', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Insert default Category
INSERT INTO "Category" ("categoryId", "name", "description", "brandId", "createdAt", "updatedAt") 
VALUES ('default-category', 'Default Category', 'Default category for existing products', 'default-brand', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Insert default Model
INSERT INTO "Model" ("modelId", "name", "description", "categoryId", "createdAt", "updatedAt") 
VALUES ('default-model', 'Default Model', 'Default model for existing products', 'default-category', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Products" (
    "productId" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "price" REAL NOT NULL,
    "rating" REAL,
    "stockQuantity" INTEGER NOT NULL,
    "modelId" TEXT NOT NULL DEFAULT 'default-model',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Products_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "Model" ("modelId") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Products" ("name", "price", "productId", "rating", "stockQuantity", "modelId", "createdAt", "updatedAt") 
SELECT "name", "price", "productId", "rating", "stockQuantity", 'default-model', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM "Products";
DROP TABLE "Products";
ALTER TABLE "new_Products" RENAME TO "Products";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
