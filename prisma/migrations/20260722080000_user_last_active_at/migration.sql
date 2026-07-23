-- Chat module audit: no online/last-seen presence signal existed anywhere.
-- No WebSocket infra exists in this app, so this is a lightweight heartbeat
-- (authenticate middleware bumps it, throttled) rather than true push presence.
ALTER TABLE "users" ADD COLUMN "last_active_at" TIMESTAMP(3);
