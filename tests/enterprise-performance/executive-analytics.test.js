/**
 * Enterprise Performance Platform — Executive Analytics integration tests.
 * Run with: node --test tests/enterprise-performance/executive-analytics.test.js
 *
 * Fixture-based against the real dev database — executive-analytics composes
 * the Post-Sales Dashboard plus the Performance/ROI engines, all Prisma-coupled,
 * so there is no seam to mock. Period 2031-06 is reserved for this file's
 * ranking/rollup fixtures; other assertions use dates outside any real data
 * range so they stay deterministic.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import prisma from '../../src/shared/database/client.js';
import { get_executive_dashboard } from '../../src/modules/executive-analytics/services/executive-analytics.service.js';
import { get_post_sales_dashboard } from '../../src/modules/crm/services/post-sales-dashboard.service.js';

const PERIOD = { month: 6, year: 2031 };
const NO_ACTIVITY_PERIOD = { month: 1, year: 1998 };
const PERIOD_START = new Date(PERIOD.year, PERIOD.month - 1, 15);
const ACTIVITY_ID = 'ba_delivery';

function uniq(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

async function make_user(prefix, extra = {}) {
  return prisma.users.create({ data: { email: `${uniq(prefix)}@fixture.test`, password_hash: 'x', first_name: prefix, last_name: 'Fixture', is_active: true, ...extra } });
}
async function make_project(prefix) {
  return prisma.projects.create({ data: { title: uniq(prefix), project_type: 'CLIENT', status: 'IN_PROGRESS' } });
}
async function make_invoice(project_id, amount) {
  return prisma.crm_invoices.create({ data: { project_id, amount, status: 'PAID', invoice_number: uniq('INV'), title: 'Fixture Invoice' } });
}
async function make_task(project_id) {
  return prisma.tasks.create({ data: { project_id, title: 'Fixture Task', status: 'IN_PROGRESS' } });
}
async function log_time(task_id, user_id, hours) {
  return prisma.task_time_logs.create({ data: { task_id, user_id, seconds: hours * 3600, logged_at: PERIOD_START, business_activity_id: ACTIVITY_ID } });
}
// payroll_runs has a global @@unique([period_month, period_year]) — only one
// run can exist per calendar month, shared across every employee's entries —
// so fixtures must upsert the run rather than creating a fresh one per employee.
async function get_or_create_run(period) {
  return prisma.payroll_runs.upsert({
    where: { period_month_period_year: { period_month: period.month, period_year: period.year } },
    update: {},
    create: { period_month: period.month, period_year: period.year, status: 'DRAFT' },
  });
}

async function make_payroll(user_id, gross_amount) {
  const run = await get_or_create_run(PERIOD);
  const entry = await prisma.payroll_entries.create({ data: { run_id: run.id, user_id, gross_amount, net_amount: gross_amount } });
  return { run, entry };
}

async function cleanup({ payroll_runs = [], time_logs = [], tasks = [], invoices = [], projects = [], users = [], business_unit_rules = [] } = {}) {
  for (const p of payroll_runs) await prisma.payroll_entries.deleteMany({ where: { run_id: p.id } }).catch(() => {});
  for (const p of payroll_runs) await prisma.payroll_runs.delete({ where: { id: p.id } }).catch(() => {});
  for (const l of time_logs) await prisma.task_time_logs.delete({ where: { id: l.id } }).catch(() => {});
  for (const t of tasks) await prisma.tasks.delete({ where: { id: t.id } }).catch(() => {});
  for (const inv of invoices) await prisma.crm_invoices.delete({ where: { id: inv.id } }).catch(() => {});
  for (const p of projects) await prisma.projects.delete({ where: { id: p.id } }).catch(() => {});
  for (const u of users) await prisma.users.delete({ where: { id: u.id } }).catch(() => {});
  for (const r of business_unit_rules) await prisma.business_unit_rules.delete({ where: { id: r.id } }).catch(() => {});
}

describe('Executive Analytics — dashboard composition fidelity', () => {
  it('reuses the Post-Sales Dashboard sections verbatim, with no duplicated calculation', async () => {
    const [dashboard, post_sales] = await Promise.all([
      get_executive_dashboard(PERIOD),
      get_post_sales_dashboard(),
    ]);
    assert.deepEqual(dashboard.capacity, post_sales.resource_overview);
    assert.deepEqual(dashboard.delivery_health, post_sales.project_health);
    assert.deepEqual(dashboard.client_health, post_sales.client_success);
    assert.deepEqual(dashboard.top_kpis, post_sales.top_kpis);
  });
});

describe('Executive Analytics — performance summary', () => {
  it('includes a company-wide ROI rollup for every active business unit rule', async () => {
    const fixtures = { payroll_runs: [], time_logs: [], tasks: [], invoices: [], projects: [], users: [], business_unit_rules: [] };
    const business_unit = uniq('EXECBU');
    try {
      const rule = await prisma.business_unit_rules.create({ data: { business_unit } });
      fixtures.business_unit_rules.push(rule);

      const employee = await make_user('BuRollup', { business_unit }); fixtures.users.push(employee);
      const project = await make_project('BuRollupProj'); fixtures.projects.push(project);
      fixtures.invoices.push(await make_invoice(project.id, 2000));
      const task = await make_task(project.id); fixtures.tasks.push(task);
      fixtures.time_logs.push(await log_time(task.id, employee.id, 2));
      const payroll = await make_payroll(employee.id, 500); fixtures.payroll_runs.push(payroll.run);

      const dashboard = await get_executive_dashboard(PERIOD);
      const bu_row = dashboard.performance_summary.company_roi_by_business_unit.find((r) => r.business_unit === business_unit);
      assert.ok(bu_row, 'expected our test business unit to appear in the rollup');
      assert.equal(bu_row.revenue, 2000);
      assert.equal(bu_row.cost, 500);
      assert.equal(bu_row.roi, 4);
    } finally {
      await cleanup(fixtures);
    }
  });

  it('ranks top and bottom performers by ROI, excluding employees with no cost data', async () => {
    const fixtures = { payroll_runs: [], time_logs: [], tasks: [], invoices: [], projects: [], users: [] };
    try {
      // A: roi 10, B: roi 3, C: roi 1 — all real revenue_over_cost entries.
      const employee_a = await make_user('RankA'); fixtures.users.push(employee_a);
      const employee_b = await make_user('RankB'); fixtures.users.push(employee_b);
      const employee_c = await make_user('RankC'); fixtures.users.push(employee_c);
      // D: has revenue but no payroll cost — must be excluded from ranking entirely.
      const employee_d = await make_user('RankD'); fixtures.users.push(employee_d);

      const project_a = await make_project('RankProjA'); fixtures.projects.push(project_a);
      const project_b = await make_project('RankProjB'); fixtures.projects.push(project_b);
      const project_c = await make_project('RankProjC'); fixtures.projects.push(project_c);
      const project_d = await make_project('RankProjD'); fixtures.projects.push(project_d);
      fixtures.invoices.push(await make_invoice(project_a.id, 5000));
      fixtures.invoices.push(await make_invoice(project_b.id, 3000));
      fixtures.invoices.push(await make_invoice(project_c.id, 1000));
      fixtures.invoices.push(await make_invoice(project_d.id, 1000));

      const task_a = await make_task(project_a.id); fixtures.tasks.push(task_a);
      const task_b = await make_task(project_b.id); fixtures.tasks.push(task_b);
      const task_c = await make_task(project_c.id); fixtures.tasks.push(task_c);
      const task_d = await make_task(project_d.id); fixtures.tasks.push(task_d);
      fixtures.time_logs.push(await log_time(task_a.id, employee_a.id, 5));
      fixtures.time_logs.push(await log_time(task_b.id, employee_b.id, 3));
      fixtures.time_logs.push(await log_time(task_c.id, employee_c.id, 1));
      fixtures.time_logs.push(await log_time(task_d.id, employee_d.id, 1));

      fixtures.payroll_runs.push((await make_payroll(employee_a.id, 500)).run);
      fixtures.payroll_runs.push((await make_payroll(employee_b.id, 1000)).run);
      fixtures.payroll_runs.push((await make_payroll(employee_c.id, 1000)).run);
      // No payroll entry for employee_d.

      const dashboard = await get_executive_dashboard(PERIOD);
      const { top_performers, bottom_performers } = dashboard.performance_summary;

      const ids_in_top = top_performers.map((p) => p.user_id);
      const ids_in_bottom = bottom_performers.map((p) => p.user_id);
      assert.ok(!ids_in_top.includes(employee_d.id), 'employee with no cost data must not be ranked');
      assert.ok(!ids_in_bottom.includes(employee_d.id));

      assert.equal(top_performers[0].user_id, employee_a.id);
      assert.equal(top_performers[0].roi, 10);
      assert.equal(bottom_performers[0].user_id, employee_c.id);
      assert.equal(bottom_performers[0].roi, 1);
    } finally {
      await cleanup(fixtures);
    }
  });

  it('returns an empty ranking with zero ranked_employee_count when nobody logged time in the period', async () => {
    const dashboard = await get_executive_dashboard(NO_ACTIVITY_PERIOD);
    assert.deepEqual(dashboard.performance_summary.top_performers, []);
    assert.deepEqual(dashboard.performance_summary.bottom_performers, []);
    assert.equal(dashboard.performance_summary.ranked_employee_count, 0);
  });
});
