import prisma from '../../shared/database/client.js';
import {
  compute_leave_days,
  expand_leave_day_set,
  count_absent_days,
  compute_late_deduction,
  compute_absence_penalty,
  to_day_key,
} from './payroll-attendance.helper.js';
function ok(res,p,m='OK',s=200){return res.status(s).json({success:true,message:m,payload:p});}
function fail(res,m,s=400){return res.status(s).json({success:false,message:m});}

// GET /payroll — list runs
export async function list_runs(req, res, next) {
  try {
    const runs = await prisma.payroll_runs.findMany({
      take: 500,
      orderBy: [{ period_year: 'desc' }, { period_month: 'desc' }],
      include: {
        _count: { select: { entries: true } },
        processor: { select: { id: true, first_name: true, last_name: true } },
      },
    });
    return ok(res, runs);
  } catch (e) { next(e); }
}

// POST /payroll — create a new run for a period
export async function create_run(req, res, next) {
  try {
    const { period_month, period_year, notes } = req.body;
    if (!period_month || !period_year) return fail(res, 'period_month and period_year required');
    const existing = await prisma.payroll_runs.findFirst({ where: { period_month: +period_month, period_year: +period_year } });
    if (existing) return fail(res, 'Payroll run already exists for this period');
    const run = await prisma.payroll_runs.create({ data: { period_month: +period_month, period_year: +period_year, notes } });
    return ok(res, run, 'Payroll run created', 201);
  } catch (e) { next(e); }
}

// POST /payroll/:id/calculate — auto-calculate all entries for the run
export async function calculate_run(req, res, next) {
  try {
    const run = await prisma.payroll_runs.findUnique({ where: { id: req.params.id } });
    if (!run) return fail(res, 'Run not found', 404);

    const { period_month, period_year } = run;
    const start = new Date(period_year, period_month - 1, 1);
    const end   = new Date(period_year, period_month, 0, 23, 59, 59);

    // Get all active employees with their salary info
    const employees = await prisma.users.findMany({
      take: 500,
      where: { deleted_at: null },
      select: {
        id: true, first_name: true, last_name: true, email: true,
        salary: true,
        timesheet_entries: {
          where: { check_in: { gte: start, lte: end }, deleted_at: null },
          select: { check_in: true, check_out: true, duration_sec: true },
        },
        overtime_requests: {
          where: {
            date: { gte: start, lte: end },
            status: 'APPROVED',
          },
          select: { duration_minutes: true, overtime_multiplier: true, approved_amount: true },
        },
      },
    });

    // Get approved bonus records for the period
    const period_str = `${period_year}-${String(period_month).padStart(2,'0')}`;
    const bonus_records = await prisma.monthly_bonus_records.findMany({
      take: 500,
      where: { period: period_str, approval_status: 'APPROVED' },
      select: { user_id: true, bonus_amount: true },
    });
    const bonus_map = {};
    for (const b of bonus_records) {
      bonus_map[b.user_id] = (bonus_map[b.user_id] || 0) + (b.bonus_amount || 0);
    }

    // Working days in month (Mon-Fri)
    let working_days = 0;
    const working_day_keys = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const day = d.getDay();
      if (day !== 0 && day !== 6) {
        working_days++;
        working_day_keys.push(to_day_key(d));
      }
    }

    const entries = [];
    let total_gross = 0, total_net = 0, total_deductions = 0;

    for (const emp of employees) {
      const base_salary = emp.salary || 0;
      if (base_salary === 0) continue;

      // Count distinct present days. Uses to_day_key() (local calendar date,
      // not toISOString()) so it's consistent with working_day_keys/
      // leave_day_set below — toISOString() would roll a midnight-local
      // date back a day in this server's timezone (UTC+5), silently
      // mismatching day-keys at week boundaries.
      const clocked_in_day_set = new Set(
        emp.timesheet_entries.map(e => to_day_key(e.check_in))
      );
      const present_days = clocked_in_day_set.size;

      // Daily rate
      const daily_rate = base_salary / working_days;

      // Sprint 3: Payroll x Attendance/Leave integration. paid_leave_days
      // (approved ANNUAL leave, capped at 12/year) count toward earned pay
      // alongside actual clocked-in days; unpaid leave and true absences
      // both fall outside this and are simply not paid for, same as today.
      const { paid_leave_days, unpaid_leave_days, leave_requests } =
        await compute_leave_days(emp.id, start, end, period_year);
      const leave_day_set = expand_leave_day_set(leave_requests, start, end);
      const absent_days = count_absent_days(working_day_keys, clocked_in_day_set, leave_day_set);

      const days_paid_for = present_days + paid_leave_days;
      const earned = daily_rate * Math.min(days_paid_for, working_days);

      // Overtime — use approved_amount if set, otherwise calculate
      let overtime_hours = 0, overtime_amount = 0;
      for (const ot of emp.overtime_requests) {
        const hours = (ot.duration_minutes || 0) / 60;
        overtime_hours += hours;
        if (ot.approved_amount) {
          overtime_amount += ot.approved_amount;
        } else {
          const hourly_rate = base_salary / (working_days * 8);
          overtime_amount += hourly_rate * hours * (ot.overtime_multiplier || 1.5);
        }
      }

      // Bonus
      const bonus_amount = bonus_map[emp.id] || 0;

      // Sprint 3: LATE violations (2x-punitive prorated deduction) and
      // unexcused-absence penalty (one extra day's rate per absent day).
      const { late_violation_count, late_deduction } =
        await compute_late_deduction(emp.id, start, end, daily_rate);
      const absence_penalty = compute_absence_penalty(absent_days, daily_rate);

      // Simple tax (flat 5% if > 50000 PKR)
      const gross_amount = earned + overtime_amount + bonus_amount;
      const tax_amount = gross_amount > 50000 ? gross_amount * 0.05 : 0;
      const deductions = tax_amount + late_deduction + absence_penalty;
      const net_amount = gross_amount - deductions;

      total_gross += gross_amount;
      total_net += net_amount;
      total_deductions += deductions;

      // Upsert entry
      const existing_entry = await prisma.payroll_entries.findFirst({ where: { run_id: req.params.id, user_id: emp.id } });
      const entry = await prisma.payroll_entries.upsert({
        where: { id: existing_entry?.id || 'new_entry_placeholder' },
        create: {
          run_id: req.params.id, user_id: emp.id,
          base_salary, working_days, present_days,
          paid_leave_days, unpaid_leave_days, absent_days,
          late_violation_count, late_deduction: Math.round(late_deduction),
          absence_penalty: Math.round(absence_penalty),
          overtime_hours, overtime_amount, bonus_amount,
          gross_amount: Math.round(gross_amount), net_amount: Math.round(net_amount),
          tax_amount: Math.round(tax_amount), deductions: Math.round(deductions),
        },
        update: {
          base_salary, working_days, present_days,
          paid_leave_days, unpaid_leave_days, absent_days,
          late_violation_count, late_deduction: Math.round(late_deduction),
          absence_penalty: Math.round(absence_penalty),
          overtime_hours, overtime_amount, bonus_amount,
          gross_amount: Math.round(gross_amount), net_amount: Math.round(net_amount),
          tax_amount: Math.round(tax_amount), deductions: Math.round(deductions),
        },
      });
      entries.push({ ...entry, employee: { first_name: emp.first_name, last_name: emp.last_name, email: emp.email } });
    }

    // Update run totals
    const updated_run = await prisma.payroll_runs.update({
      where: { id: req.params.id },
      data: {
        status: 'PROCESSING',
        total_gross: Math.round(total_gross),
        total_net: Math.round(total_net),
        total_deductions: Math.round(total_deductions),
        processed_by: req.user.id,
        processed_at: new Date(),
      },
    });

    return ok(res, { run: updated_run, entries, employee_count: entries.length });
  } catch (e) { next(e); }
}

// GET /payroll/:id — run detail with entries
export async function get_run(req, res, next) {
  try {
    const run = await prisma.payroll_runs.findUnique({
      where: { id: req.params.id },
      include: {
        entries: {
          include: { user: { select: { id: true, first_name: true, last_name: true, email: true, avatar: true } } },
        },
        processor: { select: { id: true, first_name: true, last_name: true } },
      },
    });
    if (!run) return fail(res, 'Not found', 404);
    return ok(res, run);
  } catch (e) { next(e); }
}

// PATCH /payroll/:id/status
export async function update_run_status(req, res, next) {
  try {
    const { status } = req.body;
    const valid = ['DRAFT','PROCESSING','COMPLETED','PAID'];
    if (!valid.includes(status)) return fail(res, `status must be one of: ${valid.join(', ')}`);
    const run = await prisma.payroll_runs.update({ where: { id: req.params.id }, data: { status } });
    return ok(res, run, 'Status updated');
  } catch (e) { next(e); }
}

// GET /payroll/:id/entries/:entryId/payslip — generate payslip JSON (PDF generated on FE)
export async function get_payslip(req, res, next) {
  try {
    const entry = await prisma.payroll_entries.findUnique({
      where: { id: req.params.entryId },
      include: {
        user: { select: { id: true, first_name: true, last_name: true, email: true, avatar: true, designation: true } },
        run:  true,
      },
    });
    if (!entry) return fail(res, 'Not found', 404);
    // Only self or admin
    const is_admin = req.user.roles.some(r => ['ADMIN', 'SUPER_ADMIN', 'HR'].includes(r));
    if (!is_admin && entry.user_id !== req.user.id) return fail(res, 'Forbidden', 403);
    return ok(res, entry);
  } catch (e) { next(e); }
}
