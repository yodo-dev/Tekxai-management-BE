import prisma from '../../../shared/database/client.js';

export async function get_or_create_account(userId) {
  let account = await prisma.expense_accounts.findUnique({ where: { user_id: userId } });
  if (!account) {
    account = await prisma.expense_accounts.create({ data: { user_id: userId } });
  }
  return account;
}

export async function compute_account_summary(account, transactions) {
  const income  = transactions.filter(t => t.transaction_type === 'income');
  const expense = transactions.filter(t => t.transaction_type === 'expense');

  const total_received   = income.reduce((s, t) => s + t.total_amount, 0);
  const total_spent      = expense.reduce((s, t) => s + t.total_amount, 0);
  const ce_received      = income.reduce((s, t) => s + t.ce_amount, 0);
  const tekxai_received  = income.reduce((s, t) => s + t.tekxai_amount, 0);
  const ce_spent         = expense.reduce((s, t) => s + t.ce_amount, 0);
  const tekxai_spent     = expense.reduce((s, t) => s + t.tekxai_amount, 0);
  const balance          = account.opening_balance + total_received - total_spent;
  const ce_balance       = ce_received - ce_spent;
  const tekxai_balance   = tekxai_received - tekxai_spent;

  return { total_received, total_spent, balance, ce_received, tekxai_received, ce_spent, tekxai_spent, ce_balance, tekxai_balance };
}

export async function build_ledger(account, transactions) {
  const sorted = [...transactions].sort((a, b) => new Date(a.date) - new Date(b.date));
  let running = account.opening_balance;
  return sorted.map(t => {
    if (t.transaction_type === 'income')  running += t.total_amount;
    if (t.transaction_type === 'expense') running -= t.total_amount;
    return { ...t, running_balance: running };
  });
}
