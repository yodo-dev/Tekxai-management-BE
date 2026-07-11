-- Enterprise Performance Platform Milestone 1: link invoice revenue to projects.
-- Additive-only: one nullable FK column, one defaulted string column, both safe
-- for existing rows. See Tekxai-Operations-OS/08-Master-Gap-Analysis.md §11.5.

ALTER TABLE "projects" ADD COLUMN "project_type" TEXT NOT NULL DEFAULT 'CLIENT';

ALTER TABLE "crm_invoices" ADD COLUMN "project_id" TEXT;

CREATE INDEX "crm_invoices_project_id_idx" ON "crm_invoices"("project_id");

ALTER TABLE "crm_invoices"
  ADD CONSTRAINT "crm_invoices_project_id_fkey"
  FOREIGN KEY ("project_id") REFERENCES "projects"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
