-- Migration: ERP Complete Schema
-- Adds all tables required for the Tekxai ERP system

-- Extensions (if not exist)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Add new columns to existing users table
ALTER TABLE "users" 
  ADD COLUMN IF NOT EXISTS "phone" TEXT,
  ADD COLUMN IF NOT EXISTS "avatar" TEXT,
  ADD COLUMN IF NOT EXISTS "department_id" TEXT,
  ADD COLUMN IF NOT EXISTS "division_id" TEXT,
  ADD COLUMN IF NOT EXISTS "position" TEXT,
  ADD COLUMN IF NOT EXISTS "designation" TEXT,
  ADD COLUMN IF NOT EXISTS "employee_id" TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN IF NOT EXISTS "hire_date" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMP(3);

-- Add new roles
ALTER TABLE "roles" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
INSERT INTO "roles" ("id", "name", "level", "is_system", "created_at", "updated_at")
VALUES
  (gen_random_uuid()::text, 'HR', 70, true, NOW(), NOW()),
  (gen_random_uuid()::text, 'EMPLOYEE', 40, true, NOW(), NOW()),
  (gen_random_uuid()::text, 'MARKETING', 50, true, NOW(), NOW()),
  (gen_random_uuid()::text, 'DIVISION_MANAGER', 60, true, NOW(), NOW())
ON CONFLICT (name) DO NOTHING;

-- OTP codes
CREATE TABLE IF NOT EXISTS "otp_codes" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "otp_codes_pkey" PRIMARY KEY ("id")
);

-- User settings
CREATE TABLE IF NOT EXISTS "user_settings" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "show_notifications" BOOLEAN NOT NULL DEFAULT true,
    "language" TEXT NOT NULL DEFAULT 'en',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "user_settings_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "user_settings_user_id_key" ON "user_settings"("user_id");

-- Departments
CREATE TABLE IF NOT EXISTS "departments" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "description" TEXT,
    "manager_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),
    CONSTRAINT "departments_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "departments_code_key" ON "departments"("code");

-- Divisions
CREATE TABLE IF NOT EXISTS "divisions" (
    "id" TEXT NOT NULL,
    "department_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "description" TEXT,
    "manager_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),
    CONSTRAINT "divisions_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "divisions_code_key" ON "divisions"("code");

-- Teams
CREATE TABLE IF NOT EXISTS "teams" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL DEFAULT 'GENERAL',
    "department_id" TEXT,
    "division_id" TEXT,
    "manager_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),
    CONSTRAINT "teams_pkey" PRIMARY KEY ("id")
);

-- Team members
CREATE TABLE IF NOT EXISTS "team_members" (
    "id" TEXT NOT NULL,
    "team_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'MEMBER',
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "team_members_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "team_members_team_id_user_id_key" ON "team_members"("team_id", "user_id");

-- Projects
CREATE TABLE IF NOT EXISTS "projects" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "total_hours" INTEGER NOT NULL DEFAULT 0,
    "start_date" TIMESTAMP(3),
    "end_date" TIMESTAMP(3),
    "owner_id" TEXT,
    "leader_id" TEXT,
    "team_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),
    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- Project members
CREATE TABLE IF NOT EXISTS "project_members" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'MEMBER',
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "project_members_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "project_members_project_id_user_id_key" ON "project_members"("project_id", "user_id");

-- Tasks
CREATE TABLE IF NOT EXISTS "tasks" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'TODO',
    "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
    "assigned_to" TEXT,
    "due_date" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),
    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

-- Milestones
CREATE TABLE IF NOT EXISTS "milestones" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "due_date" TIMESTAMP(3),
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "milestones_pkey" PRIMARY KEY ("id")
);

-- Starred items
CREATE TABLE IF NOT EXISTS "starred_items" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "item_type" TEXT NOT NULL,
    "item_id" TEXT NOT NULL,
    "project_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "starred_items_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "starred_items_user_id_item_type_item_id_key" ON "starred_items"("user_id", "item_type", "item_id");

-- Timesheet entries
CREATE TABLE IF NOT EXISTS "timesheet_entries" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "check_in" TIMESTAMP(3) NOT NULL,
    "check_out" TIMESTAMP(3),
    "duration_sec" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'IN_PROGRESS',
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),
    CONSTRAINT "timesheet_entries_pkey" PRIMARY KEY ("id")
);

-- Timesheet edit requests
CREATE TABLE IF NOT EXISTS "timesheet_edit_requests" (
    "id" TEXT NOT NULL,
    "entry_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "new_check_in" TIMESTAMP(3),
    "new_check_out" TIMESTAMP(3),
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "reviewed_by" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "timesheet_edit_requests_pkey" PRIMARY KEY ("id")
);

-- Time off policies
CREATE TABLE IF NOT EXISTS "time_off_policies" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "days_allowed" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "time_off_policies_pkey" PRIMARY KEY ("id")
);

-- Time off requests
CREATE TABLE IF NOT EXISTS "time_off_requests" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "policy_id" TEXT NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "days" INTEGER NOT NULL DEFAULT 1,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "manager_comment" TEXT,
    "reviewed_by" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "time_off_requests_pkey" PRIMARY KEY ("id")
);

-- Invites
CREATE TABLE IF NOT EXISTS "invites" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "role_id" TEXT NOT NULL,
    "team_id" TEXT,
    "department" TEXT,
    "designation" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "invited_by" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "redeemed_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "invites_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "invites_token_key" ON "invites"("token");
CREATE UNIQUE INDEX IF NOT EXISTS "invites_redeemed_by_id_key" ON "invites"("redeemed_by_id");

-- Notifications
CREATE TABLE IF NOT EXISTS "notifications" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'info',
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- Support tickets
CREATE TABLE IF NOT EXISTS "support_tickets" (
    "id" TEXT NOT NULL,
    "ticket_number" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "recipient_role" TEXT NOT NULL,
    "recipient_label" TEXT NOT NULL,
    "recipient_name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "user_id" TEXT NOT NULL,
    "resolution_note" TEXT,
    "resolved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "support_tickets_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "support_tickets_ticket_number_key" ON "support_tickets"("ticket_number");

-- Marketing deals
CREATE TABLE IF NOT EXISTS "marketing_deals" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "salesperson_id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "lead_job" TEXT NOT NULL,
    "contact" TEXT,
    "team_label" TEXT NOT NULL,
    "revenue_usd" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "marketing_deals_pkey" PRIMARY KEY ("id")
);

-- Salary builders
CREATE TABLE IF NOT EXISTS "salary_builders" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "team_label" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "basic_salary_pkr" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "deductions_pkr" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "deduction_reason" TEXT,
    "commission_pkr" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "allowances" JSONB NOT NULL DEFAULT '[]',
    "published_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "salary_builders_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "salary_builders_user_id_period_key" ON "salary_builders"("user_id", "period");

-- Asset categories
CREATE TABLE IF NOT EXISTS "asset_categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "asset_categories_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "asset_categories_code_key" ON "asset_categories"("code");

-- Asset vendors
CREATE TABLE IF NOT EXISTS "asset_vendors" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contact_info" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "asset_vendors_pkey" PRIMARY KEY ("id")
);

-- Asset locations
CREATE TABLE IF NOT EXISTS "asset_locations" (
    "id" TEXT NOT NULL,
    "office" TEXT NOT NULL,
    "floor" TEXT,
    "room" TEXT,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "asset_locations_pkey" PRIMARY KEY ("id")
);

-- Assets
CREATE TABLE IF NOT EXISTS "assets" (
    "id" TEXT NOT NULL,
    "asset_tag" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "brand" TEXT,
    "model" TEXT,
    "serial_number" TEXT,
    "category_id" TEXT NOT NULL,
    "vendor_id" TEXT,
    "location_id" TEXT,
    "department_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'AVAILABLE',
    "purchase_date" TIMESTAMP(3),
    "purchase_cost" DOUBLE PRECISION,
    "warranty_expiry" TIMESTAMP(3),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),
    CONSTRAINT "assets_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "assets_asset_tag_key" ON "assets"("asset_tag");

-- Asset assignments
CREATE TABLE IF NOT EXISTS "asset_assignments" (
    "id" TEXT NOT NULL,
    "asset_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "return_date" TIMESTAMP(3),
    "returned_at" TIMESTAMP(3),
    "returned_condition" TEXT,
    "notes" TEXT,
    "assigned_by" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "asset_assignments_pkey" PRIMARY KEY ("id")
);

-- Asset maintenance logs
CREATE TABLE IF NOT EXISTS "asset_maintenance_logs" (
    "id" TEXT NOT NULL,
    "asset_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "cost" DOUBLE PRECISION,
    "performed_by" TEXT,
    "performed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "next_due_date" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "asset_maintenance_logs_pkey" PRIMARY KEY ("id")
);

-- Asset disposals
CREATE TABLE IF NOT EXISTS "asset_disposals" (
    "id" TEXT NOT NULL,
    "asset_id" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "disposal_date" TIMESTAMP(3) NOT NULL,
    "disposed_by" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "asset_disposals_pkey" PRIMARY KEY ("id")
);

-- Daily progress reports
CREATE TABLE IF NOT EXISTS "daily_progress_reports" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "project_id" TEXT,
    "task_id" TEXT,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "todays_progress" TEXT NOT NULL,
    "completion_percentage" INTEGER NOT NULL DEFAULT 0,
    "blockers" TEXT,
    "tomorrow_plan" TEXT,
    "manager_remarks" TEXT,
    "status" TEXT NOT NULL DEFAULT 'SUBMITTED',
    "reviewed_by" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "daily_progress_reports_pkey" PRIMARY KEY ("id")
);

-- Employee performance scores
CREATE TABLE IF NOT EXISTS "employee_performance_scores" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "score_type" TEXT NOT NULL DEFAULT 'ENGINEERING',
    "timely_delivery" INTEGER NOT NULL DEFAULT 0,
    "quality_score" INTEGER NOT NULL DEFAULT 0,
    "regularity" INTEGER NOT NULL DEFAULT 0,
    "punctuality" INTEGER NOT NULL DEFAULT 0,
    "dress_code" INTEGER NOT NULL DEFAULT 0,
    "total_score" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "scored_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "employee_performance_scores_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "employee_performance_scores_user_id_period_key" ON "employee_performance_scores"("user_id", "period");

-- Performance reviews
CREATE TABLE IF NOT EXISTS "performance_reviews" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "reviewer_id" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "rating" INTEGER NOT NULL DEFAULT 0,
    "comments" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "performance_reviews_pkey" PRIMARY KEY ("id")
);

-- Bonus configurations
CREATE TABLE IF NOT EXISTS "bonus_configurations" (
    "id" TEXT NOT NULL,
    "level_name" TEXT NOT NULL,
    "min_score" INTEGER NOT NULL,
    "max_score" INTEGER NOT NULL,
    "bonus_amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "bonus_configurations_pkey" PRIMARY KEY ("id")
);

-- Monthly bonus records
CREATE TABLE IF NOT EXISTS "monthly_bonus_records" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "average_score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "performance_level" TEXT,
    "bonus_eligible" BOOLEAN NOT NULL DEFAULT false,
    "bonus_amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "approval_status" TEXT NOT NULL DEFAULT 'PENDING',
    "approved_by" TEXT,
    "approved_at" TIMESTAMP(3),
    "paid_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "monthly_bonus_records_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "monthly_bonus_records_user_id_period_key" ON "monthly_bonus_records"("user_id", "period");

-- ── Foreign Key Constraints ────────────────────────────────────────────────────

-- users → departments / divisions (optional, add after those tables exist)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_department_id_fkey') THEN
    ALTER TABLE "users" ADD CONSTRAINT "users_department_id_fkey"
      FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE SET NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_division_id_fkey') THEN
    ALTER TABLE "users" ADD CONSTRAINT "users_division_id_fkey"
      FOREIGN KEY ("division_id") REFERENCES "divisions"("id") ON DELETE SET NULL;
  END IF;
END $$;

-- otp_codes → users
ALTER TABLE "otp_codes" DROP CONSTRAINT IF EXISTS "otp_codes_user_id_fkey";
ALTER TABLE "otp_codes" ADD CONSTRAINT "otp_codes_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;

-- user_settings → users
ALTER TABLE "user_settings" DROP CONSTRAINT IF EXISTS "user_settings_user_id_fkey";
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;

-- divisions → departments
ALTER TABLE "divisions" DROP CONSTRAINT IF EXISTS "divisions_department_id_fkey";
ALTER TABLE "divisions" ADD CONSTRAINT "divisions_department_id_fkey"
  FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE CASCADE;

-- team_members → teams / users
ALTER TABLE "team_members" DROP CONSTRAINT IF EXISTS "team_members_team_id_fkey";
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_team_id_fkey"
  FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE;
ALTER TABLE "team_members" DROP CONSTRAINT IF EXISTS "team_members_user_id_fkey";
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;

-- project_members → projects / users
ALTER TABLE "project_members" DROP CONSTRAINT IF EXISTS "project_members_project_id_fkey";
ALTER TABLE "project_members" ADD CONSTRAINT "project_members_project_id_fkey"
  FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE;
ALTER TABLE "project_members" DROP CONSTRAINT IF EXISTS "project_members_user_id_fkey";
ALTER TABLE "project_members" ADD CONSTRAINT "project_members_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;

-- Indexes
CREATE INDEX IF NOT EXISTS "otp_codes_user_id_idx" ON "otp_codes"("user_id");
CREATE INDEX IF NOT EXISTS "otp_codes_expires_at_idx" ON "otp_codes"("expires_at");
CREATE INDEX IF NOT EXISTS "projects_owner_id_idx" ON "projects"("owner_id");
CREATE INDEX IF NOT EXISTS "projects_status_idx" ON "projects"("status");
CREATE INDEX IF NOT EXISTS "timesheet_entries_user_id_idx" ON "timesheet_entries"("user_id");
CREATE INDEX IF NOT EXISTS "timesheet_entries_check_in_idx" ON "timesheet_entries"("check_in");
CREATE INDEX IF NOT EXISTS "notifications_user_id_idx" ON "notifications"("user_id");
CREATE INDEX IF NOT EXISTS "notifications_is_read_idx" ON "notifications"("is_read");
CREATE INDEX IF NOT EXISTS "support_tickets_user_id_idx" ON "support_tickets"("user_id");
CREATE INDEX IF NOT EXISTS "support_tickets_status_idx" ON "support_tickets"("status");
CREATE INDEX IF NOT EXISTS "assets_category_id_idx" ON "assets"("category_id");
CREATE INDEX IF NOT EXISTS "assets_status_idx" ON "assets"("status");
CREATE INDEX IF NOT EXISTS "daily_progress_reports_user_id_idx" ON "daily_progress_reports"("user_id");
CREATE INDEX IF NOT EXISTS "daily_progress_reports_date_idx" ON "daily_progress_reports"("date");
CREATE INDEX IF NOT EXISTS "invites_email_idx" ON "invites"("email");
CREATE INDEX IF NOT EXISTS "invites_status_idx" ON "invites"("status");
