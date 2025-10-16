/*
  Warnings:

  - The `invoice_status` column on the `Invoice` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `payment_status` column on the `Payment` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `status` column on the `Product` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `return_status` column on the `ProductReturn` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `status` column on the `RentalRequest` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Changed the type of `severity` on the `DamageAssessment` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `item_type` on the `InvoiceItem` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "ProductStatus" AS ENUM ('available', 'rented', 'unavailable');

-- CreateEnum
CREATE TYPE "RentalRequestStatus" AS ENUM ('pending', 'accepted', 'rejected', 'completed', 'cancelled', 'paid', 'returned');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('pending', 'completed', 'failed', 'refunded');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('pending', 'sent', 'paid', 'overdue', 'cancelled');

-- CreateEnum
CREATE TYPE "ReturnStatus" AS ENUM ('initiated', 'in_progress', 'completed', 'cancelled');

-- CreateEnum
CREATE TYPE "DamageSeverity" AS ENUM ('minor', 'moderate', 'major');

-- CreateEnum
CREATE TYPE "InvoiceItemType" AS ENUM ('rental_fee', 'tax', 'late_fee', 'damage_fee', 'additional_charge');

-- AlterTable
ALTER TABLE "DamageAssessment" DROP COLUMN "severity",
ADD COLUMN     "severity" "DamageSeverity" NOT NULL;

-- AlterTable
ALTER TABLE "Invoice" DROP COLUMN "invoice_status",
ADD COLUMN     "invoice_status" "InvoiceStatus" NOT NULL DEFAULT 'pending';

-- AlterTable
ALTER TABLE "InvoiceItem" DROP COLUMN "item_type",
ADD COLUMN     "item_type" "InvoiceItemType" NOT NULL;

-- AlterTable
ALTER TABLE "Payment" DROP COLUMN "payment_status",
ADD COLUMN     "payment_status" "PaymentStatus" NOT NULL DEFAULT 'pending';

-- AlterTable
ALTER TABLE "Product" DROP COLUMN "status",
ADD COLUMN     "status" "ProductStatus" NOT NULL DEFAULT 'available';

-- AlterTable
ALTER TABLE "ProductReturn" DROP COLUMN "return_status",
ADD COLUMN     "return_status" "ReturnStatus" NOT NULL DEFAULT 'initiated';

-- AlterTable
ALTER TABLE "RentalRequest" DROP COLUMN "status",
ADD COLUMN     "status" "RentalRequestStatus" NOT NULL DEFAULT 'pending';
