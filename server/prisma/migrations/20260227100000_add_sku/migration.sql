-- AlterTable
ALTER TABLE "Product" ADD COLUMN "sku" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Product_sku_key" ON "Product"("sku");
