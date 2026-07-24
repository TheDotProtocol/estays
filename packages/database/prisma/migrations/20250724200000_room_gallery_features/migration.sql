-- AlterTable
ALTER TABLE "room_types" ADD COLUMN "galleryUrls" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "room_types" ADD COLUMN "features" TEXT[] DEFAULT ARRAY[]::TEXT[];
