-- Enterprise Safety & Compliance Management — schema foundation (Milestone 1).
-- All additions are additive/nullable except asset_tag, which becomes
-- optional (relaxing a NOT NULL requirement is backward compatible: every
-- existing row already has a value, nothing is invalidated).

-- asset_categories: category-level defaults, inherited by assets unless overridden.
ALTER TABLE "asset_categories"
  ADD COLUMN "tracking_type" TEXT NOT NULL DEFAULT 'SERIALIZED',
  ADD COLUMN "default_criticality" TEXT NOT NULL DEFAULT 'MEDIUM',
  ADD COLUMN "default_inspection_frequency_days" INTEGER;

-- asset_locations: business_unit, matching the existing users.business_unit
-- free-string convention.
ALTER TABLE "asset_locations" ADD COLUMN "business_unit" TEXT;

-- assets: asset_tag becomes optional (QUANTITY-tracked assets don't need one),
-- plus the compliance fields.
ALTER TABLE "assets" ALTER COLUMN "asset_tag" DROP NOT NULL;
ALTER TABLE "assets"
  ADD COLUMN "expiry_date" TIMESTAMP(3),
  ADD COLUMN "compliance_status" TEXT,
  ADD COLUMN "criticality" TEXT NOT NULL DEFAULT 'MEDIUM',
  ADD COLUMN "inspection_frequency_days" INTEGER,
  ADD COLUMN "last_inspection_at" TIMESTAMP(3),
  ADD COLUMN "next_inspection_at" TIMESTAMP(3),
  ADD COLUMN "responsible_user_id" TEXT,
  ADD COLUMN "required_quantity" INTEGER,
  ADD COLUMN "current_quantity" INTEGER,
  ADD COLUMN "minimum_quantity" INTEGER,
  ADD COLUMN "reorder_quantity" INTEGER;

CREATE INDEX "assets_compliance_status_idx" ON "assets"("compliance_status");
CREATE INDEX "assets_next_inspection_at_idx" ON "assets"("next_inspection_at");

ALTER TABLE "assets" ADD CONSTRAINT "assets_responsible_user_id_fkey" FOREIGN KEY ("responsible_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- asset_maintenance_logs: vendor/invoice fields (photos reuse file_uploads, no columns needed).
ALTER TABLE "asset_maintenance_logs"
  ADD COLUMN "vendor_name" TEXT,
  ADD COLUMN "invoice_reference" TEXT;

-- Compliance Requirements — "what a location should have."
CREATE TABLE "compliance_requirements" (
    "id"                       TEXT NOT NULL,
    "location_id"              TEXT NOT NULL,
    "category_id"              TEXT NOT NULL,
    "required_quantity"        INTEGER NOT NULL,
    "status"                   TEXT NOT NULL DEFAULT 'ACTIVE',
    "applied_template_id"      TEXT,
    "applied_template_version" INTEGER,
    "notes"                    TEXT,
    "created_at"               TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"               TIMESTAMP(3) NOT NULL,

    CONSTRAINT "compliance_requirements_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "compliance_requirements_location_id_category_id_key" ON "compliance_requirements"("location_id", "category_id");
CREATE INDEX "compliance_requirements_location_id_idx" ON "compliance_requirements"("location_id");
CREATE INDEX "compliance_requirements_category_id_idx" ON "compliance_requirements"("category_id");
ALTER TABLE "compliance_requirements" ADD CONSTRAINT "compliance_requirements_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "asset_locations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "compliance_requirements" ADD CONSTRAINT "compliance_requirements_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "asset_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Compliance Requirement Templates — versioned, immutable-on-edit presets.
CREATE TABLE "compliance_requirement_templates" (
    "id"          TEXT NOT NULL,
    "key"         TEXT NOT NULL,
    "version"     INTEGER NOT NULL DEFAULT 1,
    "label"       TEXT NOT NULL,
    "description" TEXT,
    "items"       JSONB NOT NULL,
    "is_active"   BOOLEAN NOT NULL DEFAULT true,
    "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"  TIMESTAMP(3) NOT NULL,

    CONSTRAINT "compliance_requirement_templates_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "compliance_requirement_templates_key_version_key" ON "compliance_requirement_templates"("key", "version");

-- Generic Checklist Engine.
CREATE TABLE "checklist_templates" (
    "id"          TEXT NOT NULL,
    "key"         TEXT NOT NULL,
    "label"       TEXT NOT NULL,
    "entity_type" TEXT NOT NULL DEFAULT 'asset',
    "items"       JSONB NOT NULL,
    "is_active"   BOOLEAN NOT NULL DEFAULT true,
    "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"  TIMESTAMP(3) NOT NULL,

    CONSTRAINT "checklist_templates_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "checklist_templates_key_key" ON "checklist_templates"("key");

CREATE TABLE "checklist_results" (
    "id"          TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id"   TEXT NOT NULL,
    "template_id" TEXT NOT NULL,
    "results"     JSONB NOT NULL,
    "checked_by"  TEXT NOT NULL,
    "checked_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "checklist_results_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "checklist_results_entity_type_entity_id_idx" ON "checklist_results"("entity_type", "entity_id");
CREATE INDEX "checklist_results_template_id_idx" ON "checklist_results"("template_id");
ALTER TABLE "checklist_results" ADD CONSTRAINT "checklist_results_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "checklist_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "checklist_results" ADD CONSTRAINT "checklist_results_checked_by_fkey" FOREIGN KEY ("checked_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Asset Inspections — mirrors the `tasks` assignment shape without reusing
-- the tasks table (tasks require a non-nullable project_id).
CREATE TABLE "asset_inspections" (
    "id"                  TEXT NOT NULL,
    "asset_id"            TEXT NOT NULL,
    "assigned_to"         TEXT NOT NULL,
    "due_date"            TIMESTAMP(3) NOT NULL,
    "completed_by"        TEXT,
    "completed_at"        TIMESTAMP(3),
    "status"              TEXT NOT NULL DEFAULT 'PENDING',
    "checklist_result_id" TEXT,
    "created_at"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"          TIMESTAMP(3) NOT NULL,

    CONSTRAINT "asset_inspections_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "asset_inspections_asset_id_idx" ON "asset_inspections"("asset_id");
CREATE INDEX "asset_inspections_assigned_to_idx" ON "asset_inspections"("assigned_to");
CREATE INDEX "asset_inspections_status_idx" ON "asset_inspections"("status");
CREATE INDEX "asset_inspections_due_date_idx" ON "asset_inspections"("due_date");
ALTER TABLE "asset_inspections" ADD CONSTRAINT "asset_inspections_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "asset_inspections" ADD CONSTRAINT "asset_inspections_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "asset_inspections" ADD CONSTRAINT "asset_inspections_completed_by_fkey" FOREIGN KEY ("completed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "asset_inspections" ADD CONSTRAINT "asset_inspections_checklist_result_id_fkey" FOREIGN KEY ("checklist_result_id") REFERENCES "checklist_results"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Escalation Engine — config-driven ladder + per-alert progress tracker.
CREATE TABLE "escalation_policies" (
    "id"         TEXT NOT NULL,
    "key"        TEXT NOT NULL,
    "label"      TEXT NOT NULL,
    "stages"     JSONB NOT NULL,
    "is_active"  BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "escalation_policies_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "escalation_policies_key_key" ON "escalation_policies"("key");

CREATE TABLE "compliance_escalations" (
    "id"                TEXT NOT NULL,
    "entity_type"       TEXT NOT NULL,
    "entity_id"         TEXT NOT NULL,
    "alert_type"        TEXT NOT NULL,
    "stage_reached"     INTEGER NOT NULL DEFAULT 0,
    "last_escalated_at" TIMESTAMP(3),
    "created_at"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "compliance_escalations_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "compliance_escalations_entity_type_entity_id_alert_type_key" ON "compliance_escalations"("entity_type", "entity_id", "alert_type");
CREATE INDEX "compliance_escalations_entity_type_entity_id_idx" ON "compliance_escalations"("entity_type", "entity_id");
