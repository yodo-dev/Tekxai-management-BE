-- Phase 3: Shifts, Late Coming, Leave Balances, JDs, Activity Logs

-- Shifts
CREATE TABLE IF NOT EXISTS "shifts" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "start_time" TEXT NOT NULL DEFAULT '09:00',
    "end_time" TEXT NOT NULL DEFAULT '18:00',
    "grace_period_min" INTEGER NOT NULL DEFAULT 15,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "shifts_pkey" PRIMARY KEY ("id")
);

-- Employee shifts
CREATE TABLE IF NOT EXISTS "employee_shifts" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "shift_id" TEXT NOT NULL,
    "effective" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "employee_shifts_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "employee_shifts_user_id_idx" ON "employee_shifts"("user_id");
ALTER TABLE "employee_shifts" DROP CONSTRAINT IF EXISTS "employee_shifts_user_id_fkey";
ALTER TABLE "employee_shifts" ADD CONSTRAINT "employee_shifts_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;
ALTER TABLE "employee_shifts" DROP CONSTRAINT IF EXISTS "employee_shifts_shift_id_fkey";
ALTER TABLE "employee_shifts" ADD CONSTRAINT "employee_shifts_shift_id_fkey"
    FOREIGN KEY ("shift_id") REFERENCES "shifts"("id") ON DELETE CASCADE;

-- Attendance violations (late coming)
CREATE TABLE IF NOT EXISTS "attendance_violations" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "expected_check_in" TIMESTAMP(3) NOT NULL,
    "actual_check_in" TIMESTAMP(3),
    "late_minutes" INTEGER NOT NULL DEFAULT 0,
    "violation_type" TEXT NOT NULL DEFAULT 'LATE',
    "is_excused" BOOLEAN NOT NULL DEFAULT false,
    "excused_reason" TEXT,
    "entry_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "attendance_violations_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "attendance_violations_user_id_idx" ON "attendance_violations"("user_id");
CREATE INDEX IF NOT EXISTS "attendance_violations_date_idx" ON "attendance_violations"("date");
ALTER TABLE "attendance_violations" DROP CONSTRAINT IF EXISTS "attendance_violations_user_id_fkey";
ALTER TABLE "attendance_violations" ADD CONSTRAINT "attendance_violations_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;

-- Leave balances
CREATE TABLE IF NOT EXISTS "leave_balances" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "policy_id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "allocated" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "used" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "pending" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "remaining" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "leave_balances_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "leave_balances_user_policy_year_key" ON "leave_balances"("user_id", "policy_id", "year");
CREATE INDEX IF NOT EXISTS "leave_balances_user_id_idx" ON "leave_balances"("user_id");
ALTER TABLE "leave_balances" DROP CONSTRAINT IF EXISTS "leave_balances_user_id_fkey";
ALTER TABLE "leave_balances" ADD CONSTRAINT "leave_balances_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;
ALTER TABLE "leave_balances" DROP CONSTRAINT IF EXISTS "leave_balances_policy_id_fkey";
ALTER TABLE "leave_balances" ADD CONSTRAINT "leave_balances_policy_id_fkey"
    FOREIGN KEY ("policy_id") REFERENCES "time_off_policies"("id") ON DELETE CASCADE;

-- Job descriptions
CREATE TABLE IF NOT EXISTS "job_descriptions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "title" TEXT,
    "summary" TEXT,
    "responsibilities" TEXT,
    "qualifications" TEXT,
    "kpi_targets" TEXT,
    "employment_type" TEXT NOT NULL DEFAULT 'FULL_TIME',
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "job_descriptions_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "job_descriptions_user_id_key" ON "job_descriptions"("user_id");
ALTER TABLE "job_descriptions" DROP CONSTRAINT IF EXISTS "job_descriptions_user_id_fkey";
ALTER TABLE "job_descriptions" ADD CONSTRAINT "job_descriptions_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;

-- Activity logs
CREATE TABLE IF NOT EXISTS "activity_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity" TEXT,
    "entity_id" TEXT,
    "description" TEXT,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "activity_logs_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "activity_logs_user_id_idx" ON "activity_logs"("user_id");
CREATE INDEX IF NOT EXISTS "activity_logs_action_idx" ON "activity_logs"("action");
CREATE INDEX IF NOT EXISTS "activity_logs_created_at_idx" ON "activity_logs"("created_at");
ALTER TABLE "activity_logs" DROP CONSTRAINT IF EXISTS "activity_logs_user_id_fkey";
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;

-- Seed default shift
INSERT INTO "shifts" ("id", "name", "start_time", "end_time", "grace_period_min", "is_default", "updated_at")
VALUES ('shift_default_001', 'Standard (9AM-6PM)', '09:00', '18:00', 15, true, CURRENT_TIMESTAMP)
ON CONFLICT DO NOTHING;
