-- People OS Phase 2 Milestone 1 — Employment Status Reconciliation
-- Employment Status (users.status / employee_profiles.employment_status) is
-- now a single 6-value operational-state vocabulary: ACTIVE, INACTIVE,
-- ON_LEAVE, SUSPENDED, TERMINATED, DECEASED. Both columns are written
-- exclusively through set_employment_status() going forward.
--
-- The pre-Milestone-1 "Add Employee" form wrote a mismatched 7-value set
-- (PERMANENT, PROBATION, CONTRACT, INTERN, RESIGNED, TERMINATED, INACTIVE)
-- into employee_profiles.employment_status. Reconcile every non-conforming
-- value onto the frozen vocabulary:
--   PROBATION, PERMANENT, CONTRACT, INTERN -> ACTIVE (all operationally active;
--     PROBATION is now an Employee Lifecycle stage, PERMANENT/CONTRACT/INTERN
--     are Employment Type values, not Employment Status)
--   RESIGNED -> TERMINATED (no longer employed; Status has no separate
--     resigned/terminated distinction, only Lifecycle does)
UPDATE "employee_profiles" SET "employment_status" = 'ACTIVE' WHERE "employment_status" IN ('PROBATION', 'PERMANENT', 'CONTRACT', 'INTERN');
UPDATE "employee_profiles" SET "employment_status" = 'TERMINATED' WHERE "employment_status" = 'RESIGNED';

-- users.status has never carried these legacy values historically (it has
-- always defaulted to ACTIVE on create), but reconcile defensively in case
-- any row drifted via a direct write before this milestone introduced the
-- single write path.
UPDATE "users" SET "status" = 'ACTIVE' WHERE "status" IN ('PROBATION', 'PERMANENT', 'CONTRACT', 'INTERN');
UPDATE "users" SET "status" = 'TERMINATED' WHERE "status" = 'RESIGNED';
