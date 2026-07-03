import prisma from '../../../shared/database/client.js';
import { compute_account_summary, build_ledger } from '../services/expenses.service.js';
import { send_expense_approved_email, send_expense_rejected_email } from '../../email/email.service.js';
import { fire_webhook } from '../../../shared/services/webhook.service.js';

const ok   = (res, payload, message = 'OK', status = 200) => res.status(status).json({ success: true, message, payload });
const fail = (res, message, status = 400) => res.status(status).json({ success: false, message });

const TX_INCLUDE = {
  user:     { select: { id: true, first_name: true, last_name: true } },
  category: { select: { id: true, name: true } },
};

export async function list_accounts(req, res, next) {
  try {
    const accounts = await prisma.expense_accounts.findMany({
      take: 500,
      where: { is_enabled: true },
      include: {
        user: { select: { id: true, employee_id: true, first_name: true, last_name: true, avatar: true, designation: true } },
        transactions: true,
      },
      orderBy: { created_at: 'asc' },
    });
    const records = await Promise.all(accounts.map(async acc => {
      const summary = await compute_account_summary(acc, acc.transactions);
      return { ...acc, transactions: undefined, ...summary };
    }));
    return ok(res, { records, total: records.length });
  } catch (e) { next(e); }
}

export async function create_account(req, res, next) {
  try {
    const { user_id, opening_balance = 0, notes } = req.body;
    if (!user_id) return fail(res, 'user_id required');
    const existing = await prisma.expense_accounts.findUnique({ where: { user_id } });
    if (existing) {
      const updated = await prisma.expense_accounts.update({ where: { user_id }, data: { is_enabled: true, opening_balance: +opening_balance || existing.opening_balance, notes: notes ?? existing.notes } });
      return ok(res, updated, 'Account enabled', 200);
    }
    const account = await prisma.expense_accounts.create({ data: { user_id, opening_balance: +opening_balance || 0, notes } });
    return ok(res, account, 'Account created', 201);
  } catch (e) { next(e); }
}

export async function get_account(req, res, next) {
  try {
    const { userId } = req.params;
    const { from, to, type } = req.query;
    // Accept either UUID or employee_id (e.g. TXI-0001)
    const isEmployeeId = userId.startsWith('TXI-');
    const userRecord = await prisma.users.findFirst({
      where: isEmployeeId ? { employee_id: userId } : { id: userId },
      select: { id: true, first_name: true, last_name: true, designation: true, avatar: true },
    });
    if (!userRecord) return fail(res, 'User not found', 404);
    const resolvedId = userRecord.id;

    let account = await prisma.expense_accounts.findUnique({
      where: { user_id: resolvedId },
      include: { user: { select: { id: true, employee_id: true, first_name: true, last_name: true, designation: true, avatar: true } } },
    });
    if (!account) {
      account = await prisma.expense_accounts.create({
        data: { user_id: resolvedId, opening_balance: 0, is_enabled: true },
        include: { user: { select: { id: true, employee_id: true, first_name: true, last_name: true, designation: true, avatar: true } } },
      });
    }
    const where = { expense_account_id: account.id };
    if (type) where.transaction_type = type;
    if (from || to) where.date = {};
    if (from) where.date.gte = new Date(from);
    if (to)   where.date.lte = new Date(to);
    const transactions = await prisma.expense_transactions.findMany({
  take: 500, where, include: TX_INCLUDE, orderBy: { date: 'asc' } });
    const allTxns = await prisma.expense_transactions.findMany({
  take: 500, where: { expense_account_id: account.id } });
    const summary = await compute_account_summary(account, allTxns);
    const ledger  = await build_ledger(account, transactions);
    return ok(res, { account: { ...account, ...summary }, transactions: ledger });
  } catch (e) { next(e); }
}

export async function update_account(req, res, next) {
  try {
    let { userId } = req.params;
    if (userId.startsWith('TXI-')) {
      const u = await prisma.users.findFirst({ where: { employee_id: userId }, select: { id: true } });
      if (u) userId = u.id;
    }
    const { opening_balance, notes, is_enabled } = req.body;
    const account = await prisma.expense_accounts.findUnique({ where: { user_id: userId } });
    if (!account) return fail(res, 'Not found', 404);
    const updated = await prisma.expense_accounts.update({
      where: { user_id: userId },
      data: {
        ...(opening_balance != null ? { opening_balance: +opening_balance } : {}),
        ...(notes != null ? { notes } : {}),
        ...(is_enabled != null ? { is_enabled } : {}),
      },
    });
    return ok(res, updated);
  } catch (e) { next(e); }
}

export async function list_transactions(req, res, next) {
  try {
    let { userId } = req.params;
    if (userId.startsWith('TXI-')) { const u = await prisma.users.findFirst({ where: { employee_id: userId }, select: { id: true } }); if (u) userId = u.id; }
    let account = await prisma.expense_accounts.findUnique({ where: { user_id: userId } });
    if (!account) account = await prisma.expense_accounts.create({ data: { user_id: userId } });
    const txns = await prisma.expense_transactions.findMany({
      where: { expense_account_id: account.id },
      include: TX_INCLUDE,
      orderBy: { date: 'desc' },
      take: 500,
    });
    return ok(res, { records: txns, total: txns.length });
  } catch (e) { next(e); }
}

export async function add_transaction(req, res, next) {
  try {
    let { userId } = req.params;
    if (userId.startsWith('TXI-')) { const u = await prisma.users.findFirst({ where: { employee_id: userId }, select: { id: true } }); if (u) userId = u.id; }
    const { transaction_type, date, title, total_amount, ce_amount = 0, tekxai_amount = 0, category_id, paid_to, notes } = req.body;
    if (!transaction_type || !date || !title || total_amount == null) return fail(res, 'transaction_type, date, title, total_amount required');
    if (transaction_type === 'expense') {
      const ce = +ce_amount || 0, tx = +tekxai_amount || 0, total = +total_amount;
      if (Math.abs(ce + tx - total) > 0.01) return fail(res, `ce_amount (${ce}) + tekxai_amount (${tx}) must equal total_amount (${total})`);
    }
    let account = await prisma.expense_accounts.findUnique({ where: { user_id: userId } });
    if (!account) account = await prisma.expense_accounts.create({ data: { user_id: userId } });
    const txn = await prisma.expense_transactions.create({
      data: {
        expense_account_id: account.id,
        user_id: userId,
        transaction_type,
        date: new Date(date),
        title,
        total_amount: +total_amount,
        ce_amount: +ce_amount || 0,
        tekxai_amount: +tekxai_amount || 0,
        category_id: category_id || null,
        paid_to: paid_to || null,
        notes: notes || null,
        created_by: req.user?.id || null,
      },
      include: TX_INCLUDE,
    });
    // Notify the employee when an expense entry is approved/recorded for them
    if (transaction_type === 'expense') {
      const employee = await prisma.users.findUnique({ where: { id: userId }, select: { email: true, first_name: true } });
      if (employee?.email) {
        send_expense_approved_email(employee.email, employee.first_name || 'Employee', `PKR ${(+total_amount).toLocaleString()}`, title).catch(() => {});
      }
      fire_webhook('expense.approved', { id: txn.id, amount: txn.total_amount }).catch(() => {});
    }
    return ok(res, txn, 'Transaction added', 201);
  } catch (e) { next(e); }
}

export async function update_transaction(req, res, next) {
  try {
    const { id } = req.params;
    const { date, title, total_amount, ce_amount, tekxai_amount, category_id, paid_to, notes, transaction_type } = req.body;
    if (transaction_type === 'expense' && total_amount != null && ce_amount != null && tekxai_amount != null) {
      const ce = +ce_amount, tx = +tekxai_amount, total = +total_amount;
      if (Math.abs(ce + tx - total) > 0.01) return fail(res, `ce_amount + tekxai_amount must equal total_amount`);
    }
    const txn = await prisma.expense_transactions.update({
      where: { id },
      data: {
        ...(date ? { date: new Date(date) } : {}),
        ...(title ? { title } : {}),
        ...(total_amount != null ? { total_amount: +total_amount } : {}),
        ...(ce_amount != null ? { ce_amount: +ce_amount } : {}),
        ...(tekxai_amount != null ? { tekxai_amount: +tekxai_amount } : {}),
        ...(category_id !== undefined ? { category_id: category_id || null } : {}),
        ...(paid_to !== undefined ? { paid_to } : {}),
        ...(notes !== undefined ? { notes } : {}),
        updated_at: new Date(),
      },
      include: TX_INCLUDE,
    });
    return ok(res, txn);
  } catch (e) { next(e); }
}

export async function delete_transaction(req, res, next) {
  try {
    await prisma.expense_transactions.delete({ where: { id: req.params.id } });
    return ok(res, null, 'Deleted');
  } catch (e) { next(e); }
}

export async function list_categories(req, res, next) {
  try {
    const cats = await prisma.expense_categories.findMany({
  take: 500, where: { is_active: true }, orderBy: { name: 'asc' } });
    return ok(res, { records: cats });
  } catch (e) { next(e); }
}

export async function create_category(req, res, next) {
  try {
    const { name, description } = req.body;
    if (!name) return fail(res, 'name required');
    const cat = await prisma.expense_categories.upsert({
      where: { name },
      update: { is_active: true, description },
      create: { name, description },
    });
    return ok(res, cat, 'Category created', 201);
  } catch (e) { next(e); }
}

export async function update_receipt(req, res, next) {
  try {
    const { receipt_url, receipt_key } = req.body;
    if (!receipt_url) return fail(res, 'receipt_url required');
    const expense = await prisma.expense_transactions.findUnique({ where: { id: req.params.id } });
    if (!expense) return fail(res, 'Not found', 404);
    const is_admin = req.user.roles.some(r => ['ADMIN','SUPER_ADMIN','HR'].includes(r));
    if (!is_admin && expense.user_id !== req.user.id) return fail(res, 'Forbidden', 403);
    const updated = await prisma.expense_transactions.update({ where: { id: req.params.id }, data: { receipt_url, receipt_key: receipt_key || null } });
    return ok(res, updated, 'Receipt attached');
  } catch (e) { next(e); }
}

export async function get_summary(req, res, next) {
  try {
    const { from, to } = req.query;
    const dateFilter = {};
    if (from) dateFilter.gte = new Date(from);
    if (to)   dateFilter.lte = new Date(to);
    const where = Object.keys(dateFilter).length ? { date: dateFilter } : {};

    const accounts = await prisma.expense_accounts.findMany({
      take: 500,
      where: { is_enabled: true },
      include: {
        user: { select: { id: true, first_name: true, last_name: true } },
        transactions: { where },
      },
    });

    let total_received = 0, total_spent = 0, ce_spent = 0, tekxai_spent = 0;
    const by_employee = [];
    for (const acc of accounts) {
      const summary = await compute_account_summary(acc, acc.transactions);
      total_received += summary.total_received;
      total_spent    += summary.total_spent;
      ce_spent       += summary.ce_spent;
      tekxai_spent   += summary.tekxai_spent;
      by_employee.push({ user: acc.user, ...summary });
    }

    const cat_totals = await prisma.expense_transactions.groupBy({
      by: ['category_id'],
      where: { transaction_type: 'expense', ...where },
      _sum: { total_amount: true, ce_amount: true, tekxai_amount: true },
      orderBy: { _sum: { total_amount: 'desc' } },
    });

    return ok(res, { total_received, total_spent, ce_spent, tekxai_spent, outstanding_balance: total_received - total_spent, by_employee, cat_totals });
  } catch (e) { next(e); }
}
