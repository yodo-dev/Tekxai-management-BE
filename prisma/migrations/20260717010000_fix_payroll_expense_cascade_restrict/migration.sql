-- Production Readiness Audit fix: payroll_entries.run and
-- expense_transactions.expense_account previously used ON DELETE CASCADE,
-- meaning deleting a payroll_runs or expense_accounts row would silently
-- destroy all related financial history. Changed to ON DELETE RESTRICT so a
-- parent row cannot be deleted while dependent records still exist.
-- No delete endpoint exists for either parent model today; this is a
-- fail-closed schema safeguard, not a behavior change for any current flow.

ALTER TABLE "payroll_entries" DROP CONSTRAINT IF EXISTS "payroll_entries_run_id_fkey";
ALTER TABLE "payroll_entries" ADD CONSTRAINT "payroll_entries_run_id_fkey"
  FOREIGN KEY ("run_id") REFERENCES "payroll_runs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "expense_transactions" DROP CONSTRAINT IF EXISTS "expense_transactions_expense_account_id_fkey";
ALTER TABLE "expense_transactions" ADD CONSTRAINT "expense_transactions_expense_account_id_fkey"
  FOREIGN KEY ("expense_account_id") REFERENCES "expense_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
