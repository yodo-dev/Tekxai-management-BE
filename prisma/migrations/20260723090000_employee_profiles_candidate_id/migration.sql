-- Single Employee Master traceability: links an employee back to the
-- recruitment candidate they were hired from (set once, on offer acceptance).
ALTER TABLE "employee_profiles" ADD COLUMN "candidate_id" TEXT;
CREATE UNIQUE INDEX "employee_profiles_candidate_id_key" ON "employee_profiles"("candidate_id");
ALTER TABLE "employee_profiles" ADD CONSTRAINT "employee_profiles_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "candidates"("id") ON DELETE SET NULL ON UPDATE CASCADE;
