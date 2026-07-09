-- Sprint 1 Phase 4 Milestone 2 — Offboarding Checklist.
-- Additive only. Mirrors onboarding_tasks exactly, but for the exit journey:
-- when an employee's lifecycle stage moves to EXIT_CLEARANCE, a standard set
-- of offboarding_tasks rows is auto-seeded (asset return, access revocation,
-- exit interview, etc.) via create_task() in the new offboarding module.
CREATE TABLE IF NOT EXISTS "offboarding_tasks" (
    "id"           TEXT NOT NULL,
    "user_id"      TEXT NOT NULL,
    "title"        TEXT NOT NULL,
    "description"  TEXT,
    "category"     TEXT NOT NULL DEFAULT 'GENERAL',
    "is_completed" BOOLEAN NOT NULL DEFAULT false,
    "completed_at" TIMESTAMP(3),
    "due_date"     TIMESTAMP(3),
    "assigned_by"  TEXT,
    "created_at"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "offboarding_tasks_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "offboarding_tasks_user_id_idx" ON "offboarding_tasks"("user_id");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'offboarding_tasks_user_id_fkey'
    ) THEN
        ALTER TABLE "offboarding_tasks"
            ADD CONSTRAINT "offboarding_tasks_user_id_fkey"
            FOREIGN KEY ("user_id") REFERENCES "users"("id")
            ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
