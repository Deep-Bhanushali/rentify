/*
  Warnings:

  - A unique constraint covering the columns `[invoice_id,item_type]` on the table `InvoiceItem` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterEnum
ALTER TYPE "RentalRequestStatus" ADD VALUE 'active';

-- CreateTable
CREATE TABLE "Wishlist" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Wishlist_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Wishlist_user_id_product_id_key" ON "Wishlist"("user_id", "product_id");

-- CreateIndex
CREATE UNIQUE INDEX "InvoiceItem_invoice_id_item_type_key" ON "InvoiceItem"("invoice_id", "item_type");

-- AddForeignKey
ALTER TABLE "Wishlist" ADD CONSTRAINT "Wishlist_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Wishlist" ADD CONSTRAINT "Wishlist_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
