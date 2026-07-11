// Enterprise Performance Platform — Performance Engine (Phase 2, Milestones 4-5).
// Composes the Revenue/Cost/Work/Value attribution layers built in Phase 1
// (project-linked invoices, Business Activity, Business Unit rules) into scored
// performance at every level. Compute-on-read, no new aggregate tables — same
// pattern the Post-Sales Dashboard already established this engagement.
// Distinct from the pre-existing src/modules/performance module (HR performance
// review scores/bonuses) — unrelated domain, deliberately not reused/renamed.
// See Tekxai-Operations-OS/08-Master-Gap-Analysis.md §11.1, §11.3, §11.5.
import prisma from '../../../shared/database/client.js';

function app_error(m, c = 400) { const e = new Error(m); e.status_code = c; return e; }

function month_bounds(month, year) {
  const m = +month, y = +year;
  if (!m || !y || m < 1 || m > 12) throw app_error('month (1-12) and year are required');
  return { start: new Date(y, m - 1, 1), end: new Date(y, m, 1) };
}

// ── Work Attribution ─────────────────────────────────────────────────────────
async function get_work_logs({ where, start, end }) {
  return prisma.task_time_logs.findMany({
    take: 5000,
    where: { ...where, logged_at: { gte: start, lt: end } },
    include: {
      business_activity: { select: { id: true, name: true, default_billable: true, feeds_layer: true } },
      task: { select: { id: true, project_id: true } },
    },
  });
}

function summarize_work(logs) {
  const total_seconds = logs.reduce((s, l) => s + l.seconds, 0);
  const billable_seconds = logs
    .filter((l) => (l.business_activity ? l.business_activity.default_billable : true))
    .reduce((s, l) => s + l.seconds, 0);
  const value_seconds = logs
    .filter((l) => l.business_activity?.feeds_layer === 'VALUE')
    .reduce((s, l) => s + l.seconds, 0);

  const by_activity = new Map();
  for (const l of logs) {
    const key = l.business_activity?.name || 'Unclassified';
    by_activity.set(key, (by_activity.get(key) || 0) + l.seconds);
  }

  const to_hours = (s) => Math.round((s / 3600) * 100) / 100;
  return {
    total_hours: to_hours(total_seconds),
    billable_hours: to_hours(billable_seconds),
    value_hours: to_hours(value_seconds),
    utilization_pct: total_seconds > 0 ? Math.round((billable_seconds / total_seconds) * 1000) / 10 : 0,
    hours_by_activity: Array.from(by_activity.entries()).map(([name, seconds]) => ({ name, hours: to_hours(seconds) })),
  };
}

// ── Revenue Attribution ──────────────────────────────────────────────────────
// A project's total invoiced revenue is split across employees who logged time
// on it in the period, proportional to each employee's share of hours logged on
// that project in the period (time-share allocation — the default allocation
// method per Business Unit Rules, §11.4). Lifetime project revenue is used as
// the pool (no time-bucketed revenue recognition exists yet — flagged, not
// invented) while the *split* is period-scoped.
async function attribute_revenue_by_time_share(logs) {
  const project_ids = [...new Set(logs.map((l) => l.task.project_id).filter(Boolean))];
  if (project_ids.length === 0) return { attributed_amount: 0, by_project: [] };

  const [invoices, all_logs_on_projects] = await Promise.all([
    prisma.crm_invoices.groupBy({ by: ['project_id'], where: { project_id: { in: project_ids } }, _sum: { amount: true } }),
    prisma.task_time_logs.findMany({
      take: 5000,
      where: { task: { project_id: { in: project_ids } } },
      select: { seconds: true, task: { select: { project_id: true } } },
    }),
  ]);

  const revenue_by_project = new Map(invoices.map((i) => [i.project_id, i._sum.amount || 0]));
  const total_seconds_by_project = new Map();
  for (const l of all_logs_on_projects) {
    const pid = l.task.project_id;
    total_seconds_by_project.set(pid, (total_seconds_by_project.get(pid) || 0) + l.seconds);
  }
  const employee_seconds_by_project = new Map();
  for (const l of logs) {
    const pid = l.task.project_id;
    if (!pid) continue;
    employee_seconds_by_project.set(pid, (employee_seconds_by_project.get(pid) || 0) + l.seconds);
  }

  let attributed_amount = 0;
  const by_project = [];
  for (const [pid, emp_seconds] of employee_seconds_by_project) {
    const project_revenue = revenue_by_project.get(pid) || 0;
    const total_seconds = total_seconds_by_project.get(pid) || 0;
    const share = total_seconds > 0 ? emp_seconds / total_seconds : 0;
    const amount = Math.round(project_revenue * share * 100) / 100;
    attributed_amount += amount;
    by_project.push({ project_id: pid, project_revenue, time_share_pct: Math.round(share * 1000) / 10, attributed_amount: amount });
  }
  return { attributed_amount: Math.round(attributed_amount * 100) / 100, by_project };
}

// ── Cost Attribution ─────────────────────────────────────────────────────────
async function get_cost_for_users({ user_ids, month, year }) {
  const entries = await prisma.payroll_entries.findMany({
    take: 5000,
    where: { user_id: { in: user_ids }, run: { period_month: +month, period_year: +year } },
    select: { user_id: true, gross_amount: true },
  });
  const by_user = new Map();
  for (const e of entries) by_user.set(e.user_id, (by_user.get(e.user_id) || 0) + e.gross_amount);
  return by_user;
}

// ── Employee Performance (Milestone 4) ───────────────────────────────────────
export async function get_employee_performance(user_id, { month, year }) {
  const user = await prisma.users.findUnique({ where: { id: user_id }, select: { id: true, first_name: true, last_name: true, department_id: true, business_unit: true } });
  if (!user) throw app_error('Employee not found', 404);

  const { start, end } = month_bounds(month, year);
  const logs = await get_work_logs({ where: { user_id }, start, end });
  const work = summarize_work(logs);
  const revenue = await attribute_revenue_by_time_share(logs);
  const cost_by_user = await get_cost_for_users({ user_ids: [user_id], month, year });
  const cost = cost_by_user.get(user_id) || 0;

  return {
    user_id, name: `${user.first_name} ${user.last_name}`.trim(),
    department_id: user.department_id, business_unit: user.business_unit,
    period: { month: +month, year: +year },
    work, revenue, cost,
  };
}

// ── Project / Client / Department / Business Unit Performance (Milestone 5) ──
// Rollups only — reuse the same work/revenue/cost primitives above, grouped by
// a different dimension. No new calculation logic, per the roadmap's own note.

export async function get_project_performance(project_id, { month, year }) {
  const project = await prisma.projects.findUnique({ where: { id: project_id }, select: { id: true, title: true, client_name: true, project_type: true } });
  if (!project) throw app_error('Project not found', 404);

  const { start, end } = month_bounds(month, year);
  const logs = await get_work_logs({ where: { task: { project_id } }, start, end });
  const work = summarize_work(logs);
  const revenue_agg = await prisma.crm_invoices.aggregate({ where: { project_id }, _sum: { amount: true } });
  const revenue = revenue_agg._sum.amount || 0;

  const user_ids = [...new Set(logs.map((l) => l.user_id))];
  let cost = 0;
  if (user_ids.length > 0) {
    const cost_by_user = await get_cost_for_users({ user_ids, month, year });
    // Each employee's cost is prorated by their share of hours on THIS project
    // vs. their total hours that period, mirroring the revenue time-share logic
    // symmetrically — an employee who split their month across projects only
    // contributes the cost fraction attributable to this one.
    const all_logs = await get_work_logs({ where: { user_id: { in: user_ids } }, start, end });
    const total_seconds_by_user = new Map();
    for (const l of all_logs) total_seconds_by_user.set(l.user_id, (total_seconds_by_user.get(l.user_id) || 0) + l.seconds);
    const project_seconds_by_user = new Map();
    for (const l of logs) project_seconds_by_user.set(l.user_id, (project_seconds_by_user.get(l.user_id) || 0) + l.seconds);
    for (const uid of user_ids) {
      const total_s = total_seconds_by_user.get(uid) || 0;
      const proj_s = project_seconds_by_user.get(uid) || 0;
      const share = total_s > 0 ? proj_s / total_s : 0;
      cost += (cost_by_user.get(uid) || 0) * share;
    }
  }

  return {
    project_id, title: project.title, client_name: project.client_name, project_type: project.project_type,
    period: { month: +month, year: +year },
    work, revenue, cost: Math.round(cost * 100) / 100, contributor_count: user_ids.length,
  };
}

export async function get_client_performance(client_account_id, { month, year }) {
  const client = await prisma.client_accounts.findUnique({ where: { id: client_account_id }, select: { id: true, name: true } });
  if (!client) throw app_error('Client account not found', 404);

  const [access_rows, invoice_projects] = await Promise.all([
    prisma.client_project_access.findMany({ where: { client_id: client_account_id }, select: { project_id: true } }),
    prisma.crm_invoices.findMany({ where: { client_account_id, project_id: { not: null } }, select: { project_id: true }, distinct: ['project_id'] }),
  ]);
  const project_ids = [...new Set([...access_rows.map((r) => r.project_id), ...invoice_projects.map((r) => r.project_id)])];

  const revenue_agg = await prisma.crm_invoices.aggregate({ where: { client_account_id }, _sum: { amount: true } });
  const revenue = revenue_agg._sum.amount || 0;

  let cost = 0;
  if (project_ids.length > 0) {
    const project_performances = await Promise.all(project_ids.map((pid) => get_project_performance(pid, { month, year }).catch(() => null)));
    cost = project_performances.filter(Boolean).reduce((s, p) => s + p.cost, 0);
  }

  return {
    client_account_id, name: client.name,
    period: { month: +month, year: +year },
    project_count: project_ids.length, revenue, cost: Math.round(cost * 100) / 100,
  };
}

export async function get_department_performance(department_id, { month, year }) {
  const department = await prisma.departments.findUnique({ where: { id: department_id }, select: { id: true, name: true } });
  if (!department) throw app_error('Department not found', 404);

  const users = await prisma.users.findMany({ where: { department_id, deleted_at: null, is_active: true }, select: { id: true } });
  const user_ids = users.map((u) => u.id);
  if (user_ids.length === 0) {
    return { department_id, name: department.name, period: { month: +month, year: +year }, employee_count: 0, work: summarize_work([]), revenue: { attributed_amount: 0, by_project: [] }, cost: 0 };
  }

  const { start, end } = month_bounds(month, year);
  const logs = await get_work_logs({ where: { user_id: { in: user_ids } }, start, end });
  const work = summarize_work(logs);
  const revenue = await attribute_revenue_by_time_share(logs);
  const cost_by_user = await get_cost_for_users({ user_ids, month, year });
  const cost = [...cost_by_user.values()].reduce((s, v) => s + v, 0);

  return { department_id, name: department.name, period: { month: +month, year: +year }, employee_count: user_ids.length, work, revenue, cost: Math.round(cost * 100) / 100 };
}

export async function get_business_unit_performance(business_unit, { month, year }) {
  const users = await prisma.users.findMany({ where: { business_unit, deleted_at: null, is_active: true }, select: { id: true } });
  const user_ids = users.map((u) => u.id);
  if (user_ids.length === 0) {
    return { business_unit, period: { month: +month, year: +year }, employee_count: 0, work: summarize_work([]), revenue: { attributed_amount: 0, by_project: [] }, cost: 0 };
  }

  const { start, end } = month_bounds(month, year);
  const logs = await get_work_logs({ where: { user_id: { in: user_ids } }, start, end });
  const work = summarize_work(logs);
  const revenue = await attribute_revenue_by_time_share(logs);
  const cost_by_user = await get_cost_for_users({ user_ids, month, year });
  const cost = [...cost_by_user.values()].reduce((s, v) => s + v, 0);

  return { business_unit, period: { month: +month, year: +year }, employee_count: user_ids.length, work, revenue, cost: Math.round(cost * 100) / 100 };
}
