/**
 * HR Reports module
 * Provides per-employee annual/monthly leave+latecoming reports and aggregate stats.
 *
 * Leave policy rules applied:
 * - Grace period: 15 min
 * - 11:15 AM = check_in after 675 min from midnight (11:15)
 * - 11:30 AM = check_in after 690 min from midnight (11:30)
 * - Monday/Friday leaves: detected from weekday of start_date/end_date
 * - WFH: counted from timesheet_entries.is_wfh = true
 * - WFH converted leaves: floor(wfh_count / 2)
 * - Sandwich leave: if leave starts on Tuesday-Thursday AND Monday was also a leave day
 *   and Friday is a leave day, the weekend days are also counted. Simplified implementation:
 *   if leave spans Mon-Fri (5+ days including Mon+Fri), flag as sandwich.
 * - Annual paid leave allowance: 12
 * - Special leaves (MARRIAGE=10, UMRAH=14, MATERNITY=30/PATERNITY=3) not deducted from annual
 */

import { Router } from 'express';
import { authenticate, authorize } from '../../shared/middleware/authenticate.js';
import prisma from '../../shared/database/client.js';

const router = Router();
router.use(authenticate);
const ADMIN_HR = authorize('ADMIN', 'SUPER_ADMIN', 'HR');

const GRACE_MINUTES = 15;
const THRESHOLD_1115 = 11 * 60 + 15; // minutes from midnight
const THRESHOLD_1130 = 11 * 60 + 30;
const ANNUAL_PAID_LEAVE = 12;
const SPECIAL_LEAVE_TYPES = ['MARRIAGE', 'UMRAH', 'MATERNITY', 'PATERNITY'];

function mins_from_midnight(dt) {
  return dt.getHours() * 60 + dt.getMinutes();
}

function get_weekday(dt) {
  // 0=Sun, 1=Mon, 5=Fri, 6=Sat
  return new Date(dt).getDay();
}

function is_monday(dt) { return get_weekday(dt) === 1; }
function is_friday(dt) { return get_weekday(dt) === 5; }

// ── GET /api/v1/hr-report/employee/:userId/annual?year= ───────────────────────
router.get('/employee/:userId/annual', ADMIN_HR, async (req, res, next) => {
  try {
    const { userId } = req.params;
    const year = +req.query.year || new Date().getFullYear();
    const start = new Date(`${year}-01-01`);
    const end   = new Date(`${year}-12-31T23:59:59.999Z`);

    // ── Leaves ──────────────────────────────────────────────────────────
    const leaves = await prisma.time_off_requests.findMany({
      where: { user_id: userId, start_date: { gte: start, lte: end } },
      include: { policy: { select: { name: true } } },
    });

    const approved_leaves = leaves.filter(l => l.status === 'APPROVED');
    const pending_leaves  = leaves.filter(l => l.status === 'PENDING');
    const rejected_leaves = leaves.filter(l => l.status === 'REJECTED');

    // Filter out special leaves for annual paid leave calculation
    const annual_leaves = approved_leaves.filter(l => !SPECIAL_LEAVE_TYPES.includes(l.leave_type));
    const total_annual_days = annual_leaves.reduce((s, l) => s + (l.days || 0), 0);
    const excess_leaves = Math.max(0, total_annual_days - ANNUAL_PAID_LEAVE);

    // Monday / Friday leaves
    const monday_leaves = approved_leaves.filter(l => is_monday(l.start_date));
    const friday_leaves = approved_leaves.filter(l => is_friday(l.end_date));

    // Sandwich leaves (simplified: leave start_date is Mon and end_date is Fri with gap ≥ 5 days)
    const sandwich_leaves = approved_leaves.filter(l => {
      const days_diff = Math.ceil((new Date(l.end_date) - new Date(l.start_date)) / 86400000) + 1;
      return is_monday(l.start_date) && is_friday(l.end_date) && days_diff >= 5;
    });

    // Special leaves
    const special = {};
    for (const t of SPECIAL_LEAVE_TYPES) {
      special[t.toLowerCase() + '_days'] = approved_leaves
        .filter(l => l.leave_type === t)
        .reduce((s, l) => s + (l.days || 0), 0);
    }

    // ── WFH ─────────────────────────────────────────────────────────────
    const wfh_entries = await prisma.timesheet_entries.count({
      where: { user_id: userId, is_wfh: true, check_in: { gte: start, lte: end } },
    });
    const wfh_converted_leaves = Math.floor(wfh_entries / 2);

    // ── Latecomings ─────────────────────────────────────────────────────
    const violations = await prisma.attendance_violations.findMany({
      where: { user_id: userId, violation_type: 'LATE', date: { gte: start, lte: end } },
    });
    const late_total = violations.length;
    const late_after_grace = violations.filter(v => (v.late_mins || 0) > GRACE_MINUTES).length;

    // For 11:15 and 11:30 thresholds, look at actual check_in times
    const ts_entries = await prisma.timesheet_entries.findMany({
      where: { user_id: userId, check_in: { gte: start, lte: end } },
      select: { check_in: true, check_out: true },
    });

    let late_after_1115 = 0;
    let late_after_1130 = 0;
    let missing_checkout = 0;

    for (const e of ts_entries) {
      const ci_mins = mins_from_midnight(new Date(e.check_in));
      if (ci_mins > THRESHOLD_1115) late_after_1115++;
      if (ci_mins > THRESHOLD_1130) late_after_1130++;
      if (!e.check_out) missing_checkout++;
    }

    // Missing check-in: no timesheet entry for a working day
    // (Simplified: we can count days with entries vs expected days — not implemented here without shift data)
    // Return what we can derive
    const missing_checkin = 0; // Requires shift calendar knowledge — flagged as TODO

    // ── Overtime ────────────────────────────────────────────────────────
    const overtime_entries = await prisma.overtime_requests.count({
      where: { user_id: userId, date: { gte: start, lte: end }, status: 'APPROVED' },
    });

    return res.json({
      success: true,
      payload: {
        user_id: userId, year,
        leaves: {
          total_approved: approved_leaves.length,
          total_pending:  pending_leaves.length,
          total_rejected: rejected_leaves.length,
          annual_paid_days: total_annual_days,
          excess_days: excess_leaves,
          monday_leave_count: monday_leaves.length,
          friday_leave_count: friday_leaves.length,
          sandwich_leave_count: sandwich_leaves.length,
          sandwich_leave_days: sandwich_leaves.reduce((s, l) => s + (l.days || 0), 0),
          ...special,
          records: leaves.map(l => ({
            id: l.id, leave_type: l.leave_type, policy: l.policy?.name,
            start_date: l.start_date, end_date: l.end_date, days: l.days,
            status: l.status, reason: l.reason, manager_comment: l.manager_comment,
            is_monday: is_monday(l.start_date), is_friday: is_friday(l.end_date),
            is_sandwich: sandwich_leaves.some(s => s.id === l.id),
          })),
        },
        wfh: {
          wfh_count: wfh_entries,
          wfh_converted_leaves,
        },
        latecoming: {
          total: late_total,
          after_grace: late_after_grace,
          after_1115: late_after_1115,
          after_1130: late_after_1130,
        },
        attendance: {
          missing_checkout,
          missing_checkin,
          total_entries: ts_entries.length,
        },
        overtime: { approved_count: overtime_entries },
      },
    });
  } catch (err) { next(err); }
});

// ── GET /api/v1/hr-report/employee/:userId/monthly?year=&month= ──────────────
router.get('/employee/:userId/monthly', ADMIN_HR, async (req, res, next) => {
  try {
    const { userId } = req.params;
    const year  = +req.query.year  || new Date().getFullYear();
    const month = +req.query.month || new Date().getMonth() + 1;

    const start = new Date(`${year}-${String(month).padStart(2,'0')}-01`);
    const end   = new Date(start);
    end.setMonth(end.getMonth() + 1);
    end.setMilliseconds(-1);

    const leaves = await prisma.time_off_requests.findMany({
      where: { user_id: userId, status: 'APPROVED', start_date: { gte: start, lte: end } },
      include: { policy: { select: { name: true } } },
    });

    const monday_leaves = leaves.filter(l => is_monday(l.start_date));
    const friday_leaves = leaves.filter(l => is_friday(l.end_date));

    const wfh_count = await prisma.timesheet_entries.count({
      where: { user_id: userId, is_wfh: true, check_in: { gte: start, lte: end } },
    });

    const ts_entries = await prisma.timesheet_entries.findMany({
      where: { user_id: userId, check_in: { gte: start, lte: end } },
      select: { check_in: true, check_out: true },
    });

    let late_count = 0, late_1115 = 0, late_1130 = 0, missing_checkout = 0;
    // Get shift for this employee to determine late threshold
    const shift = await prisma.employee_shifts.findFirst({
      where: { user_id: userId },
      include: { shift: { select: { start_time: true, grace_period_min: true } } },
    });
    const grace = shift?.shift?.grace_period_min || 15;
    const shift_start_parts = (shift?.shift?.start_time || '09:00').split(':');
    const shift_start_mins = +shift_start_parts[0] * 60 + (+shift_start_parts[1] || 0);
    const grace_end_mins = shift_start_mins + grace;

    for (const e of ts_entries) {
      const ci_mins = mins_from_midnight(new Date(e.check_in));
      if (ci_mins > grace_end_mins) late_count++;
      if (ci_mins > THRESHOLD_1115) late_1115++;
      if (ci_mins > THRESHOLD_1130) late_1130++;
      if (!e.check_out) missing_checkout++;
    }

    // Monthly deduction summary (if salary available)
    const profile = await prisma.employee_profiles.findUnique({
      where: { user_id: userId }, select: { base_salary: true }
    });
    const salary = profile?.base_salary || 0;
    const daily_rate = salary / 26;
    const total_leave_days = leaves.reduce((s, l) => s + (l.days || 0), 0);
    const excess = Math.max(0, total_leave_days - 0); // Monthly quota not enforced separately
    const deduction_estimate = excess * daily_rate;

    return res.json({
      success: true,
      payload: {
        user_id: userId, year, month,
        leaves: {
          total: leaves.length,
          total_days: total_leave_days,
          monday_count: monday_leaves.length,
          friday_count: friday_leaves.length,
          records: leaves.map(l => ({
            id: l.id, leave_type: l.leave_type, policy: l.policy?.name,
            start_date: l.start_date, end_date: l.end_date, days: l.days,
            status: l.status,
            is_monday: is_monday(l.start_date), is_friday: is_friday(l.end_date),
          })),
        },
        wfh: { count: wfh_count, converted_leaves: Math.floor(wfh_count / 2) },
        latecoming: { total: late_count, after_1115: late_1115, after_1130: late_1130 },
        attendance: { total_entries: ts_entries.length, missing_checkout },
        deduction_estimate: salary ? { daily_rate, excess_days: excess, deduction_estimate } : null,
      },
    });
  } catch (err) { next(err); }
});

// ── GET /api/v1/hr-report/aggregate?month=&year= ─────────────────────────────
router.get('/aggregate', ADMIN_HR, async (req, res, next) => {
  try {
    const year  = +req.query.year  || new Date().getFullYear();
    const month = +req.query.month || new Date().getMonth() + 1;

    const start = new Date(`${year}-${String(month).padStart(2,'0')}-01`);
    const end   = new Date(start);
    end.setMonth(end.getMonth() + 1);
    end.setMilliseconds(-1);

    // Total leaves this month
    const total_leave_requests = await prisma.time_off_requests.count({
      where: { status: 'APPROVED', start_date: { gte: start, lte: end } },
    });

    // Total latecomings this month (via violations)
    const total_late = await prisma.attendance_violations.count({
      where: { violation_type: 'LATE', date: { gte: start, lte: end } },
    });

    // Top employees with repeated latecomings (top 10)
    const late_by_user = await prisma.attendance_violations.groupBy({
      by: ['user_id'],
      where: { violation_type: 'LATE', date: { gte: start, lte: end } },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 10,
    });

    const top_late_users = await Promise.all(
      late_by_user.map(async r => {
        const u = await prisma.users.findUnique({
          where: { id: r.user_id },
          select: { first_name: true, last_name: true, email: true, employee_id: true, designation: true },
        });
        return { ...u, late_count: r._count.id };
      })
    );

    // Employees exceeding annual leave threshold (> 12 in current year)
    const annual_start = new Date(`${year}-01-01`);
    const annual_end   = new Date(`${year}-12-31T23:59:59.999Z`);
    const leave_by_user = await prisma.time_off_requests.groupBy({
      by: ['user_id'],
      where: {
        status: 'APPROVED',
        start_date: { gte: annual_start, lte: annual_end },
        leave_type: { notIn: SPECIAL_LEAVE_TYPES },
      },
      _sum: { days: true },
      having: { days: { _sum: { gt: ANNUAL_PAID_LEAVE } } },
    });

    const employees_over_leave = await Promise.all(
      leave_by_user.map(async r => {
        const u = await prisma.users.findUnique({
          where: { id: r.user_id },
          select: { first_name: true, last_name: true, email: true, employee_id: true },
        });
        return { ...u, total_leaves: r._sum.days };
      })
    );

    // Employees exceeding latecoming threshold (> 24 after grace in year)
    const late_annual = await prisma.attendance_violations.groupBy({
      by: ['user_id'],
      where: { violation_type: 'LATE', date: { gte: annual_start, lte: annual_end } },
      _count: { id: true },
      having: { id: { _count: { gt: 24 } } },
    });

    const employees_over_late = await Promise.all(
      late_annual.map(async r => {
        const u = await prisma.users.findUnique({
          where: { id: r.user_id },
          select: { first_name: true, last_name: true, email: true, employee_id: true },
        });
        return { ...u, late_count: r._count.id };
      })
    );

    return res.json({
      success: true,
      payload: {
        year, month,
        total_leave_requests,
        total_latecomings: total_late,
        top_late_employees: top_late_users,
        employees_over_annual_leave: employees_over_leave,
        employees_over_latecoming_threshold: employees_over_late,
      },
    });
  } catch (err) { next(err); }
});

export default router;
