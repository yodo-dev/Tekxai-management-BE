-- Sprint 1 Phase 4 Milestone 1 — Promotion & Transfer History.
-- Additive only. Introduces "designation_history" so a designation/grade/
-- department change is recorded as a proper audit record (before/after
-- values, effective date, actor) instead of a silent generic field edit via
-- update_existing_user(). Single write path: record_designation_change()
-- in users.repository.js.
CREATE TABLE IF NOT EXISTS "designation_history" (
    "id"                      TEXT NOT NULL,
    "user_id"                 TEXT NOT NULL,
    "previous_designation_id" TEXT,
    "new_designation_id"      TEXT,
    "previous_grade_id"       TEXT,
    "new_grade_id"            TEXT,
    "previous_department_id"  TEXT,
    "new_department_id"       TEXT,
    "change_type"             TEXT NOT NULL,
    "effective_date"          TIMESTAMP(3),
    "reason"                  TEXT,
    "changed_by"              TEXT NOT NULL,
    "created_at"              TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "designation_history_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "designation_history_user_id_idx" ON "designation_history"("user_id");
CREATE INDEX IF NOT EXISTS "designation_history_change_type_idx" ON "designation_history"("change_type");
CREATE INDEX IF NOT EXISTS "designation_history_effective_date_idx" ON "designation_history"("effective_date");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'designation_history_user_id_fkey'
    ) THEN
        ALTER TABLE "designation_history"
            ADD CONSTRAINT "designation_history_user_id_fkey"
            FOREIGN KEY ("user_id") REFERENCES "users"("id")
            ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'designation_history_changed_by_fkey'
    ) THEN
        ALTER TABLE "designation_history"
            ADD CONSTRAINT "designation_history_changed_by_fkey"
            FOREIGN KEY ("changed_by") REFERENCES "users"("id")
            ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'designation_history_previous_designation_id_fkey'
    ) THEN
        ALTER TABLE "designation_history"
            ADD CONSTRAINT "designation_history_previous_designation_id_fkey"
            FOREIGN KEY ("previous_designation_id") REFERENCES "designations"("id")
            ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'designation_history_new_designation_id_fkey'
    ) THEN
        ALTER TABLE "designation_history"
            ADD CONSTRAINT "designation_history_new_designation_id_fkey"
            FOREIGN KEY ("new_designation_id") REFERENCES "designations"("id")
            ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'designation_history_previous_grade_id_fkey'
    ) THEN
        ALTER TABLE "designation_history"
            ADD CONSTRAINT "designation_history_previous_grade_id_fkey"
            FOREIGN KEY ("previous_grade_id") REFERENCES "grades"("id")
            ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'designation_history_new_grade_id_fkey'
    ) THEN
        ALTER TABLE "designation_history"
            ADD CONSTRAINT "designation_history_new_grade_id_fkey"
            FOREIGN KEY ("new_grade_id") REFERENCES "grades"("id")
            ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'designation_history_previous_department_id_fkey'
    ) THEN
        ALTER TABLE "designation_history"
            ADD CONSTRAINT "designation_history_previous_department_id_fkey"
            FOREIGN KEY ("previous_department_id") REFERENCES "departments"("id")
            ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'designation_history_new_department_id_fkey'
    ) THEN
        ALTER TABLE "designation_history"
            ADD CONSTRAINT "designation_history_new_department_id_fkey"
            FOREIGN KEY ("new_department_id") REFERENCES "departments"("id")
            ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;
