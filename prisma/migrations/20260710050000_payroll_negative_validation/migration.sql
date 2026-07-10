-- Sprint 3 Milestone 5: Negative Payroll Validation.
-- Additive-only: three new defaulted/nullable columns on payroll_entries.
ALTER TABLE "payroll_entries" ADD COLUMN "calculated_net_amount" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "payroll_entries" ADD COLUMN "validation_status" TEXT NOT NULL DEFAULT 'PASSED';
ALTER TABLE "payroll_entries" ADD COLUMN "validation_reason" TEXT;
