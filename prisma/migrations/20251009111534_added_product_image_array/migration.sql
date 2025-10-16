/*
  Warnings:

  - The `image_url` column on the `Product` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "Product" DROP COLUMN "image_url",
ADD COLUMN     "image_url" TEXT[];
