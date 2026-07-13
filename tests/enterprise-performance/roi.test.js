/**
 * Enterprise Performance Platform — ROI Engine integration tests. Run with:
 *   node --test tests/enterprise-performance/roi.test.js
 *
 * Fixture-based against the real dev database — roi.service.js composes
 * enterprise-performance's Prisma-coupled output directly, so there is no
 * seam to mock. Period 2031-05 is reserved for this file only.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import prisma from '../../src/shared/database/client.js';
import { get_employee_roi, get_project_roi, get_client_roi } from '../../src/modules/roi/services/roi.service.js';

const PERIOD = { month: 5, year: 2031 };
const NO_ACTIVITY_PERIOD = { month: 6, year: 1999 }; // guaranteed no real payroll/logs in the distant past
const PERIOD_START = new Date(PERIOD.year, PERIOD.month - 1, 15);
const ACTIVITY_ID = 'ba_delivery';

function uniq(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

async function make_user(prefix) {
  return prisma.users.create({ data: { email: `${uniq(prefix)}@fixture.test`, password_hash: 'x', first_name: prefix, last_name: 'Fixture', is_active: true } });
}
async function make_project(prefix) {
  return prisma.projects.create({ data: { title: uniq(prefix), project_type: 'CLIENT', status: 'IN_PROGRESS' } });
}
async function make_invoice(project_id, amount, client_account_id) {
  return prisma.crm_invoices.create({ data: { project_id, amount, status: 'PAID', invoice_number: uniq('INV'), title: 'Fixture Invoice', client_account_id } });
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

async function cleanup({ payroll_runs = [], time_logs = [], tasks = [], invoices = [], projects = [], users = [], client_accounts = [] } = {}) {
  for (const p of payroll_runs) await prisma.payroll_entries.deleteMany({ where: { run_id: p.id } }).catch(() => {});
  for (const p of payroll_runs) await prisma.payroll_runs.delete({ where: { id: p.id } }).catch(() => {});
  for (const l of time_logs) await prisma.task_time_logs.delete({ where: { id: l.id } }).catch(() => {});
  for (const t of tasks) await prisma.tasks.delete({ where: { id: t.id } }).catch(() => {});
  for (const inv of invoices) await prisma.crm_invoices.delete({ where: { id: inv.id } }).catch(() => {});
  for (const p of projects) await prisma.projects.delete({ where: { id: p.id } }).catch(() => {});
  for (const u of users) await prisma.users.delete({ where: { id: u.id } }).catch(() => {});
  for (const c of client_accounts) await prisma.client_accounts.delete({ where: { id: c.id } }).catch(() => {});
}

describe('ROI Engine — Employee ROI', () => {
  it('computes roi = revenue / cost with correct rounding and percent', async () => {
    const fixtures = { payroll_runs: [], time_logs: [], tasks: [], invoices: [], projects: [], users: [] };
    try {
      const employee = await make_user('RoiEmp'); fixtures.users.push(employee);
      const project = await make_project('RoiProj'); fixtures.projects.push(project);
      fixtures.invoices.push(await make_invoice(project.id, 9000));
      const task = await make_task(project.id); fixtures.tasks.push(task);
      fixtures.time_logs.push(await log_time(task.id, employee.id, 9));
      const payroll = await make_payroll(employee.id, 3000); fixtures.payroll_runs.push(payroll.run);

      const roi = await get_employee_roi(employee.id, PERIOD);
      assert.equal(roi.revenue.attributed_amount, 9000);
      assert.equal(roi.cost, 3000);
      assert.equal(roi.roi, 3);
      assert.equal(roi.roi_percent, 300);
      assert.equal(roi.basis, 'revenue_over_cost');
    } finally {
      await cleanup(fixtures);
    }
  });

  it('returns null with basis cost_data_unavailable when there is revenue but zero cost', async () => {
    const fixtures = { time_logs: [], tasks: [], invoices: [], projects: [], users: [] };
    try {
      const employee = await make_user('NoCost'); fixtures.users.push(employee);
      const project = await make_project('NoCostProj'); fixtures.projects.push(project);
      fixtures.invoices.push(await make_invoice(project.id, 5000));
      const task = await make_task(project.id); fixtures.tasks.push(task);
      fixtures.time_logs.push(await log_time(task.id, employee.id, 5));
      // Deliberately no payroll entry for this employee/period.

      const roi = await get_employee_roi(employee.id, PERIOD);
      assert.equal(roi.revenue.attributed_amount, 5000);
      assert.equal(roi.cost, 0);
      assert.equal(roi.roi, null);
      assert.equal(roi.roi_percent, null);
      assert.equal(roi.basis, 'cost_data_unavailable');
    } finally {
      await cleanup(fixtures);
    }
  });

  it('returns null with basis no_activity when there is neither revenue nor cost', async () => {
    const fixtures = { users: [] };
    try {
      const employee = await make_user('NoActivity'); fixtures.users.push(employee);
      const roi = await get_employee_roi(employee.id, NO_ACTIVITY_PERIOD);
      assert.equal(roi.revenue.attributed_amount, 0);
      assert.equal(roi.cost, 0);
      assert.equal(roi.roi, null);
      assert.equal(roi.basis, 'no_activity');
    } finally {
      await cleanup(fixtures);
    }
  });
});

describe('ROI Engine — Project & Client ROI', () => {
  it('project ROI matches the project performance revenue/cost ratio', async () => {
    const fixtures = { payroll_runs: [], time_logs: [], tasks: [], invoices: [], projects: [], users: [] };
    try {
      const employee = await make_user('PRoiEmp'); fixtures.users.push(employee);
      const project = await make_project('PRoiProj'); fixtures.projects.push(project);
      fixtures.invoices.push(await make_invoice(project.id, 6000));
      const task = await make_task(project.id); fixtures.tasks.push(task);
      fixtures.time_logs.push(await log_time(task.id, employee.id, 6));
      const payroll = await make_payroll(employee.id, 2000); fixtures.payroll_runs.push(payroll.run);

      const roi = await get_project_roi(project.id, PERIOD);
      assert.equal(roi.revenue, 6000);
      assert.equal(roi.cost, 2000);
      assert.equal(roi.roi, 3);
      assert.equal(roi.basis, 'revenue_over_cost');
    } finally {
      await cleanup(fixtures);
    }
  });

  it('client ROI matches the client performance revenue/cost ratio', async () => {
    const fixtures = { payroll_runs: [], time_logs: [], tasks: [], invoices: [], projects: [], users: [], client_accounts: [] };
    try {
      const client = await prisma.client_accounts.create({ data: { name: uniq('RoiClient') } });
      fixtures.client_accounts.push(client);
      const employee = await make_user('CRoiEmp'); fixtures.users.push(employee);
      const project = await make_project('CRoiProj'); fixtures.projects.push(project);
      fixtures.invoices.push(await make_invoice(project.id, 4000, client.id));
      const task = await make_task(project.id); fixtures.tasks.push(task);
      fixtures.time_logs.push(await log_time(task.id, employee.id, 4));
      const payroll = await make_payroll(employee.id, 1000); fixtures.payroll_runs.push(payroll.run);

      const roi = await get_client_roi(client.id, PERIOD);
      assert.equal(roi.revenue, 4000);
      assert.equal(roi.cost, 1000);
      assert.equal(roi.roi, 4);
      assert.equal(roi.basis, 'revenue_over_cost');
    } finally {
      await cleanup(fixtures);
    }
  });
});
