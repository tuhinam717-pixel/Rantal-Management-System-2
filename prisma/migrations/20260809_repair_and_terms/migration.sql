-- CreateEnum
CREATE TYPE "RepairStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'WRITTEN_OFF');

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "underRepairStock" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "quotation_templates" ADD COLUMN     "paymentTermsPercent" INTEGER NOT NULL DEFAULT 100,
ADD COLUMN     "validityDays" INTEGER;

-- CreateTable
CREATE TABLE "repair_jobs" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "inspectionId" TEXT,
    "orderNumber" TEXT,
    "status" "RepairStatus" NOT NULL DEFAULT 'PENDING',
    "issue" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "estimatedCost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "actualCost" DECIMAL(12,2),
    "assignedTo" TEXT,
    "notes" TEXT,
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "repair_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "repair_jobs_inspectionId_key" ON "repair_jobs"("inspectionId");

-- CreateIndex
CREATE INDEX "repair_jobs_productId_idx" ON "repair_jobs"("productId");

-- CreateIndex
CREATE INDEX "repair_jobs_status_idx" ON "repair_jobs"("status");

-- AddForeignKey
ALTER TABLE "repair_jobs" ADD CONSTRAINT "repair_jobs_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "repair_jobs" ADD CONSTRAINT "repair_jobs_inspectionId_fkey" FOREIGN KEY ("inspectionId") REFERENCES "return_inspections"("id") ON DELETE SET NULL ON UPDATE CASCADE;

