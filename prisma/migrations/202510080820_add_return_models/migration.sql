-- CreateTable
CREATE TABLE "ProductReturn" (
    "id" TEXT NOT NULL,
    "rental_request_id" TEXT NOT NULL,
    "return_date" TIMESTAMP(3) NOT NULL,
    "return_location" TEXT NOT NULL,
    "return_status" TEXT NOT NULL DEFAULT 'initiated',
    "condition_notes" TEXT,
    "customer_signature" TEXT,
    "owner_confirmation" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductReturn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DamageAssessment" (
    "id" TEXT NOT NULL,
    "product_return_id" TEXT NOT NULL,
    "damage_type" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "estimated_cost" DOUBLE PRECISION NOT NULL,
    "approved" BOOLEAN NOT NULL DEFAULT false,
    "assessed_by" TEXT NOT NULL,
    "assessment_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DamageAssessment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DamagePhoto" (
    "id" TEXT NOT NULL,
    "damage_assessment_id" TEXT NOT NULL,
    "photo_url" TEXT NOT NULL,
    "description" TEXT,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DamagePhoto_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProductReturn_rental_request_id_key" ON "ProductReturn"("rental_request_id");

-- CreateIndex
CREATE UNIQUE INDEX "DamageAssessment_product_return_id_key" ON "DamageAssessment"("product_return_id");

-- AddForeignKey
ALTER TABLE "ProductReturn" ADD CONSTRAINT "ProductReturn_rental_request_id_fkey" FOREIGN KEY ("rental_request_id") REFERENCES "RentalRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DamageAssessment" ADD CONSTRAINT "DamageAssessment_product_return_id_fkey" FOREIGN KEY ("product_return_id") REFERENCES "ProductReturn"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DamagePhoto" ADD CONSTRAINT "DamagePhoto_damage_assessment_id_fkey" FOREIGN KEY ("damage_assessment_id") REFERENCES "DamageAssessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;