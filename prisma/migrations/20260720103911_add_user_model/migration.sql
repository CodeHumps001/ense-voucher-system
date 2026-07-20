-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('PETTY_CASH', 'CHEQUE', 'KOWRI');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'USER',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vouchers" (
    "id" TEXT NOT NULL,
    "voucher_number" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "payment_method" "PaymentMethod" NOT NULL,
    "wht_percentage" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "total_amount_ghc" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "total_amount_usd" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "requested_by" TEXT NOT NULL,
    "request_date" TIMESTAMP(3) NOT NULL,
    "authorized_by" TEXT,
    "authorized_date" TIMESTAMP(3),
    "approved_by" TEXT,
    "approved_date" TIMESTAMP(3),
    "retirement_date" TIMESTAMP(3),
    "invoice_amount" DOUBLE PRECISION,
    "cash_retired_amount" DOUBLE PRECISION,
    "cash_reimbursed_amt" DOUBLE PRECISION,
    "retirement_name_sign" TEXT,
    "user_id" TEXT,

    CONSTRAINT "vouchers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "voucher_items" (
    "id" TEXT NOT NULL,
    "voucher_id" TEXT NOT NULL,
    "expense_date" TIMESTAMP(3) NOT NULL,
    "description" TEXT NOT NULL,
    "ghc_amount" DOUBLE PRECISION NOT NULL,
    "usd_amount" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "voucher_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "vouchers_voucher_number_key" ON "vouchers"("voucher_number");

-- AddForeignKey
ALTER TABLE "vouchers" ADD CONSTRAINT "vouchers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voucher_items" ADD CONSTRAINT "voucher_items_voucher_id_fkey" FOREIGN KEY ("voucher_id") REFERENCES "vouchers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
