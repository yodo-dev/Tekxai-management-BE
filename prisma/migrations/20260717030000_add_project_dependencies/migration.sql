-- Project Dependencies module (Project Workspace Phase 2, Milestone 2)
CREATE TABLE "project_dependencies" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "category" TEXT,
    "owner" TEXT,
    "status" TEXT NOT NULL DEFAULT 'NOT_STARTED',
    "vendor" TEXT,
    "external_url" TEXT,
    "notes" TEXT,
    "blocking" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_dependencies_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "project_dependencies_project_id_idx" ON "project_dependencies"("project_id");

ALTER TABLE "project_dependencies" ADD CONSTRAINT "project_dependencies_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
