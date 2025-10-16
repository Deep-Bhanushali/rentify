-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "rental_price" DOUBLE PRECISION NOT NULL,
    "location" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'available',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RentalRequest" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "price" DOUBLE PRECISION NOT NULL,
    "rental_period" INTEGER NOT NULL,
    "pickup_location" TEXT NOT NULL,
    "return_location" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RentalRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "rental_request_id" TEXT NOT NULL,
    "payment_method" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "payment_status" TEXT NOT NULL DEFAULT 'pending',
    "transaction_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "rental_request_id" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "invoice_status" TEXT NOT NULL DEFAULT 'pending',
    "due_date" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Payment_rental_request_id_key" ON "Payment"("rental_request_id");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_rental_request_id_key" ON "Invoice"("rental_request_id");

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RentalRequest" ADD CONSTRAINT "RentalRequest_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RentalRequest" ADD CONSTRAINT "RentalRequest_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_rental_request_id_fkey" FOREIGN KEY ("rental_request_id") REFERENCES "RentalRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_rental_request_id_fkey" FOREIGN KEY ("rental_request_id") REFERENCES "RentalRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
