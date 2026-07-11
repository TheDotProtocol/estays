-- CreateEnum
CREATE TYPE "LoyaltyTier" AS ENUM ('SILVER', 'GOLD', 'VIP', 'PLATINUM');

-- AlterTable
ALTER TABLE "users" ADD COLUMN "loyaltyPoints" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "users" ADD COLUMN "loyaltyTier" "LoyaltyTier" NOT NULL DEFAULT 'SILVER';
ALTER TABLE "users" ADD COLUMN "lifetimeBookings" INTEGER NOT NULL DEFAULT 0;
