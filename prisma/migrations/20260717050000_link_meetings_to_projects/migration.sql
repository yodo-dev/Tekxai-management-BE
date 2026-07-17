-- Project Workspace Phase 2, Milestone 4: link meetings to projects (additive, nullable)
ALTER TABLE "meetings" ADD COLUMN "project_id" TEXT;

CREATE INDEX "meetings_project_id_idx" ON "meetings"("project_id");

ALTER TABLE "meetings" ADD CONSTRAINT "meetings_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;
