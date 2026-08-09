-- Vendor prices a repair, the business approves or rejects it.
ALTER TABLE "repair_jobs" ADD COLUMN "quoteSubmittedAt" TIMESTAMP(3);
ALTER TABLE "repair_jobs" ADD COLUMN "quoteApproved" BOOLEAN;
