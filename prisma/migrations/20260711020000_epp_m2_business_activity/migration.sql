-- Enterprise Performance Platform Milestone 2: Business Activity taxonomy,
-- supersedes the earlier billable/non-billable flag. Additive-only: one new
-- lookup table, two new nullable/defaulted columns on task_time_logs.
-- See Tekxai-Operations-OS/08-Master-Gap-Analysis.md §11.2.

CREATE TABLE "business_activities" (
  "id"               TEXT NOT NULL,
  "name"             TEXT NOT NULL,
  "default_billable" BOOLEAN NOT NULL DEFAULT true,
  "feeds_layer"      TEXT NOT NULL DEFAULT 'REVENUE',
  "is_active"        BOOLEAN NOT NULL DEFAULT true,
  "sort_order"       INTEGER NOT NULL DEFAULT 0,
  "created_at"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"       TIMESTAMP(3) NOT NULL,

  CONSTRAINT "business_activities_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "business_activities_name_key" ON "business_activities"("name");
CREATE INDEX "business_activities_feeds_layer_idx" ON "business_activities"("feeds_layer");

ALTER TABLE "task_time_logs" ADD COLUMN "business_activity_id" TEXT;
ALTER TABLE "task_time_logs" ADD COLUMN "allocation_method" TEXT NOT NULL DEFAULT 'TIME_SHARE';
CREATE INDEX "task_time_logs_business_activity_id_idx" ON "task_time_logs"("business_activity_id");

ALTER TABLE "task_time_logs"
  ADD CONSTRAINT "task_time_logs_business_activity_id_fkey"
  FOREIGN KEY ("business_activity_id") REFERENCES "business_activities"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- Seed the initial generic taxonomy from the architecture review (§11.2).
-- default_billable / feeds_layer are sensible defaults, editable later via the
-- business-activities CRUD module — not hardcoded logic anywhere downstream.
INSERT INTO "business_activities" ("id", "name", "default_billable", "feeds_layer", "sort_order", "updated_at") VALUES
  ('ba_delivery',            'Delivery',             true,  'REVENUE',    10, CURRENT_TIMESTAMP),
  ('ba_estimation',          'Estimation',           false, 'VALUE',      20, CURRENT_TIMESTAMP),
  ('ba_takeoff',             'Takeoff',              false, 'VALUE',      30, CURRENT_TIMESTAMP),
  ('ba_support',             'Support',              true,  'REVENUE',    40, CURRENT_TIMESTAMP),
  ('ba_documentation',       'Documentation',        false, 'VALUE',      50, CURRENT_TIMESTAMP),
  ('ba_research',            'Research',             false, 'VALUE',      60, CURRENT_TIMESTAMP),
  ('ba_training',            'Training',             false, 'COST_ONLY',  70, CURRENT_TIMESTAMP),
  ('ba_client_meeting',      'Client Meeting',       false, 'VALUE',      80, CURRENT_TIMESTAMP),
  ('ba_internal_improvement','Internal Improvement', false, 'VALUE',      90, CURRENT_TIMESTAMP),
  ('ba_administration',      'Administration',       false, 'COST_ONLY', 100, CURRENT_TIMESTAMP),
  ('ba_finance',             'Finance',              false, 'COST_ONLY', 110, CURRENT_TIMESTAMP),
  ('ba_hr',                  'HR',                   false, 'COST_ONLY', 120, CURRENT_TIMESTAMP),
  ('ba_recruitment',         'Recruitment',          false, 'COST_ONLY', 130, CURRENT_TIMESTAMP),
  ('ba_sales_support',       'Sales Support',        false, 'VALUE',     140, CURRENT_TIMESTAMP);
