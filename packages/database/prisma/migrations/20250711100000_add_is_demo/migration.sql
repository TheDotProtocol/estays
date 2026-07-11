-- Add isDemo flag to hotels (M3)
ALTER TABLE "hotels" ADD COLUMN IF NOT EXISTS "isDemo" BOOLEAN NOT NULL DEFAULT false;

-- Mark seeded demo hotels
UPDATE "hotels" SET "isDemo" = true
WHERE slug IN ('grand-plaza-hotel', 'sea-view-resort', 'mountain-lodge-retreat');
