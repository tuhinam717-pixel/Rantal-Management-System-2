-- Dashboard widget preference (JSON array of widget keys, null = defaults)
ALTER TABLE "users" ADD COLUMN "dashboardWidgets" TEXT;

-- CreateEnum
CREATE TYPE "TrackerStatus" AS ENUM ('IDLE', 'OUT_ON_RENT', 'IN_TRANSIT', 'MISSING');

-- CreateTable
CREATE TABLE "asset_trackers" (
    "id" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "label" TEXT,
    "productId" TEXT NOT NULL,
    "orderId" TEXT,
    "status" "TrackerStatus" NOT NULL DEFAULT 'IDLE',
    "batteryPct" INTEGER,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "lastSeenAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "asset_trackers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tracker_pings" (
    "id" TEXT NOT NULL,
    "trackerId" TEXT NOT NULL,
    "batteryPct" INTEGER,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tracker_pings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "asset_trackers_deviceId_key" ON "asset_trackers"("deviceId");
CREATE INDEX "asset_trackers_productId_idx" ON "asset_trackers"("productId");
CREATE INDEX "asset_trackers_status_idx" ON "asset_trackers"("status");
CREATE INDEX "tracker_pings_trackerId_recordedAt_idx" ON "tracker_pings"("trackerId", "recordedAt");

-- AddForeignKey
ALTER TABLE "asset_trackers" ADD CONSTRAINT "asset_trackers_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "asset_trackers" ADD CONSTRAINT "asset_trackers_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "rental_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "tracker_pings" ADD CONSTRAINT "tracker_pings_trackerId_fkey" FOREIGN KEY ("trackerId") REFERENCES "asset_trackers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
