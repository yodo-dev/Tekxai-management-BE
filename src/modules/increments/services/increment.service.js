import prisma from '../../../shared/database/client.js';

// Policy constants
const MANDATORY_PCT = 5;
const PERFORMANCE_PCT = 10;
const REGULARITY_PCT = 3;
const PUNCTUALITY_PCT = 2;
const MAX_ANNUAL_LEAVES = 12;
const MAX_LATE_AFTER_GRACE = 24;
const GRACE_MINUTES = 15;
const LATE_THRESHOLD_1 = 75; // 11:15 AM = 9:00 AM + 135 min... actually we measure from shift start
// We compute late_after_grace as latecomings where late_mins > GRACE_MINUTES
// attendance_violations with violation_type = 'LATE' already capture late_mins

/**
 * Compute leave count for a user in a year from time_off_requests (APPROVED).
 * Excludes special leave types (MARRIAGE, UMRAH, MATERNITY, PATERNITY) — they don't count against annual balance.
 */
async function get_leave_count(user_id, year) {
  const start = new Date(`${year}-01-01`);
  const end = new Date(`${year}-12-31T23:59:59.999Z`);
  const requests = await prisma.time_off_requests.findMany({
    take: 500,
    where: {
      user_id,
      status: 'APPROVED',
      start_date: { gte: start, lte: end },
      leave_type: { notIn: ['MARRIAGE', 'UMRAH', 'MATERNITY', 'PATERNITY'] },
    },
  });
  return requests.reduce((sum, r) => sum + (r.days || 0), 0);
}

/**
 * Count latecomings after grace period (late_mins > GRACE_MINUTES) in a year.
 * Uses attendance_violations table.
 */
async function get_late_after_grace_count(user_id, year) {
  const start = new Date(`${year}-01-01`);
  const end = new Date(`${year}-12-31T23:59:59.999Z`);
  // attendance_violations stores late entries with late_mins
  const violations = await prisma.attendance_violations.findMany({
    take: 500,
    where: {
      user_id,
      violation_type: 'LATE',
      date: { gte: start, lte: end },
    },
  });
  // Count only those with late_mins > GRACE_MINUTES
  return violations.filter(v => (v.late_mins || 0) > GRACE_MINUTES).length;
}

/**
 * Calculate recommended increment for an employee for a given review year.
 */
export async function calculate_increment(user_id, review_year) {
  const profile = await prisma.employee_profiles.findUnique({ where: { user_id } });
  const previous_salary = profile?.base_salary || 0;

  const leave_count = await get_leave_count(user_id, review_year);
  const late_count = await get_late_after_grace_count(user_id, review_year);

  // Get latest performance score
  const perf = await prisma.employee_performance_scores.findFirst({
    where: { user_id },
    orderBy: { created_at: 'desc' },
  });
  const performance_score = perf?.score || null;

  // Eligibility
  const regularity_eligible = leave_count <= MAX_ANNUAL_LEAVES;
  const punctuality_eligible = late_count <= MAX_LATE_AFTER_GRACE;

  // Component percentages
  const mandatory_pct = MANDATORY_PCT;
  const performance_pct = PERFORMANCE_PCT;  // always included; HR can override
  const regularity_pct = regularity_eligible ? REGULARITY_PCT : 0;
  const punctuality_pct = punctuality_eligible ? PUNCTUALITY_PCT : 0;

  const total_pct = mandatory_pct + performance_pct + regularity_pct + punctuality_pct;
  const increment_amount = previous_salary * (total_pct / 100);
  const new_salary = previous_salary + increment_amount;

  return {
    previous_salary,
    mandatory_pct,
    performance_pct,
    regularity_pct,
    punctuality_pct,
    total_pct,
    increment_amount,
    new_salary,
    regularity_eligible,
    punctuality_eligible,
    regularity_exclusion_reason: regularity_eligible ? null : `Employee had ${leave_count} leaves (max ${MAX_ANNUAL_LEAVES} allowed)`,
    punctuality_exclusion_reason: punctuality_eligible ? null : `Employee had ${late_count} latecomings after grace (max ${MAX_LATE_AFTER_GRACE} allowed)`,
    leave_count_snapshot: leave_count,
    latecoming_count_snapshot: late_count,
    performance_score_snapshot: performance_score,
  };
}

export async function create_increment(user_id, data, created_by) {
  const {
    review_year, review_period, effective_date,
    mandatory_pct, performance_pct, regularity_pct, punctuality_pct,
    total_pct, increment_amount, new_salary, previous_salary,
    notes, regularity_eligible, punctuality_eligible,
    regularity_exclusion_reason, punctuality_exclusion_reason,
    leave_count_snapshot, latecoming_count_snapshot, performance_score_snapshot,
  } = data;

  return prisma.salary_increments.create({
    data: {
      user_id, review_year: +review_year, review_period,
      effective_date: effective_date ? new Date(effective_date) : null,
      previous_salary: +previous_salary,
      mandatory_pct: +mandatory_pct,
      performance_pct: +performance_pct,
      regularity_pct: +regularity_pct,
      punctuality_pct: +punctuality_pct,
      total_pct: +total_pct,
      increment_amount: +increment_amount,
      new_salary: +new_salary,
      notes,
      regularity_eligible: !!regularity_eligible,
      punctuality_eligible: !!punctuality_eligible,
      regularity_exclusion_reason,
      punctuality_exclusion_reason,
      leave_count_snapshot: leave_count_snapshot ? +leave_count_snapshot : null,
      latecoming_count_snapshot: latecoming_count_snapshot ? +latecoming_count_snapshot : null,
      performance_score_snapshot: performance_score_snapshot ? +performance_score_snapshot : null,
      created_by,
      status: 'DRAFT',
    },
    include: { user: { select: { first_name: true, last_name: true, email: true, employee_id: true } } },
  });
}

export async function list_increments({ user_id, status, review_year, page = 1, limit = 20 } = {}) {
  const skip = ((+page || 1) - 1) * (+limit || 20);
  const where = {};
  if (user_id)     where.user_id = user_id;
  if (status)      where.status = status;
  if (review_year) where.review_year = +review_year;

  const [total, records] = await Promise.all([
    prisma.salary_increments.count({ where }),
    prisma.salary_increments.findMany({
      where, skip, take: +limit || 20,
      orderBy: { created_at: 'desc' },
      include: {
        user: { select: { first_name: true, last_name: true, email: true, employee_id: true, designation: true } },
        approver: { select: { first_name: true, last_name: true } },
      },
    }),
  ]);
  return { records, total, page: +page, limit: +limit };
}

export async function approve_increment(id, approved_by, notes) {
  // Get the increment and apply new salary to profile
  const inc = await prisma.salary_increments.findUnique({ where: { id } });
  if (!inc) throw Object.assign(new Error('Increment not found'), { status_code: 404 });

  const updated = await prisma.salary_increments.update({
    where: { id },
    data: { status: 'APPROVED', approved_by, approved_at: new Date(), notes: notes || inc.notes },
  });

  // Apply salary to employee_profiles
  if (inc.new_salary) {
    await prisma.employee_profiles.upsert({
      where: { user_id: inc.user_id },
      create: { user_id: inc.user_id, base_salary: inc.new_salary, effective_salary_date: inc.effective_date || new Date() },
      update: { base_salary: inc.new_salary, effective_salary_date: inc.effective_date || new Date() },
    });
  }
  return updated;
}

export async function reject_increment(id, rejected_by, notes) {
  const inc = await prisma.salary_increments.findUnique({ where: { id } });
  if (!inc) throw Object.assign(new Error('Increment not found'), { status_code: 404 });
  return prisma.salary_increments.update({
    where: { id },
    data: { status: 'REJECTED', notes: notes || inc.notes },
  });
}
