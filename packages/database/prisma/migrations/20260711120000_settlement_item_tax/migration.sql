-- Per-line GST/VAT on settlement items (informational; excluded from net settlement payout)
ALTER TABLE "settlement_items" ADD COLUMN "taxAmount" DECIMAL(12,2) NOT NULL DEFAULT 0;
