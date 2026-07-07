-- Projects: automatic vs manual progress calculation mode
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "progress_mode" TEXT NOT NULL DEFAULT 'MANUAL';

-- Milestones: blocked flag (for pending-milestone breakdown)
ALTER TABLE "milestones" ADD COLUMN IF NOT EXISTS "blocked" BOOLEAN NOT NULL DEFAULT false;

-- DevOps access tracking: AWS access + richer "progress shared" status
ALTER TABLE "devops_access_tracking" ADD COLUMN IF NOT EXISTS "progress_shared_status" TEXT NOT NULL DEFAULT 'NOT_SHARED';
ALTER TABLE "devops_access_tracking" ADD COLUMN IF NOT EXISTS "aws_access_status" TEXT NOT NULL DEFAULT 'NOT_APPLICABLE';

-- Project tracking links (ClickUp, Google Sheet, Notion, Jira, GitHub Project, Linear, etc.)
CREATE TABLE IF NOT EXISTS "project_tracking_links" (
    "id"         TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "link_type"  TEXT NOT NULL,
    "label"      TEXT,
    "url"        TEXT NOT NULL,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_tracking_links_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "project_tracking_links_project_id_idx" ON "project_tracking_links"("project_id");
ALTER TABLE "project_tracking_links" ADD CONSTRAINT "project_tracking_links_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Weekly client updates (history of client communication)
CREATE TABLE IF NOT EXISTS "client_weekly_updates" (
    "id"              TEXT NOT NULL,
    "project_id"      TEXT NOT NULL,
    "update_date"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by"      TEXT,
    "method"          TEXT NOT NULL DEFAULT 'EMAIL',
    "summary"         TEXT NOT NULL,
    "client_response" TEXT,
    "created_at"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "client_weekly_updates_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "client_weekly_updates_project_id_idx" ON "client_weekly_updates"("project_id");
ALTER TABLE "client_weekly_updates" ADD CONSTRAINT "client_weekly_updates_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "client_weekly_updates" ADD CONSTRAINT "client_weekly_updates_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Project documents (contracts, scope, proposal, SOW, wireframes, architecture, meeting notes)
CREATE TABLE IF NOT EXISTS "project_documents" (
    "id"            TEXT NOT NULL,
    "project_id"    TEXT NOT NULL,
    "document_type" TEXT NOT NULL DEFAULT 'OTHER',
    "title"         TEXT NOT NULL,
    "file_key"      TEXT,
    "file_url"      TEXT,
    "notes"         TEXT,
    "uploaded_by"   TEXT,
    "created_at"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_documents_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "project_documents_project_id_idx" ON "project_documents"("project_id");
ALTER TABLE "project_documents" ADD CONSTRAINT "project_documents_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "project_documents" ADD CONSTRAINT "project_documents_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
