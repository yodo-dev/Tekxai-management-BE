-- Sprint 2 Milestone 5: Project Master Consolidation.
-- Additive-only, per PROJECT_MASTER_AUDIT.md's migration strategy — no
-- existing column altered or dropped, project_type untouched (Risk #2).

-- projects: Basic section fields (Project Code, Priority, Business Unit).
ALTER TABLE "projects" ADD COLUMN "project_code" TEXT;
ALTER TABLE "projects" ADD COLUMN "priority" TEXT NOT NULL DEFAULT 'MEDIUM';
ALTER TABLE "projects" ADD COLUMN "business_unit_id" TEXT;

CREATE UNIQUE INDEX "projects_project_code_key" ON "projects"("project_code");
CREATE INDEX "projects_business_unit_id_idx" ON "projects"("business_unit_id");

ALTER TABLE "projects" ADD CONSTRAINT "projects_business_unit_id_fkey"
  FOREIGN KEY ("business_unit_id") REFERENCES "business_units"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- devops_access_tracking: Client Communication multi-select superset.
-- point_of_communication (legacy single-select) is left untouched.
ALTER TABLE "devops_access_tracking" ADD COLUMN "communication_channels" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "devops_access_tracking" ADD COLUMN "communication_link" TEXT;
ALTER TABLE "devops_access_tracking" ADD COLUMN "client_timezone" TEXT;
ALTER TABLE "devops_access_tracking" ADD COLUMN "meeting_frequency" TEXT;
