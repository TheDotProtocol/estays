-- CreateEnum
CREATE TYPE "SettlementPeriod" AS ENUM ('DAILY', 'WEEKLY');

-- AlterTable
ALTER TABLE "partner_finance_settings" ADD COLUMN     "taxCountry" TEXT,
ADD COLUMN     "taxLabel" TEXT,
ADD COLUMN     "taxType" TEXT;

-- AlterTable
ALTER TABLE "settlements" ADD COLUMN     "periodType" "SettlementPeriod" NOT NULL DEFAULT 'DAILY';
