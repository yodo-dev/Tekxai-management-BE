-- Sprint 3 Milestone 4: Concurrency Safety.
-- Verified immediately before writing this migration: zero existing
-- (run_id, user_id) duplicate rows in payroll_entries (confirmed via a
-- GROUP BY ... HAVING COUNT(*) > 1 query against the live dev database).
-- This constraint can therefore be added directly, with no dedup pass.
CREATE UNIQUE INDEX "payroll_entries_run_id_user_id_key" ON "payroll_entries"("run_id", "user_id");
