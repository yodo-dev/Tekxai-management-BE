import prisma from '../../shared/database/client.js';

// Sprint 3: Payroll x Attendance/Leave integration — approved business rules:
//
// - Only leave_type=ANNUAL counts as paid leave ("leave encashment"), capped
//   at a hardcoded 12 days per calendar year per employee. Any ANNUAL days
//   beyond the cap, and every other leave_type (SICK/MARRIAGE/UMRAH/
//   MATERNITY/PATERNITY/OTHER/UNPAID), is unpaid — those days simply aren't
//   added to paid_leave_days, so they reduce earned pay exactly like an
//   absence would (no separate deduction line for unpaid leave itself).
// - LATE violations: deduction = late_mins * (daily_rate / (8*60)) * 2 per
//   violation row in the period (a 2x-punitive rate on the prorated late
//   time, not 2x the whole salary).
// - Absence: a working day with no clock-in AND no approved leave (any
//   type) covering it. Already loses that day's pay via the existing
//   present_days mechanism; this adds one FURTHER daily_rate penalty per
//   absent day (so an unexcused absence costs 2 days' pay total).
//
// Reads time_off_requests (the actual per-request date/type event log), not
// leave_balances (a year-level aggregate with no per-request date range) —
// leave_balances is the right source for "how many days remain," but this
// needs to know WHICH days in THIS period were leave, and of what type.

const ANNUAL_PAID_CAP_DAYS = 12;
const WORKING_HOURS_PER_DAY = 8;
const LATE_PENALTY_MULTIPLIER = 2;
const ABSENCE_PENALTY_MULTIPLIER = 1;

// Calendar-day key using LOCAL date components, not toISOString() (which
// converts to UTC and rolls a midnight-local Date back to the previous
// calendar day in any positive-UTC-offset timezone, e.g. Asia/Karachi
// UTC+5 — confirmed live: new Date(2026,7,3) at local midnight serializes
// to "2026-08-02T19:00:00.000Z"). working_day_keys and leave-request date
// ranges are both constructed as local midnight Dates, so this must be
// timezone-safe or absence detection silently miscounts by a day at week
// boundaries.
function to_day_key(date) {
  const d = new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// Splits this period's APPROVED leave requests into paid (ANNUAL, within
// the year-to-date 12-day cap) vs unpaid (everything else, and any ANNUAL
// days beyond the cap). Chronological order matters: the cap is consumed in
// start_date order across the whole year, not just within this period.
export async function compute_leave_days(user_id, period_start, period_end, period_year) {
  const year_start = new Date(period_year, 0, 1);

  const period_requests = await prisma.time_off_requests.findMany({
    where: {
      user_id, status: 'APPROVED',
      start_date: { lte: period_end },
      end_date: { gte: period_start },
    },
    select: { leave_type: true, start_date: true, end_date: true, days: true },
  });

  const prior_annual = await prisma.time_off_requests.aggregate({
    where: {
      user_id, status: 'APPROVED', leave_type: 'ANNUAL',
      start_date: { gte: year_start, lt: period_start },
    },
    _sum: { days: true },
  });
  let annual_used_before = prior_annual._sum.days || 0;

  let paid_leave_days = 0;
  let unpaid_leave_days = 0;
  const sorted = [...period_requests].sort((a, b) => new Date(a.start_date) - new Date(b.start_date));
  for (const r of sorted) {
    const days = r.days || 0;
    if (r.leave_type === 'ANNUAL') {
      const remaining_cap = Math.max(0, ANNUAL_PAID_CAP_DAYS - annual_used_before);
      const paid_here = Math.min(days, remaining_cap);
      paid_leave_days += paid_here;
      unpaid_leave_days += days - paid_here;
      annual_used_before += days;
    } else {
      unpaid_leave_days += days;
    }
  }

  return { paid_leave_days, unpaid_leave_days, leave_requests: period_requests };
}

// Expands each leave request's date range (clamped to the period) into a
// set of day-keys, so absence detection can check "is this working day
// covered by ANY approved leave" regardless of paid/unpaid.
export function expand_leave_day_set(leave_requests, period_start, period_end) {
  const set = new Set();
  for (const r of leave_requests) {
    const s = new Date(Math.max(new Date(r.start_date).getTime(), period_start.getTime()));
    const e = new Date(Math.min(new Date(r.end_date).getTime(), period_end.getTime()));
    for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
      set.add(to_day_key(d));
    }
  }
  return set;
}

// Counts working days in the period with no clock-in and no covering leave.
export function count_absent_days(working_day_keys, clocked_in_day_set, leave_day_set) {
  let absent = 0;
  for (const day of working_day_keys) {
    if (!clocked_in_day_set.has(day) && !leave_day_set.has(day)) absent++;
  }
  return absent;
}

export async function compute_late_deduction(user_id, period_start, period_end, daily_rate) {
  const violations = await prisma.attendance_violations.findMany({
    where: { user_id, violation_type: 'LATE', date: { gte: period_start, lte: period_end } },
    select: { late_mins: true },
  });
  const per_minute_rate = daily_rate / (WORKING_HOURS_PER_DAY * 60);
  let late_deduction = 0;
  for (const v of violations) {
    late_deduction += (v.late_mins || 0) * per_minute_rate * LATE_PENALTY_MULTIPLIER;
  }
  return { late_violation_count: violations.length, late_deduction };
}

export function compute_absence_penalty(absent_days, daily_rate) {
  return absent_days * daily_rate * ABSENCE_PENALTY_MULTIPLIER;
}

export { to_day_key };
