-- Make session_id optional on screenshots so screenshots can be recorded
-- even if the monitoring session failed to start (e.g. first-time DB setup)
ALTER TABLE "screenshots" ALTER COLUMN "session_id" DROP NOT NULL;
