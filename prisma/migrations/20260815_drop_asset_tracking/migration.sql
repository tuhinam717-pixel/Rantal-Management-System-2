-- Asset tracking removed. Pings cascade from their tracker, but the table is
-- dropped explicitly first so the order does not depend on that.
DROP TABLE IF EXISTS "tracker_pings";
DROP TABLE IF EXISTS "asset_trackers";
DROP TYPE IF EXISTS "TrackerStatus";
