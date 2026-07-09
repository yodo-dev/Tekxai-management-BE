-- People OS Phase 1 — Organization Foundation
-- Designations and Grades become first-class, department-scoped/ordered entities.
-- Additive only: users.designation (free text) and users.designation_id/grade_id
-- (new FKs) coexist — existing free-text values are NOT auto-migrated onto the
-- new FK, since values are inconsistent free text and require manual
-- reconciliation (per the documented migration-risk assessment for this change).

CREATE TABLE IF NOT EXISTS "designations" (
    "id"            TEXT NOT NULL,
    "name"          TEXT NOT NULL,
    "department_id" TEXT,
    "is_active"     BOOLEAN NOT NULL DEFAULT true,
    "sort_order"    INTEGER NOT NULL DEFAULT 0,
    "created_at"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"    TIMESTAMP(3) NOT NULL,
    "deleted_at"    TIMESTAMP(3),

    CONSTRAINT "designations_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "designations_department_id_idx" ON "designations"("department_id");
ALTER TABLE "designations" ADD CONSTRAINT "designations_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "grades" (
    "id"          TEXT NOT NULL,
    "name"        TEXT NOT NULL,
    "level"       INTEGER NOT NULL,
    "description" TEXT,
    "is_active"   BOOLEAN NOT NULL DEFAULT true,
    "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"  TIMESTAMP(3) NOT NULL,
    "deleted_at"  TIMESTAMP(3),

    CONSTRAINT "grades_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "grades_name_key" ON "grades"("name");
CREATE INDEX IF NOT EXISTS "grades_level_idx" ON "grades"("level");

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "designation_id" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "grade_id" TEXT;
ALTER TABLE "users" ADD CONSTRAINT "users_designation_id_fkey" FOREIGN KEY ("designation_id") REFERENCES "designations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "users" ADD CONSTRAINT "users_grade_id_fkey" FOREIGN KEY ("grade_id") REFERENCES "grades"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Seed designations catalog from the existing hardcoded suggestion list
-- (be-work/src/modules/hr-profile/controllers/hr-profile.controller.js) so the
-- new table starts with the same options users already see today.
INSERT INTO "designations" ("id", "name", "sort_order", "updated_at") VALUES
  (gen_random_uuid()::text, 'Frontend Developer', 1, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'Backend Developer', 2, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'Full Stack Developer', 3, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'Mobile Developer', 4, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'DevOps Engineer', 5, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'AI Engineer', 6, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'UI/UX Designer', 7, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'QA Engineer', 8, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'CMS Developer', 9, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'Team Lead', 10, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'Tech Lead', 11, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'Project Manager', 12, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'Business Analyst', 13, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'Estimator', 14, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'HR Manager', 15, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'HR Executive', 16, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'Recruiter', 17, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'Marketing Executive', 18, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'Sales Executive', 19, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'Business Development', 20, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'Account Manager', 21, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'Operations Manager', 22, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'Finance Officer', 23, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'Intern', 24, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'Trainee', 25, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'CEO', 26, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'CTO', 27, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'System Architect', 28, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'Other', 29, CURRENT_TIMESTAMP)
ON CONFLICT DO NOTHING;

-- Seed a standard grade ladder (Document 2/6/7's Grade/Level examples).
INSERT INTO "grades" ("id", "name", "level", "updated_at") VALUES
  (gen_random_uuid()::text, 'Intern', 1, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'Junior', 2, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'Mid', 3, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'Senior', 4, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'Lead', 5, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'Principal', 6, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'Manager', 7, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'Director', 8, CURRENT_TIMESTAMP)
ON CONFLICT ("name") DO NOTHING;
