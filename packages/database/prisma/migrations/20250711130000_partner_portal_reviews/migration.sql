-- AlterTable
ALTER TABLE "hotels" ADD COLUMN "googleMapsUrl" TEXT;
ALTER TABLE "hotels" ADD COLUMN "googlePlaceId" TEXT;
ALTER TABLE "hotels" ADD COLUMN "socialFacebook" TEXT;
ALTER TABLE "hotels" ADD COLUMN "socialInstagram" TEXT;
ALTER TABLE "hotels" ADD COLUMN "socialTwitter" TEXT;
ALTER TABLE "hotels" ADD COLUMN "socialLinkedIn" TEXT;
ALTER TABLE "hotels" ADD COLUMN "socialYoutube" TEXT;

-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('PENDING', 'PUBLISHED', 'HIDDEN');

-- CreateTable
CREATE TABLE "hotel_reviews" (
    "id" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "guestName" TEXT NOT NULL,
    "guestEmail" TEXT,
    "rating" INTEGER NOT NULL,
    "title" TEXT,
    "comment" TEXT NOT NULL,
    "status" "ReviewStatus" NOT NULL DEFAULT 'PUBLISHED',
    "partnerReply" TEXT,
    "repliedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hotel_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "hotel_reviews_hotelId_status_idx" ON "hotel_reviews"("hotelId", "status");

-- AddForeignKey
ALTER TABLE "hotel_reviews" ADD CONSTRAINT "hotel_reviews_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "hotels"("id") ON DELETE CASCADE ON UPDATE CASCADE;
