-- Enterprise Performance Platform Milestone 3: Business Unit Rule Engine
-- foundation. Additive-only: one new table. Promotes `users.business_unit`
-- from a plain reporting filter into a rule container — see
-- Tekxai-Operations-OS/08-Master-Gap-Analysis.md §11.4.

CREATE TABLE "business_unit_rules" (
  "id"                        TEXT NOT NULL,
  "business_unit"             TEXT NOT NULL,
  "default_allocation_method" TEXT NOT NULL DEFAULT 'TIME_SHARE',
  "revenue_source_type"       TEXT NOT NULL DEFAULT 'INVOICE',
  "performance_weights"       JSONB,
  "is_active"                 BOOLEAN NOT NULL DEFAULT true,
  "created_at"                TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"                TIMESTAMP(3) NOT NULL,

  CONSTRAINT "business_unit_rules_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "business_unit_rules_business_unit_key" ON "business_unit_rules"("business_unit");

-- Seed only the business unit(s) confirmed real in this database today
-- (verified via `SELECT DISTINCT business_unit FROM users` — only 'ERP' exists).
-- Additional units (e.g. a future Estimation/Marketing/Construction vertical)
-- are added as real rows via the CRUD API when they actually exist, not
-- invented here.
INSERT INTO "business_unit_rules" ("id", "business_unit", "default_allocation_method", "revenue_source_type", "updated_at") VALUES
  ('bur_erp', 'ERP', 'TIME_SHARE', 'INVOICE', CURRENT_TIMESTAMP);
