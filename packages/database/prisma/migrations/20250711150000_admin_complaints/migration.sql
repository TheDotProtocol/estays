-- CreateEnum
CREATE TYPE "ComplaintStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "ComplaintCategory" AS ENUM ('CLEANLINESS', 'SERVICE', 'BILLING', 'AMENITIES', 'SAFETY', 'OTHER');

-- CreateTable
CREATE TABLE "hotel_complaints" (
    "id" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "guestName" TEXT NOT NULL,
    "guestEmail" TEXT,
    "category" "ComplaintCategory" NOT NULL DEFAULT 'OTHER',
    "subject" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "ComplaintStatus" NOT NULL DEFAULT 'OPEN',
    "resolution" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hotel_complaints_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "hotel_complaints_hotelId_status_idx" ON "hotel_complaints"("hotelId", "status");

-- AddForeignKey
ALTER TABLE "hotel_complaints" ADD CONSTRAINT "hotel_complaints_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "hotels"("id") ON DELETE CASCADE ON UPDATE CASCADE;
