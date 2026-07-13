/**
 * Enterprise Performance Platform — Project/Client/Department/Business-Unit
 * rollup integration tests. Run with:
 *   node --test tests/enterprise-performance/rollups.test.js
 *
 * Fixture-based against the real dev database (see employee-performance.test.js
 * for why: these functions are Prisma-coupled end to end, no mock seam exists).
 * Period 2031-04 is reserved for this file only.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import prisma from '../../src/shared/database/client.js';
import {
  get_project_performance,
  get_client_performance,
  get_department_performance,
  get_business_unit_performance,
} from '../../src/modules/enterprise-performance/services/enterprise-performance.service.js';

const PERIOD = { month: 4, year: 2031 };
const PERIOD_START = new Date(PERIOD.year, PERIOD.month - 1, 15);
const ACTIVITY_ID = 'ba_delivery';

function uniq(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

async function make_user(prefix, extra = {}) {
  return prisma.users.create({
    data: { email: `${uniq(prefix)}@fixture.test`, password_hash: 'x', first_name: prefix, last_name: 'Fixture', is_active: true, ...extra },
  });
}

async function make_department(prefix) {
  return prisma.departments.create({ data: { name: uniq(prefix) } });
}

async function make_project(prefix) {
  return prisma.projects.create({ data: { title: uniq(prefix), project_type: 'CLIENT', status: 'IN_PROGRESS' } });
}

async function make_invoice(project_id, amount, client_account_id) {
  return prisma.crm_invoices.create({
    data: { project_id, amount, status: 'PAID', invoice_number: uniq('INV'), title: 'Fixture Invoice', client_account_id },
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

async function cleanup({ payroll_runs = [], time_logs = [], tasks = [], invoices = [], projects = [], users = [], departments = [], client_accounts = [] } = {}) {
  for (const p of payroll_runs) await prisma.payroll_entries.deleteMany({ where: { run_id: p.id } }).catch(() => {});
  for (const p of payroll_runs) await prisma.payroll_runs.delete({ where: { id: p.id } }).catch(() => {});
  for (const l of time_logs) await prisma.task_time_logs.delete({ where: { id: l.id } }).catch(() => {});
  for (const t of tasks) await prisma.tasks.delete({ where: { id: t.id } }).catch(() => {});
  for (const inv of invoices) await prisma.crm_invoices.delete({ where: { id: inv.id } }).catch(() => {});
  for (const p of projects) await prisma.projects.delete({ where: { id: p.id } }).catch(() => {});
  for (const u of users) await prisma.users.delete({ where: { id: u.id } }).catch(() => {});
  for (const d of departments) await prisma.departments.delete({ where: { id: d.id } }).catch(() => {});
  for (const c of client_accounts) await prisma.client_accounts.delete({ where: { id: c.id } }).catch(() => {});
}

describe('Enterprise Performance — Project rollup', () => {
  it('prorates cost across multiple contributors by their share of hours on this project vs. their total hours that period', async () => {
    const fixtures = { payroll_runs: [], time_logs: [], tasks: [], invoices: [], projects: [], users: [] };
    try {
      const employee_x = await make_user('PrjX'); fixtures.users.push(employee_x);
      const employee_y = await make_user('PrjY'); fixtures.users.push(employee_y);

      const project_a = await make_project('RollA'); fixtures.projects.push(project_a);
      const project_b = await make_project('RollB'); fixtures.projects.push(project_b);
      fixtures.invoices.push(await make_invoice(project_a.id, 10000));
      fixtures.invoices.push(await make_invoice(project_b.id, 5000));

      const task_a = await make_task(project_a.id); fixtures.tasks.push(task_a);
      const task_b = await make_task(project_b.id); fixtures.tasks.push(task_b);

      // X: 6h on A, 5h on B (11h total). Y: 4h on A only.
      fixtures.time_logs.push(await log_time(task_a.id, employee_x.id, 6));
      fixtures.time_logs.push(await log_time(task_b.id, employee_x.id, 5));
      fixtures.time_logs.push(await log_time(task_a.id, employee_y.id, 4));

      const payroll_x = await make_payroll(employee_x.id, 1100); fixtures.payroll_runs.push(payroll_x.run);
      const payroll_y = await make_payroll(employee_y.id, 400); fixtures.payroll_runs.push(payroll_y.run);

      const perf_a = await get_project_performance(project_a.id, PERIOD);
      assert.equal(perf_a.work.total_hours, 10); // 6 (X) + 4 (Y)
      assert.equal(perf_a.revenue, 10000);
      // X's cost on A = 1100 * (6/11) = 600; Y's cost on A = 400 * (4/4) = 400.
      assert.equal(perf_a.cost, 1000);
      assert.equal(perf_a.contributor_count, 2);

      const perf_b = await get_project_performance(project_b.id, PERIOD);
      assert.equal(perf_b.work.total_hours, 5);
      assert.equal(perf_b.revenue, 5000);
      // X's cost on B = 1100 * (5/11) = 500.
      assert.equal(perf_b.cost, 500);
      assert.equal(perf_b.contributor_count, 1);
    } finally {
      await cleanup(fixtures);
    }
  });

  it('throws a 404 for a nonexistent project', async () => {
    await assert.rejects(
      () => get_project_performance('nonexistent-project-xyz', PERIOD),
      (err) => { assert.equal(err.status_code, 404); return true; }
    );
  });
});

describe('Enterprise Performance — Client rollup', () => {
  it('sums invoices directly and rolls up linked-project costs', async () => {
    const fixtures = { payroll_runs: [], time_logs: [], tasks: [], invoices: [], projects: [], users: [], client_accounts: [] };
    try {
      const client = await prisma.client_accounts.create({ data: { name: uniq('Client') } });
      fixtures.client_accounts.push(client);

      const employee = await make_user('ClientEmp'); fixtures.users.push(employee);
      const project = await make_project('ClientProj'); fixtures.projects.push(project);
      fixtures.invoices.push(await make_invoice(project.id, 8000, client.id));

      const task = await make_task(project.id); fixtures.tasks.push(task);
      fixtures.time_logs.push(await log_time(task.id, employee.id, 8));

      const payroll = await make_payroll(employee.id, 1600); fixtures.payroll_runs.push(payroll.run);

      const perf = await get_client_performance(client.id, PERIOD);
      assert.equal(perf.revenue, 8000);
      assert.equal(perf.project_count, 1);
      assert.equal(perf.cost, 1600); // sole contributor, 100% share
    } finally {
      await cleanup(fixtures);
    }
  });

  it('throws a 404 for a nonexistent client account', async () => {
    await assert.rejects(
      () => get_client_performance('nonexistent-client-xyz', PERIOD),
      (err) => { assert.equal(err.status_code, 404); return true; }
    );
  });
});

describe('Enterprise Performance — Department rollup', () => {
  it('rolls up work/revenue/cost for all active employees in the department', async () => {
    const fixtures = { payroll_runs: [], time_logs: [], tasks: [], invoices: [], projects: [], users: [], departments: [] };
    try {
      const department = await make_department('Dept'); fixtures.departments.push(department);
      const employee = await make_user('DeptEmp', { department_id: department.id }); fixtures.users.push(employee);

      const project = await make_project('DeptProj'); fixtures.projects.push(project);
      fixtures.invoices.push(await make_invoice(project.id, 4000));
      const task = await make_task(project.id); fixtures.tasks.push(task);
      fixtures.time_logs.push(await log_time(task.id, employee.id, 4));
      const payroll = await make_payroll(employee.id, 800); fixtures.payroll_runs.push(payroll.run);

      const perf = await get_department_performance(department.id, PERIOD);
      assert.equal(perf.employee_count, 1);
      assert.equal(perf.work.total_hours, 4);
      assert.equal(perf.revenue.attributed_amount, 4000);
      assert.equal(perf.cost, 800);
    } finally {
      await cleanup(fixtures);
    }
  });

  it('returns a zero-shaped result for a department with no active employees', async () => {
    const fixtures = { departments: [] };
    try {
      const department = await make_department('EmptyDept'); fixtures.departments.push(department);
      const perf = await get_department_performance(department.id, PERIOD);
      assert.equal(perf.employee_count, 0);
      assert.equal(perf.work.total_hours, 0);
      assert.equal(perf.revenue.attributed_amount, 0);
      assert.equal(perf.cost, 0);
    } finally {
      await cleanup(fixtures);
    }
  });

  it('throws a 404 for a nonexistent department', async () => {
    await assert.rejects(
      () => get_department_performance('nonexistent-department-xyz', PERIOD),
      (err) => { assert.equal(err.status_code, 404); return true; }
    );
  });
});

describe('Enterprise Performance — Business Unit rollup', () => {
  it('rolls up work/revenue/cost for all active users tagged with the business unit', async () => {
    const fixtures = { payroll_runs: [], time_logs: [], tasks: [], invoices: [], projects: [], users: [] };
    const business_unit = uniq('TESTBU');
    try {
      const employee = await make_user('BuEmp', { business_unit }); fixtures.users.push(employee);
      const project = await make_project('BuProj'); fixtures.projects.push(project);
      fixtures.invoices.push(await make_invoice(project.id, 3000));
      const task = await make_task(project.id); fixtures.tasks.push(task);
      fixtures.time_logs.push(await log_time(task.id, employee.id, 3));
      const payroll = await make_payroll(employee.id, 600); fixtures.payroll_runs.push(payroll.run);

      const perf = await get_business_unit_performance(business_unit, PERIOD);
      assert.equal(perf.employee_count, 1);
      assert.equal(perf.work.total_hours, 3);
      assert.equal(perf.revenue.attributed_amount, 3000);
      assert.equal(perf.cost, 600);
    } finally {
      await cleanup(fixtures);
    }
  });

  it('returns a zero-shaped result for a business unit with no tagged users', async () => {
    const perf = await get_business_unit_performance(uniq('NOBODY'), PERIOD);
    assert.equal(perf.employee_count, 0);
    assert.equal(perf.work.total_hours, 0);
    assert.equal(perf.revenue.attributed_amount, 0);
    assert.equal(perf.cost, 0);
  });
});
