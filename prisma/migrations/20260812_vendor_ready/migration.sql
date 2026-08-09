-- Vendor signals "work done, come collect". Closing the job stays with admin,
-- since closing returns units to availability.
ALTER TABLE "repair_jobs" ADD COLUMN "vendorReady" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "repair_jobs" ADD COLUMN "vendorReadyAt" TIMESTAMP(3);
