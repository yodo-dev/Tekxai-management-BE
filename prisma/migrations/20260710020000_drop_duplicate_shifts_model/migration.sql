-- Sprint 2 Milestone 1 — Attendance Stabilization
--
-- IMPORTANT correction discovered while writing this migration: the live
-- database's actual FK constraint (`employee_shifts_shift_id_fkey`) still
-- pointed `employee_shifts.shift_id` at `shifts` — NOT at `shift_schedules`
-- as schema.prisma's own `@relation` declared. The schema.prisma text and
-- the physical database had drifted apart at some earlier point (the text
-- was edited to declare the relationship this migration now actually
-- creates, but no migration was ever run to match it). This is the real,
-- full root cause of the shift-assignment defect: `assign_shift()` fed a
-- `shifts.id` into a constraint that, in the live database, genuinely
-- expected a `shifts.id` — the code and the (undeclared) live schema agreed
-- with each other and disagreed with the Prisma schema file.
--
-- Data check performed first: `shifts` contained exactly one row (a default
-- placeholder shift); `employee_shifts` had zero rows (shift assignment has
-- never succeeded, per the defect being fixed) so there is no data to
-- reconcile when re-pointing the FK. `shift_schedules` already has its own
-- equivalent default row. Nothing of value is lost.
ALTER TABLE "employee_shifts" DROP CONSTRAINT IF EXISTS "employee_shifts_shift_id_fkey";

ALTER TABLE "employee_shifts"
  ADD CONSTRAINT "employee_shifts_shift_id_fkey"
  FOREIGN KEY ("shift_id") REFERENCES "shift_schedules"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

DROP TABLE IF EXISTS "shifts";
