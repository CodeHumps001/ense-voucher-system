/*
  Warnings:

  - You are about to drop the `users` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `voucher_items` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `vouchers` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'STAFF');

-- DropForeignKey
ALTER TABLE "voucher_items" DROP CONSTRAINT "voucher_items_voucher_id_fkey";

-- DropForeignKey
ALTER TABLE "vouchers" DROP CONSTRAINT "vouchers_user_id_fkey";

-- DropTable
DROP TABLE "users";

-- DropTable
DROP TABLE "voucher_items";

-- DropTable
DROP TABLE "vouchers";

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'STAFF',
    "isTemporaryPassword" BOOLEAN NOT NULL DEFAULT false,
    "resetToken" TEXT,
    "resetTokenExpiry" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Voucher" (
    "id" TEXT NOT NULL,
    "voucherNumber" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paymentMethod" "PaymentMethod" NOT NULL DEFAULT 'PETTY_CASH',
    "whtPercentage" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "totalAmountGhc" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "totalAmountUsd" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "requestedBy" TEXT NOT NULL,
    "requestDate" TIMESTAMP(3) NOT NULL,
    "authorizedBy" TEXT,
    "authorizedDate" TIMESTAMP(3),
    "approvedBy" TEXT,
    "approvedDate" TIMESTAMP(3),
    "retirementDate" TIMESTAMP(3),
    "invoiceAmount" DOUBLE PRECISION,
    "cashRetiredAmount" DOUBLE PRECISION,
    "cashReimbursedAmt" DOUBLE PRECISION,
    "retirementNameSign" TEXT,
    "userId" TEXT NOT NULL,

    CONSTRAINT "Voucher_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VoucherItem" (
    "id" TEXT NOT NULL,
    "voucherId" TEXT NOT NULL,
    "expenseDate" TIMESTAMP(3) NOT NULL,
    "description" TEXT NOT NULL,
    "ghcAmount" DOUBLE PRECISION NOT NULL,
    "usdAmount" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "VoucherItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Voucher_voucherNumber_key" ON "Voucher"("voucherNumber");

-- AddForeignKey
ALTER TABLE "Voucher" ADD CONSTRAINT "Voucher_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VoucherItem" ADD CONSTRAINT "VoucherItem_voucherId_fkey" FOREIGN KEY ("voucherId") REFERENCES "Voucher"("id") ON DELETE CASCADE ON UPDATE CASCADE;
