-- Enterprise Service Desk (Ticket Module extension).
-- All support_tickets columns are additive/nullable — existing tickets
-- (ticket_type_id: null) continue working exactly as before, no data migration
-- needed. ticket_categories/ticket_types are new, pure-configuration tables.

CREATE TABLE "ticket_categories" (
    "id"         TEXT NOT NULL,
    "key"        TEXT NOT NULL,
    "label"      TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active"  BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ticket_categories_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ticket_categories_key_key" ON "ticket_categories"("key");

CREATE TABLE "ticket_types" (
    "id"                  TEXT NOT NULL,
    "key"                 TEXT NOT NULL,
    "label"               TEXT NOT NULL,
    "description"         TEXT,
    "category_id"         TEXT NOT NULL,
    "department_id"       TEXT,
    "default_assignee_id" TEXT,
    "default_team_id"     TEXT,
    "project_association" TEXT NOT NULL DEFAULT 'NONE',
    "field_schema"        JSONB NOT NULL,
    "workflow"            JSONB NOT NULL,
    "response_sla_mins"   INTEGER,
    "resolution_sla_mins" INTEGER,
    "integration_hooks"   JSONB,
    "is_active"           BOOLEAN NOT NULL DEFAULT true,
    "sort_order"          INTEGER NOT NULL DEFAULT 0,
    "created_at"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"          TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ticket_types_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ticket_types_key_key" ON "ticket_types"("key");
CREATE INDEX "ticket_types_category_id_idx" ON "ticket_types"("category_id");

ALTER TABLE "ticket_types" ADD CONSTRAINT "ticket_types_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "ticket_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ticket_types" ADD CONSTRAINT "ticket_types_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ticket_types" ADD CONSTRAINT "ticket_types_default_assignee_id_fkey" FOREIGN KEY ("default_assignee_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ticket_types" ADD CONSTRAINT "ticket_types_default_team_id_fkey" FOREIGN KEY ("default_team_id") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "support_tickets"
  ADD COLUMN "ticket_type_id" TEXT,
  ADD COLUMN "assignee_id" TEXT,
  ADD COLUMN "team_id" TEXT,
  ADD COLUMN "severity" TEXT,
  ADD COLUMN "project_id" TEXT,
  ADD COLUMN "custom_fields" JSONB,
  ADD COLUMN "response_due_at" TIMESTAMP(3),
  ADD COLUMN "resolution_due_at" TIMESTAMP(3),
  ADD COLUMN "approval_status" TEXT,
  ADD COLUMN "approved_by" TEXT,
  ADD COLUMN "approved_at" TIMESTAMP(3),
  ADD COLUMN "asset_id" TEXT,
  ADD COLUMN "closed_at" TIMESTAMP(3);

CREATE INDEX "support_tickets_ticket_type_id_idx" ON "support_tickets"("ticket_type_id");
CREATE INDEX "support_tickets_assignee_id_idx" ON "support_tickets"("assignee_id");
CREATE INDEX "support_tickets_project_id_idx" ON "support_tickets"("project_id");
CREATE INDEX "support_tickets_severity_idx" ON "support_tickets"("severity");

ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_ticket_type_id_fkey" FOREIGN KEY ("ticket_type_id") REFERENCES "ticket_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_assignee_id_fkey" FOREIGN KEY ("assignee_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;
