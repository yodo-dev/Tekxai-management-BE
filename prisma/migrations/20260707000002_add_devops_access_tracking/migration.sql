CREATE TABLE IF NOT EXISTS "devops_access_tracking" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "point_of_communication" TEXT NOT NULL DEFAULT 'EMAIL',
    "progress_shared_to_client" BOOLEAN NOT NULL DEFAULT false,
    "progress_shared_date" TIMESTAMP(3),
    "git_access_status" TEXT NOT NULL DEFAULT 'NOT_APPLICABLE',
    "server_access_status" TEXT NOT NULL DEFAULT 'NOT_APPLICABLE',
    "domain_access_status" TEXT NOT NULL DEFAULT 'NOT_APPLICABLE',
    "email_smtp_access_status" TEXT NOT NULL DEFAULT 'NOT_APPLICABLE',
    "devops_remarks" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "devops_access_tracking_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "devops_access_tracking_project_id_key" ON "devops_access_tracking"("project_id");

CREATE INDEX IF NOT EXISTS "devops_access_tracking_project_id_idx" ON "devops_access_tracking"("project_id");

ALTER TABLE "devops_access_tracking" ADD CONSTRAINT "devops_access_tracking_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
