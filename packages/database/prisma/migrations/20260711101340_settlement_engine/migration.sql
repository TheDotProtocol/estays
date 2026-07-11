-- CreateEnum
CREATE TYPE "CommissionType" AS ENUM ('FLAT', 'PERCENTAGE', 'PROMOTIONAL', 'ZERO');

-- CreateEnum
CREATE TYPE "BookingPaymentCategory" AS ENUM ('PAID_ONLINE', 'PAY_AT_HOTEL');

-- CreateEnum
CREATE TYPE "FinancialSettlementStatus" AS ENUM ('UNSETTLED', 'PENDING', 'SETTLED', 'REVERSED');

-- CreateEnum
CREATE TYPE "SettlementEntryType" AS ENUM ('PAID_ONLINE', 'PAY_AT_HOTEL', 'REFUND', 'MANUAL_CREDIT', 'MANUAL_DEBIT', 'COMMISSION', 'TAX', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "SettlementStatus" AS ENUM ('PENDING', 'ACCEPTED', 'PROCESSING', 'SETTLED', 'COMPLETED', 'FAILED', 'REVERSED');

-- CreateEnum
CREATE TYPE "SettlementDocumentType" AS ENUM ('STATEMENT', 'RECEIPT', 'CSV', 'REPORT');

-- CreateTable
CREATE TABLE "commission_rules" (
    "id" TEXT NOT NULL,
    "hotelId" TEXT,
    "name" TEXT NOT NULL,
    "type" "CommissionType" NOT NULL,
    "flatAmount" DECIMAL(10,2),
    "percentageRate" DECIMAL(7,4),
    "promotionalRate" DECIMAL(7,4),
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveTo" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "commission_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "partner_finance_settings" (
    "hotelId" TEXT NOT NULL,
    "autoSettleEnabled" BOOLEAN NOT NULL DEFAULT true,
    "settlementEmail" TEXT,
    "billingContactName" TEXT,
    "taxRate" DECIMAL(7,4) NOT NULL DEFAULT 0,
    "openingBalance" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "partner_finance_settings_pkey" PRIMARY KEY ("hotelId")
);

-- CreateTable
CREATE TABLE "partner_bank_accounts" (
    "id" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "bankName" TEXT NOT NULL,
    "accountName" TEXT NOT NULL,
    "accountNumber" TEXT NOT NULL,
    "ifscCode" TEXT,
    "swiftCode" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "partner_bank_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking_financials" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "guestId" TEXT NOT NULL,
    "paymentId" TEXT,
    "bookingNumber" TEXT NOT NULL,
    "roomRate" DECIMAL(10,2) NOT NULL,
    "discountAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "finalAmount" DECIMAL(10,2) NOT NULL,
    "paymentCategory" "BookingPaymentCategory" NOT NULL,
    "paymentMethod" "PaymentMethod" NOT NULL,
    "commissionAmount" DECIMAL(10,2) NOT NULL,
    "partnerReceivable" DECIMAL(10,2) NOT NULL,
    "platformReceivable" DECIMAL(10,2) NOT NULL,
    "taxAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "bookingStatus" "BookingStatus" NOT NULL,
    "paymentStatus" "PaymentStatus" NOT NULL,
    "settlementStatus" "FinancialSettlementStatus" NOT NULL DEFAULT 'UNSETTLED',
    "settlementId" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "booking_financials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settlements" (
    "id" TEXT NOT NULL,
    "statementNumber" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "settlementDate" DATE NOT NULL,
    "periodStart" DATE NOT NULL,
    "periodEnd" DATE NOT NULL,
    "openingBalance" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "paidOnlineTotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "payAtHotelTotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "refundsTotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "creditsTotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "debitsTotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "commissionTotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "taxTotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "netPayable" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "netReceivable" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "netSettlement" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "closingBalance" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "bookingCount" INTEGER NOT NULL DEFAULT 0,
    "status" "SettlementStatus" NOT NULL DEFAULT 'PENDING',
    "transactionRef" TEXT,
    "acceptedAt" TIMESTAMP(3),
    "settledAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "reversedAt" TIMESTAMP(3),
    "reversalOfId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "settlements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settlement_items" (
    "id" TEXT NOT NULL,
    "settlementId" TEXT,
    "hotelId" TEXT NOT NULL,
    "bookingFinancialId" TEXT,
    "entryType" "SettlementEntryType" NOT NULL,
    "description" TEXT NOT NULL,
    "bookingId" TEXT,
    "paymentId" TEXT,
    "grossAmount" DECIMAL(12,2) NOT NULL,
    "commission" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "netAmount" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "settlement_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settlement_adjustments" (
    "id" TEXT NOT NULL,
    "settlementId" TEXT,
    "hotelId" TEXT NOT NULL,
    "entryType" "SettlementEntryType" NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "createdById" TEXT,
    "isReversal" BOOLEAN NOT NULL DEFAULT false,
    "reversesId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "settlement_adjustments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "journal_entries" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "hotelId" TEXT,
    "settlementId" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "journal_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ledger_entries" (
    "id" TEXT NOT NULL,
    "journalId" TEXT,
    "hotelId" TEXT,
    "bookingId" TEXT,
    "settlementId" TEXT,
    "accountCode" TEXT NOT NULL,
    "debit" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "credit" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "description" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "isReversal" BOOLEAN NOT NULL DEFAULT false,
    "reversesId" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ledger_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settlement_documents" (
    "id" TEXT NOT NULL,
    "settlementId" TEXT NOT NULL,
    "type" "SettlementDocumentType" NOT NULL,
    "fileName" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL DEFAULT 'text/html',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "settlement_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settlement_audit_logs" (
    "id" TEXT NOT NULL,
    "settlementId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "actorId" TEXT,
    "actorEmail" TEXT,
    "ipAddress" TEXT,
    "oldStatus" "SettlementStatus",
    "newStatus" "SettlementStatus",
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "settlement_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_billing_config" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "settlementNotifyEmails" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "billingFromEmail" TEXT NOT NULL DEFAULT 'noreply@estays.com',
    "billingReplyToEmail" TEXT,
    "companyLegalName" TEXT NOT NULL DEFAULT 'E Stays Hotels LLC',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_billing_config_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "commission_rules_hotelId_isActive_idx" ON "commission_rules"("hotelId", "isActive");

-- CreateIndex
CREATE INDEX "partner_bank_accounts_hotelId_idx" ON "partner_bank_accounts"("hotelId");

-- CreateIndex
CREATE UNIQUE INDEX "booking_financials_bookingId_key" ON "booking_financials"("bookingId");

-- CreateIndex
CREATE UNIQUE INDEX "booking_financials_paymentId_key" ON "booking_financials"("paymentId");

-- CreateIndex
CREATE INDEX "booking_financials_hotelId_settlementStatus_idx" ON "booking_financials"("hotelId", "settlementStatus");

-- CreateIndex
CREATE INDEX "booking_financials_bookingNumber_idx" ON "booking_financials"("bookingNumber");

-- CreateIndex
CREATE INDEX "booking_financials_settlementId_idx" ON "booking_financials"("settlementId");

-- CreateIndex
CREATE UNIQUE INDEX "settlements_statementNumber_key" ON "settlements"("statementNumber");

-- CreateIndex
CREATE INDEX "settlements_hotelId_settlementDate_idx" ON "settlements"("hotelId", "settlementDate");

-- CreateIndex
CREATE INDEX "settlements_status_idx" ON "settlements"("status");

-- CreateIndex
CREATE INDEX "settlements_statementNumber_idx" ON "settlements"("statementNumber");

-- CreateIndex
CREATE INDEX "settlement_items_settlementId_idx" ON "settlement_items"("settlementId");

-- CreateIndex
CREATE INDEX "settlement_items_hotelId_idx" ON "settlement_items"("hotelId");

-- CreateIndex
CREATE INDEX "settlement_adjustments_hotelId_idx" ON "settlement_adjustments"("hotelId");

-- CreateIndex
CREATE UNIQUE INDEX "journal_entries_reference_key" ON "journal_entries"("reference");

-- CreateIndex
CREATE INDEX "journal_entries_hotelId_idx" ON "journal_entries"("hotelId");

-- CreateIndex
CREATE INDEX "ledger_entries_hotelId_idx" ON "ledger_entries"("hotelId");

-- CreateIndex
CREATE INDEX "ledger_entries_settlementId_idx" ON "ledger_entries"("settlementId");

-- CreateIndex
CREATE INDEX "ledger_entries_reference_idx" ON "ledger_entries"("reference");

-- CreateIndex
CREATE INDEX "settlement_documents_settlementId_idx" ON "settlement_documents"("settlementId");

-- CreateIndex
CREATE INDEX "settlement_audit_logs_settlementId_idx" ON "settlement_audit_logs"("settlementId");

-- AddForeignKey
ALTER TABLE "commission_rules" ADD CONSTRAINT "commission_rules_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "hotels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partner_finance_settings" ADD CONSTRAINT "partner_finance_settings_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "hotels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partner_bank_accounts" ADD CONSTRAINT "partner_bank_accounts_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "hotels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_financials" ADD CONSTRAINT "booking_financials_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_financials" ADD CONSTRAINT "booking_financials_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "hotels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_financials" ADD CONSTRAINT "booking_financials_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_financials" ADD CONSTRAINT "booking_financials_settlementId_fkey" FOREIGN KEY ("settlementId") REFERENCES "settlements"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "settlements" ADD CONSTRAINT "settlements_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "hotels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "settlement_items" ADD CONSTRAINT "settlement_items_settlementId_fkey" FOREIGN KEY ("settlementId") REFERENCES "settlements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "settlement_items" ADD CONSTRAINT "settlement_items_bookingFinancialId_fkey" FOREIGN KEY ("bookingFinancialId") REFERENCES "booking_financials"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "settlement_adjustments" ADD CONSTRAINT "settlement_adjustments_settlementId_fkey" FOREIGN KEY ("settlementId") REFERENCES "settlements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_settlementId_fkey" FOREIGN KEY ("settlementId") REFERENCES "settlements"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_journalId_fkey" FOREIGN KEY ("journalId") REFERENCES "journal_entries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "hotels"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "settlement_documents" ADD CONSTRAINT "settlement_documents_settlementId_fkey" FOREIGN KEY ("settlementId") REFERENCES "settlements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "settlement_audit_logs" ADD CONSTRAINT "settlement_audit_logs_settlementId_fkey" FOREIGN KEY ("settlementId") REFERENCES "settlements"("id") ON DELETE CASCADE ON UPDATE CASCADE;
