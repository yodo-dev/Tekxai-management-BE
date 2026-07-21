-- Employee Lifecycle Workflow. Additive-only, per
-- EMPLOYEE_LIFECYCLE_WORKFLOW_ARCHITECTURE.md — two new tables, no existing
-- column altered or dropped.

-- Employee-level external access tracking (GitHub, Slack, AWS, ...).
-- Distinct from project-scoped devops_access_tracking/project_dependencies.
CREATE TABLE "employee_access_items" (
  "id"           TEXT NOT NULL,
  "user_id"      TEXT NOT NULL,
  "platform"     TEXT NOT NULL,
  "identifier"   TEXT,
  "status"       TEXT NOT NULL DEFAULT 'ACTIVE',
  "granted_date" TIMESTAMP(3),
  "revoked_date" TIMESTAMP(3),
  "assigned_by"  TEXT,
  "remarks"      TEXT,
  "created_at"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"   TIMESTAMP(3) NOT NULL,

  CONSTRAINT "employee_access_items_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "employee_access_items_user_id_idx" ON "employee_access_items"("user_id");
CREATE INDEX "employee_access_items_status_idx" ON "employee_access_items"("status");

ALTER TABLE "employee_access_items" ADD CONSTRAINT "employee_access_items_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "employee_access_items" ADD CONSTRAINT "employee_access_items_assigned_by_fkey"
  FOREIGN KEY ("assigned_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Lightweight, lifecycle-scoped approval mechanism (no generic Approval
-- Engine exists in this codebase to route through — see model comment).
CREATE TABLE "lifecycle_approval_requests" (
  "id"            TEXT NOT NULL,
  "user_id"       TEXT NOT NULL,
  "transition"    TEXT NOT NULL,
  "from_stage"    TEXT NOT NULL,
  "to_stage"      TEXT NOT NULL,
  "status"        TEXT NOT NULL DEFAULT 'PENDING',
  "requested_by"  TEXT NOT NULL,
  "decided_by"    TEXT,
  "decided_at"    TIMESTAMP(3),
  "reason"        TEXT,
  "decision_note" TEXT,
  "metadata"      JSONB,
  "created_at"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"    TIMESTAMP(3) NOT NULL,

  CONSTRAINT "lifecycle_approval_requests_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "lifecycle_approval_requests_user_id_idx" ON "lifecycle_approval_requests"("user_id");
CREATE INDEX "lifecycle_approval_requests_status_idx" ON "lifecycle_approval_requests"("status");

ALTER TABLE "lifecycle_approval_requests" ADD CONSTRAINT "lifecycle_approval_requests_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "lifecycle_approval_requests" ADD CONSTRAINT "lifecycle_approval_requests_requested_by_fkey"
  FOREIGN KEY ("requested_by") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "lifecycle_approval_requests" ADD CONSTRAINT "lifecycle_approval_requests_decided_by_fkey"
  FOREIGN KEY ("decided_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
