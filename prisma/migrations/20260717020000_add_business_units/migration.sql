-- Organization Hierarchy Migration — Sprint 1, Phase 1.
-- Adds business_units as the new top-level entity above departments.
-- Additive only: no existing column removed, no existing data touched.

CREATE TABLE "business_units" (
    "id"          TEXT NOT NULL,
    "name"        TEXT NOT NULL,
    "code"        TEXT,
    "description" TEXT,
    "is_active"   BOOLEAN NOT NULL DEFAULT true,
    "sort_order"  INTEGER NOT NULL DEFAULT 0,
    "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"  TIMESTAMP(3) NOT NULL,

    CONSTRAINT "business_units_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "business_units_code_key" ON "business_units"("code");
CREATE INDEX "business_units_is_active_idx" ON "business_units"("is_active");

ALTER TABLE "departments" ADD COLUMN "business_unit_id" TEXT;
CREATE INDEX "departments_business_unit_id_idx" ON "departments"("business_unit_id");

ALTER TABLE "departments" ADD CONSTRAINT "departments_business_unit_id_fkey"
  FOREIGN KEY ("business_unit_id") REFERENCES "business_units"("id") ON DELETE SET NULL ON UPDATE CASCADE;
