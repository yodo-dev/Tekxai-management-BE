-- Add department_id/designation_id/grade_id FK columns to invites, so invite
-- redemption can create the same organization-structure relations `users`
-- has, instead of only a disconnected free-text snapshot.
ALTER TABLE "invites" ADD COLUMN IF NOT EXISTS "department_id" TEXT;
ALTER TABLE "invites" ADD COLUMN IF NOT EXISTS "designation_id" TEXT;
ALTER TABLE "invites" ADD COLUMN IF NOT EXISTS "grade_id" TEXT;

CREATE INDEX IF NOT EXISTS "invites_department_id_idx" ON "invites"("department_id");
CREATE INDEX IF NOT EXISTS "invites_designation_id_idx" ON "invites"("designation_id");
CREATE INDEX IF NOT EXISTS "invites_grade_id_idx" ON "invites"("grade_id");

ALTER TABLE "invites" ADD CONSTRAINT "invites_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "invites" ADD CONSTRAINT "invites_designation_id_fkey" FOREIGN KEY ("designation_id") REFERENCES "designations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "invites" ADD CONSTRAINT "invites_grade_id_fkey" FOREIGN KEY ("grade_id") REFERENCES "grades"("id") ON DELETE SET NULL ON UPDATE CASCADE;
