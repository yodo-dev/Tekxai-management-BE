/**
 * Enterprise Performance Platform — Employee Performance integration tests.
 * Run with: node --test tests/enterprise-performance/employee-performance.test.js
 *
 * These are fixture-based integration tests against the real dev database —
 * this module's calculations (time-share revenue attribution, cost from
 * payroll, work summarization) are Prisma-coupled end to end, so there is no
 * seam to mock. Each test creates its own rows with a unique email/id prefix,
 * asserts against the real exported service function, and deletes everything
 * it created in a `finally` block. Period 2031-03 is reserved for this file
 * only, so it never collides with real data or other test files' fixtures.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import prisma from '../../src/shared/database/client.js';
import { get_employee_performance } from '../../src/modules/enterprise-performance/services/enterprise-performance.service.js';

const PERIOD = { month: 3, year: 2031 };
const PERIOD_START = new Date(PERIOD.year, PERIOD.month - 1, 15);
const ACTIVITY_ID = 'ba_delivery'; // seeded, default_billable: true

function uniq(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

async function make_user(prefix) {
  return prisma.users.create({
    data: {
      email: `${uniq(prefix)}@fixture.test`,
      password_hash: 'x',
      first_name: prefix,
      last_name: 'Fixture',
      is_active: true,
    },
  });
}

async function make_project(prefix) {
  return prisma.projects.create({
    data: { title: uniq(prefix), project_type: 'CLIENT', status: 'IN_PROGRESS' },
  });
}

async function make_invoice(project_id, amount) {
  return prisma.crm_invoices.create({
    data: { project_id, amount, status: 'PAID', invoice_number: uniq('INV'), title: 'Fixture Invoice' },
  });
}

async function make_task(project_id) {
  return prisma.tasks.create({ data: { project_id, title: 'Fixture Task', status: 'IN_PROGRESS' } });
}

async function log_time(task_id, user_id, hours) {
  return prisma.task_time_logs.create({
    data: { task_id, user_id, seconds: hours * 3600, logged_at: PERIOD_START, business_activity_id: ACTIVITY_ID },
  });
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

async function cleanup({ payroll_runs = [], time_logs = [], tasks = [], invoices = [], projects = [], users = [] } = {}) {
  for (const p of payroll_runs) await prisma.payroll_entries.deleteMany({ where: { run_id: p.id } }).catch(() => {});
  for (const p of payroll_runs) await prisma.payroll_runs.delete({ where: { id: p.id } }).catch(() => {});
  for (const l of time_logs) await prisma.task_time_logs.delete({ where: { id: l.id } }).catch(() => {});
  for (const t of tasks) await prisma.tasks.delete({ where: { id: t.id } }).catch(() => {});
  for (const inv of invoices) await prisma.crm_invoices.delete({ where: { id: inv.id } }).catch(() => {});
  for (const p of projects) await prisma.projects.delete({ where: { id: p.id } }).catch(() => {});
  for (const u of users) await prisma.users.delete({ where: { id: u.id } }).catch(() => {});
}

describe('Enterprise Performance — Employee Performance', () => {
  it('attributes revenue by time-share across multiple contributors and multiple projects, and pulls cost from payroll', async () => {
    const fixtures = { payroll_runs: [], time_logs: [], tasks: [], invoices: [], projects: [], users: [] };
    try {
      const employee_x = await make_user('EmpX'); fixtures.users.push(employee_x);
      const employee_y = await make_user('EmpY'); fixtures.users.push(employee_y);

      const project_a = await make_project('ProjA'); fixtures.projects.push(project_a);
      const project_b = await make_project('ProjB'); fixtures.projects.push(project_b);

      const invoice_a = await make_invoice(project_a.id, 10000); fixtures.invoices.push(invoice_a);
      const invoice_b = await make_invoice(project_b.id, 5000); fixtures.invoices.push(invoice_b);

      const task_a = await make_task(project_a.id); fixtures.tasks.push(task_a);
      const task_b = await make_task(project_b.id); fixtures.tasks.push(task_b);

      // Project A: X logs 6h, Y logs 4h (10h total) — 60/40 split.
      fixtures.time_logs.push(await log_time(task_a.id, employee_x.id, 6));
      fixtures.time_logs.push(await log_time(task_a.id, employee_y.id, 4));
      // Project B: X alone logs 5h — 100% share.
      fixtures.time_logs.push(await log_time(task_b.id, employee_x.id, 5));

      const payroll_x = await make_payroll(employee_x.id, 1100); fixtures.payroll_runs.push(payroll_x.run);
      const payroll_y = await make_payroll(employee_y.id, 400); fixtures.payroll_runs.push(payroll_y.run);

      const perf_x = await get_employee_performance(employee_x.id, PERIOD);
      // X: 6h on A + 5h on B = 11h total work, all billable (Delivery activity).
      assert.equal(perf_x.work.total_hours, 11);
      assert.equal(perf_x.work.billable_hours, 11);
      assert.equal(perf_x.work.utilization_pct, 100);
      // Revenue: A gives 10000 * (6/10) = 6000; B gives 5000 * (5/5) = 5000.
      assert.equal(perf_x.revenue.attributed_amount, 11000);
      assert.equal(perf_x.cost, 1100);

      const perf_y = await get_employee_performance(employee_y.id, PERIOD);
      assert.equal(perf_y.work.total_hours, 4);
      // Revenue: A gives 10000 * (4/10) = 4000.
      assert.equal(perf_y.revenue.attributed_amount, 4000);
      assert.equal(perf_y.cost, 400);
    } finally {
      await cleanup(fixtures);
    }
  });

  it('reflects payroll cost even when the employee logged no time in the period (revenue and work both zero)', async () => {
    const fixtures = { payroll_runs: [], users: [] };
    try {
      const employee = await make_user('NoLogs'); fixtures.users.push(employee);
      const payroll = await make_payroll(employee.id, 900); fixtures.payroll_runs.push(payroll.run);

      const perf = await get_employee_performance(employee.id, PERIOD);
      assert.equal(perf.work.total_hours, 0);
      assert.equal(perf.work.utilization_pct, 0); // division-by-zero guarded, not NaN
      assert.equal(perf.revenue.attributed_amount, 0);
      assert.equal(perf.cost, 900);
    } finally {
      await cleanup(fixtures);
    }
  });

  it('returns all-zero performance for an employee with no time logs and no payroll entry', async () => {
    const fixtures = { users: [] };
    try {
      const employee = await make_user('AllZero'); fixtures.users.push(employee);
      const perf = await get_employee_performance(employee.id, PERIOD);
      assert.equal(perf.work.total_hours, 0);
      assert.equal(perf.work.utilization_pct, 0);
      assert.equal(perf.revenue.attributed_amount, 0);
      assert.equal(perf.cost, 0);
    } finally {
      await cleanup(fixtures);
    }
  });

  it('throws a 404 for a nonexistent employee id', async () => {
    await assert.rejects(
      () => get_employee_performance('nonexistent-user-id-xyz', PERIOD),
      (err) => { assert.equal(err.status_code, 404); return true; }
    );
  });

  it('throws for an invalid month', async () => {
    const fixtures = { users: [] };
    try {
      const employee = await make_user('BadMonth'); fixtures.users.push(employee);
      await assert.rejects(() => get_employee_performance(employee.id, { month: 13, year: 2031 }));
      await assert.rejects(() => get_employee_performance(employee.id, { month: null, year: 2031 }));
    } finally {
      await cleanup(fixtures);
    }
  });
});
