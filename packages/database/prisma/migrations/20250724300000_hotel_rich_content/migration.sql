-- Structured Agoda-style property guide (about, facilities, policies, etc.)
ALTER TABLE "hotels" ADD COLUMN IF NOT EXISTS "richContent" JSONB;
