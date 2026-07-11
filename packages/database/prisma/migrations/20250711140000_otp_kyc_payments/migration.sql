-- CreateEnum
CREATE TYPE "PartnerStatus" AS ENUM ('PENDING_KYC', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED');
CREATE TYPE "OtpPurpose" AS ENUM ('GUEST_REGISTER', 'PARTNER_REGISTER');

-- AlterTable users
ALTER TABLE "users" ADD COLUMN "address" TEXT;
ALTER TABLE "users" ADD COLUMN "city" TEXT;
ALTER TABLE "users" ADD COLUMN "country" TEXT;
ALTER TABLE "users" ADD COLUMN "partnerStatus" "PartnerStatus";
ALTER TABLE "users" ADD COLUMN "companyName" TEXT;
ALTER TABLE "users" ADD COLUMN "companyAddress" TEXT;

CREATE INDEX "users_partnerStatus_idx" ON "users"("partnerStatus");

-- CreateTable email_otps
CREATE TABLE "email_otps" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "purpose" "OtpPurpose" NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "email_otps_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "email_otps_email_purpose_idx" ON "email_otps"("email", "purpose");

-- CreateTable partner_kyc_documents
CREATE TABLE "partner_kyc_documents" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "documentType" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "path" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "partner_kyc_documents_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "partner_kyc_documents_userId_idx" ON "partner_kyc_documents"("userId");
ALTER TABLE "partner_kyc_documents" ADD CONSTRAINT "partner_kyc_documents_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable payments
ALTER TABLE "payments" ADD COLUMN "payerName" TEXT;
ALTER TABLE "payments" ADD COLUMN "payerEmail" TEXT;
ALTER TABLE "payments" ADD COLUMN "payerPhone" TEXT;
ALTER TABLE "payments" ADD COLUMN "refundMethod" "PaymentMethod";
