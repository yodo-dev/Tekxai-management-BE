-- Deadline extension requests: PM requests -> Admin/Owner approves or rejects
CREATE TABLE IF NOT EXISTS "extension_requests" (
    "id"                TEXT NOT NULL,
    "project_id"        TEXT NOT NULL,
    "requested_by"      TEXT NOT NULL,
    "current_deadline"  TIMESTAMP(3),
    "proposed_deadline" TIMESTAMP(3) NOT NULL,
    "reason"            TEXT NOT NULL,
    "status"            TEXT NOT NULL DEFAULT 'PENDING',
    "reviewed_by"       TEXT,
    "review_reason"     TEXT,
    "reviewed_at"       TIMESTAMP(3),
    "created_at"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"        TIMESTAMP(3) NOT NULL,

    CONSTRAINT "extension_requests_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "extension_requests_project_id_idx" ON "extension_requests"("project_id");
CREATE INDEX IF NOT EXISTS "extension_requests_status_idx" ON "extension_requests"("status");
ALTER TABLE "extension_requests" ADD CONSTRAINT "extension_requests_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "extension_requests" ADD CONSTRAINT "extension_requests_requested_by_fkey" FOREIGN KEY ("requested_by") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "extension_requests" ADD CONSTRAINT "extension_requests_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
