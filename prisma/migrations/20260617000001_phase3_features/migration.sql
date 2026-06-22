-- Phase 3: Late Coming, Grace Period, Shift Schedules, Leave Balances, JDs, Activity Logs

-- Add milestone_id to tasks
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "milestone_id" TEXT;
CREATE INDEX IF NOT EXISTS "tasks_milestone_id_idx" ON "tasks"("milestone_id");
CREATE INDEX IF NOT EXISTS "tasks_assigned_to_idx" ON "tasks"("assigned_to");

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tasks_milestone_id_fkey') THEN
    ALTER TABLE "tasks" ADD CONSTRAINT "tasks_milestone_id_fkey"
      FOREIGN KEY ("milestone_id") REFERENCES "milestones"("id") ON DELETE SET NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tasks_assigned_to_fkey') THEN
    ALTER TABLE "tasks" ADD CONSTRAINT "tasks_assigned_to_fkey"
      FOREIGN KEY ("assigned_to") REFERENCES "users"("id") ON DELETE SET NULL;
  END IF;
END $$;

-- Shift Schedules
CREATE TABLE IF NOT EXISTS "shift_schedules" (
    "id"                TEXT NOT NULL,
    "name"              TEXT NOT NULL,
    "start_time"        TEXT NOT NULL DEFAULT '09:00',
    "end_time"          TEXT NOT NULL DEFAULT '18:00',
    "grace_period_mins" INTEGER NOT NULL DEFAULT 15,
    "work_days"         TEXT NOT NULL DEFAULT '1,2,3,4,5',
    "is_default"        BOOLEAN NOT NULL DEFAULT false,
    "created_at"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "shift_schedules_pkey" PRIMARY KEY ("id")
);

-- Employee Shifts
CREATE TABLE IF NOT EXISTS "employee_shifts" (
    "id"         TEXT NOT NULL,
    "user_id"    TEXT NOT NULL,
    "shift_id"   TEXT NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date"   TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "employee_shifts_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "employee_shifts_user_id_idx"  ON "employee_shifts"("user_id");
CREATE INDEX IF NOT EXISTS "employee_shifts_shift_id_idx" ON "employee_shifts"("shift_id");

ALTER TABLE "employee_shifts" DROP CONSTRAINT IF EXISTS "employee_shifts_user_id_fkey";
ALTER TABLE "employee_shifts" ADD CONSTRAINT "employee_shifts_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;
ALTER TABLE "employee_shifts" DROP CONSTRAINT IF EXISTS "employee_shifts_shift_id_fkey";
ALTER TABLE "employee_shifts" ADD CONSTRAINT "employee_shifts_shift_id_fkey"
  FOREIGN KEY ("shift_id") REFERENCES "shift_schedules"("id") ON DELETE CASCADE;

-- Attendance Violations
CREATE TABLE IF NOT EXISTS "attendance_violations" (
    "id"             TEXT NOT NULL,
    "user_id"        TEXT NOT NULL,
    "entry_id"       TEXT,
    "date"           TIMESTAMP(3) NOT NULL,
    "violation_type" TEXT NOT NULL,
    "late_mins"      INTEGER NOT NULL DEFAULT 0,
    "remarks"        TEXT,
    "created_at"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "attendance_violations_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "attendance_violations_user_id_idx"        ON "attendance_violations"("user_id");
CREATE INDEX IF NOT EXISTS "attendance_violations_date_idx"           ON "attendance_violations"("date");
CREATE INDEX IF NOT EXISTS "attendance_violations_violation_type_idx" ON "attendance_violations"("violation_type");

ALTER TABLE "attendance_violations" DROP CONSTRAINT IF EXISTS "attendance_violations_user_id_fkey";
ALTER TABLE "attendance_violations" ADD CONSTRAINT "attendance_violations_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;

-- Leave Balances
CREATE TABLE IF NOT EXISTS "leave_balances" (
    "id"             TEXT NOT NULL,
    "user_id"        TEXT NOT NULL,
    "policy_id"      TEXT NOT NULL,
    "year"           INTEGER NOT NULL,
    "total_days"     INTEGER NOT NULL DEFAULT 0,
    "used_days"      DOUBLE PRECISION NOT NULL DEFAULT 0,
    "pending_days"   DOUBLE PRECISION NOT NULL DEFAULT 0,
    "remaining_days" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "created_at"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "leave_balances_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "leave_balances_user_id_policy_id_year_key"
  ON "leave_balances"("user_id", "policy_id", "year");
CREATE INDEX IF NOT EXISTS "leave_balances_user_id_idx"   ON "leave_balances"("user_id");
CREATE INDEX IF NOT EXISTS "leave_balances_policy_id_idx" ON "leave_balances"("policy_id");

ALTER TABLE "leave_balances" DROP CONSTRAINT IF EXISTS "leave_balances_user_id_fkey";
ALTER TABLE "leave_balances" ADD CONSTRAINT "leave_balances_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;
ALTER TABLE "leave_balances" DROP CONSTRAINT IF EXISTS "leave_balances_policy_id_fkey";
ALTER TABLE "leave_balances" ADD CONSTRAINT "leave_balances_policy_id_fkey"
  FOREIGN KEY ("policy_id") REFERENCES "time_off_policies"("id") ON DELETE CASCADE;

-- Job Descriptions
CREATE TABLE IF NOT EXISTS "job_descriptions" (
    "id"               TEXT NOT NULL,
    "user_id"          TEXT NOT NULL,
    "title"            TEXT NOT NULL,
    "department_id"    TEXT,
    "division_id"      TEXT,
    "reporting_to_id"  TEXT,
    "employment_type"  TEXT NOT NULL DEFAULT 'FULL_TIME',
    "responsibilities" TEXT,
    "qualifications"   TEXT,
    "kpi_targets"      JSONB NOT NULL DEFAULT '[]',
    "is_active"        BOOLEAN NOT NULL DEFAULT true,
    "effective_date"   TIMESTAMP(3),
    "created_at"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "job_descriptions_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "job_descriptions_user_id_key" ON "job_descriptions"("user_id");
CREATE INDEX IF NOT EXISTS "job_descriptions_department_id_idx" ON "job_descriptions"("department_id");

ALTER TABLE "job_descriptions" DROP CONSTRAINT IF EXISTS "job_descriptions_user_id_fkey";
ALTER TABLE "job_descriptions" ADD CONSTRAINT "job_descriptions_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;

-- Activity Logs
CREATE TABLE IF NOT EXISTS "activity_logs" (
    "id"          TEXT NOT NULL,
    "user_id"     TEXT NOT NULL,
    "action"      TEXT NOT NULL,
    "entity_type" TEXT,
    "entity_id"   TEXT,
    "description" TEXT,
    "ip_address"  TEXT,
    "user_agent"  TEXT,
    "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "activity_logs_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "activity_logs_user_id_idx"    ON "activity_logs"("user_id");
CREATE INDEX IF NOT EXISTS "activity_logs_action_idx"     ON "activity_logs"("action");
CREATE INDEX IF NOT EXISTS "activity_logs_created_at_idx" ON "activity_logs"("created_at");

ALTER TABLE "activity_logs" DROP CONSTRAINT IF EXISTS "activity_logs_user_id_fkey";
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;

-- Seed default shift
INSERT INTO "shift_schedules" ("id", "name", "start_time", "end_time", "grace_period_mins", "is_default", "created_at", "updated_at")
VALUES ('default-shift-001', 'Standard 9-6', '09:00', '18:00', 15, true, NOW(), NOW())
ON CONFLICT DO NOTHING;
