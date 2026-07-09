-- Sprint 1 Phase 3 Milestone 3 — Asset Request Approval Workflow.
-- Additive only. Introduces "asset_requests" so asset assignment goes
-- through a single-approver request/approval step instead of being
-- performed directly via /assets/:id/assign. The "asset_disposals" table
-- already existed in the schema with no controller/route wired to it —
-- this migration does not touch that table, it only adds asset_requests.
CREATE TABLE IF NOT EXISTS "asset_requests" (
    "id"                    TEXT NOT NULL,
    "user_id"               TEXT NOT NULL,
    "requested_for_user_id" TEXT,
    "asset_category_id"     TEXT NOT NULL,
    "reason"                TEXT,
    "status"                TEXT NOT NULL DEFAULT 'PENDING',
    "reviewed_by"           TEXT,
    "reviewed_at"           TIMESTAMP(3),
    "rejection_reason"      TEXT,
    "created_at"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"            TIMESTAMP(3) NOT NULL,

    CONSTRAINT "asset_requests_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "asset_requests_status_idx" ON "asset_requests"("status");
CREATE INDEX IF NOT EXISTS "asset_requests_user_id_idx" ON "asset_requests"("user_id");
CREATE INDEX IF NOT EXISTS "asset_requests_asset_category_id_idx" ON "asset_requests"("asset_category_id");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'asset_requests_user_id_fkey'
    ) THEN
        ALTER TABLE "asset_requests"
            ADD CONSTRAINT "asset_requests_user_id_fkey"
            FOREIGN KEY ("user_id") REFERENCES "users"("id")
            ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'asset_requests_requested_for_user_id_fkey'
    ) THEN
        ALTER TABLE "asset_requests"
            ADD CONSTRAINT "asset_requests_requested_for_user_id_fkey"
            FOREIGN KEY ("requested_for_user_id") REFERENCES "users"("id")
            ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'asset_requests_reviewed_by_fkey'
    ) THEN
        ALTER TABLE "asset_requests"
            ADD CONSTRAINT "asset_requests_reviewed_by_fkey"
            FOREIGN KEY ("reviewed_by") REFERENCES "users"("id")
            ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'asset_requests_asset_category_id_fkey'
    ) THEN
        ALTER TABLE "asset_requests"
            ADD CONSTRAINT "asset_requests_asset_category_id_fkey"
            FOREIGN KEY ("asset_category_id") REFERENCES "asset_categories"("id")
            ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;
