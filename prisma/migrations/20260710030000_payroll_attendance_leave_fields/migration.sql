-- Sprint 3: Payroll x Attendance/Leave integration.
-- Additive-only: 6 new nullable-defaulted columns on payroll_entries, no
-- existing data touched, no existing column altered.
ALTER TABLE "payroll_entries" ADD COLUMN "paid_leave_days" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "payroll_entries" ADD COLUMN "unpaid_leave_days" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "payroll_entries" ADD COLUMN "absent_days" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "payroll_entries" ADD COLUMN "late_violation_count" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "payroll_entries" ADD COLUMN "late_deduction" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "payroll_entries" ADD COLUMN "absence_penalty" DOUBLE PRECISION NOT NULL DEFAULT 0;
