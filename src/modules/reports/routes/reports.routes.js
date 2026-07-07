import { Router } from 'express';
import { authenticate, authorize, can_or_role } from '../../../shared/middleware/authenticate.js';
import prisma from '../../../shared/database/client.js';
import { get_schema, run_report, list_saved, save_report, delete_saved } from '../report_builder.controller.js';
import { list_projects } from '../../projects/services/projects.service.js';

const router = Router();
router.use(authenticate);
const MANAGER = can_or_role('erp.reports.view', 'ADMIN', 'SUPER_ADMIN', 'HR', 'DIVISION_MANAGER');

// ── CSV helpers ───────────────────────────────────────────────────────────────

function to_csv(rows, columns) {
  const header = columns.map((c) => `"${c.label}"`).join(',');
  const body = rows.map((row) =>
    columns.map((c) => {
      const val = c.fn ? c.fn(row) : (row[c.key] ?? '');
      return `"${String(val).replace(/"/g, '""')}"`;
    }).join(',')
  );
  return [header, ...body].join('\n');
}

function send_csv(res, filename, csv) {
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  return res.send(csv);
}

/**
 * @swagger
 * /report/attendance:
 *   get:
 *     summary: Get attendance report (JSON or CSV)
 *     tags: [Reports]
 *     parameters:
 *       - in: query
 *         name: from
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: to
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: user_id
 *         schema: { type: string }
 *       - in: query
 *         name: format
 *         schema: { type: string, enum: [json, csv] }
 *     responses:
 *       200:
 *         description: Attendance data or CSV file
 *       401:
 *         description: Unauthorized
 */
// ── Attendance Report ─────────────────────────────────────────────────────────

router.get('/attendance', MANAGER, async (req, res, next) => {
  try {
    const { from, to, user_id, format = 'json' } = req.query;
    const where = { deleted_at: null };
    if (user_id) where.user_id = user_id;
    if (from || to) {
      where.check_in = {};
      if (from) where.check_in.gte = new Date(from);
      if (to)   where.check_in.lte = new Date(to);
    }

    const entries = await prisma.timesheet_entries.findMany({
      take: 500,
      where,
      include: { user: { select: { id: true, first_name: true, last_name: true, email: true } } },
      orderBy: [{ user_id: 'asc' }, { check_in: 'asc' }],
    });

    const rows = entries.map((e) => ({
      employee: `${e.user.first_name} ${e.user.last_name}`,
      email:    e.user.email,
      date:     new Date(e.check_in).toLocaleDateString(),
      check_in: new Date(e.check_in).toLocaleTimeString(),
      check_out: e.check_out ? new Date(e.check_out).toLocaleTimeString() : 'Not clocked out',
      hours:    `${Math.floor((e.duration_sec || 0) / 3600)}h ${Math.floor(((e.duration_sec || 0) % 3600) / 60)}m`,
      status:   e.status,
    }));

    if (format === 'csv') {
      const cols = [
        { label: 'Employee', key: 'employee' },
        { label: 'Email',    key: 'email' },
        { label: 'Date',     key: 'date' },
        { label: 'Check In', key: 'check_in' },
        { label: 'Check Out',key: 'check_out' },
        { label: 'Hours',    key: 'hours' },
        { label: 'Status',   key: 'status' },
      ];
      return send_csv(res, `attendance_${from || 'all'}_to_${to || 'all'}.csv`, to_csv(rows, cols));
    }
    return res.json({ success: true, payload: rows, total: rows.length });
  } catch (e) { return next(e); }
});

/**
 * @swagger
 * /report/leave:
 *   get:
 *     summary: Get leave report (JSON or CSV)
 *     tags: [Reports]
 *     parameters:
 *       - in: query
 *         name: from
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: to
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: status
 *         schema: { type: string }
 *       - in: query
 *         name: format
 *         schema: { type: string, enum: [json, csv] }
 *     responses:
 *       200:
 *         description: Leave report data or CSV
 *       401:
 *         description: Unauthorized
 */
// ── Leave Report ──────────────────────────────────────────────────────────────

router.get('/leave', MANAGER, async (req, res, next) => {
  try {
    const { from, to, status, user_id, format = 'json' } = req.query;
    const where = {};
    if (status) where.status = status;
    if (user_id) where.user_id = user_id;
    if (from || to) {
      where.start_date = {};
      if (from) where.start_date.gte = new Date(from);
      if (to)   where.start_date.lte = new Date(to);
    }

    const requests = await prisma.time_off_requests.findMany({
      take: 500,
      where,
      include: {
        user:   { select: { id: true, first_name: true, last_name: true, email: true } },
        policy: true,
      },
      orderBy: { created_at: 'desc' },
    });

    const rows = requests.map((r) => ({
      employee:  `${r.user.first_name} ${r.user.last_name}`,
      email:     r.user.email,
      policy:    r.policy.name,
      from_date: new Date(r.start_date).toLocaleDateString(),
      to_date:   new Date(r.end_date).toLocaleDateString(),
      days:      r.days,
      reason:    r.reason,
      status:    r.status,
      comment:   r.manager_comment || '',
    }));

    if (format === 'csv') {
      const cols = [
        { label: 'Employee',  key: 'employee' },
        { label: 'Email',     key: 'email' },
        { label: 'Policy',    key: 'policy' },
        { label: 'From',      key: 'from_date' },
        { label: 'To',        key: 'to_date' },
        { label: 'Days',      key: 'days' },
        { label: 'Reason',    key: 'reason' },
        { label: 'Status',    key: 'status' },
        { label: 'Comment',   key: 'comment' },
      ];
      return send_csv(res, `leave_report.csv`, to_csv(rows, cols));
    }
    return res.json({ success: true, payload: rows, total: rows.length });
  } catch (e) { return next(e); }
});

/**
 * @swagger
 * /report/performance:
 *   get:
 *     summary: Get performance scores report (JSON or CSV)
 *     tags: [Reports]
 *     parameters:
 *       - in: query
 *         name: period
 *         schema: { type: string }
 *       - in: query
 *         name: format
 *         schema: { type: string, enum: [json, csv] }
 *     responses:
 *       200:
 *         description: Performance report
 *       401:
 *         description: Unauthorized
 */
// ── Performance Report ────────────────────────────────────────────────────────

router.get('/performance', MANAGER, async (req, res, next) => {
  try {
    const { period, user_id, format = 'json' } = req.query;
    const where = {};
    if (period) where.period = period;
    if (user_id) where.user_id = user_id;

    const scores = await prisma.employee_performance_scores.findMany({
      take: 500,
      where,
      include: { user: { select: { id: true, first_name: true, last_name: true, email: true } } },
      orderBy: { total_score: 'desc' },
    });

    const rows = scores.map((s) => ({
      employee:       `${s.user.first_name} ${s.user.last_name}`,
      email:          s.user.email,
      period:         s.period,
      type:           s.score_type,
      timely_delivery: s.timely_delivery,
      quality:        s.quality_score,
      regularity:     s.regularity,
      punctuality:    s.punctuality,
      dress_code:     s.dress_code,
      total:          s.total_score,
    }));

    if (format === 'csv') {
      const cols = [
        { label: 'Employee',        key: 'employee' },
        { label: 'Email',           key: 'email' },
        { label: 'Period',          key: 'period' },
        { label: 'Type',            key: 'type' },
        { label: 'Timely Delivery', key: 'timely_delivery' },
        { label: 'Quality',         key: 'quality' },
        { label: 'Regularity',      key: 'regularity' },
        { label: 'Punctuality',     key: 'punctuality' },
        { label: 'Dress Code',      key: 'dress_code' },
        { label: 'Total Score',     key: 'total' },
      ];
      return send_csv(res, `performance_${period || 'all'}.csv`, to_csv(rows, cols));
    }
    return res.json({ success: true, payload: rows, total: rows.length });
  } catch (e) { return next(e); }
});

/**
 * @swagger
 * /report/bonus:
 *   get:
 *     summary: Get bonus records report (JSON or CSV)
 *     tags: [Reports]
 *     parameters:
 *       - in: query
 *         name: period
 *         schema: { type: string }
 *       - in: query
 *         name: format
 *         schema: { type: string, enum: [json, csv] }
 *     responses:
 *       200:
 *         description: Bonus report
 *       401:
 *         description: Unauthorized
 */
// ── Bonus Report ──────────────────────────────────────────────────────────────

router.get('/bonus', MANAGER, async (req, res, next) => {
  try {
    const { period, format = 'json' } = req.query;
    const where = {};
    if (period) where.period = period;

    const records = await prisma.monthly_bonus_records.findMany({
      take: 500,
      where,
      include: {
        // No direct relation in schema — fetch user separately if needed
      },
      orderBy: { average_score: 'desc' },
    });

    if (format === 'csv') {
      const cols = [
        { label: 'User ID',     key: 'user_id' },
        { label: 'Period',      key: 'period' },
        { label: 'Score',       key: 'average_score' },
        { label: 'Level',       key: 'performance_level' },
        { label: 'Eligible',    key: 'bonus_eligible', fn: (r) => r.bonus_eligible ? 'Yes' : 'No' },
        { label: 'Bonus (PKR)', key: 'bonus_amount' },
        { label: 'Status',      key: 'approval_status' },
      ];
      return send_csv(res, `bonus_${period || 'all'}.csv`, to_csv(records, cols));
    }
    return res.json({ success: true, payload: records, total: records.length });
  } catch (e) { return next(e); }
});

/**
 * @swagger
 * /report/projects:
 *   get:
 *     summary: Get projects report (JSON or CSV)
 *     tags: [Reports]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string }
 *       - in: query
 *         name: format
 *         schema: { type: string, enum: [json, csv] }
 *     responses:
 *       200:
 *         description: Projects report
 *       401:
 *         description: Unauthorized
 */
// ── Project Report ────────────────────────────────────────────────────────────

router.get('/projects', MANAGER, async (req, res, next) => {
  try {
    const { status, format = 'json' } = req.query;
    // Reuses the same list_projects() the Project Management UI uses, so this
    // report (Project Summary / Delivery Report / Project Health Report) always
    // reflects the same client_name, dev_status, health_status, and access-score
    // computed fields — no separate/duplicated query logic to drift out of sync.
    const { records: projects } = await list_projects({ status, limit: 500, member_only: false }, null);

    const rows = projects.map((p) => ({
      title:        p.title,
      status:       p.status,
      client_name:  p.client_name || '',
      dev_status:   p.dev_status || '',
      progress:     `${p.progress}%`,
      members:      p.member_count,
      total_hours:  p.total_hours,
      start_date:   p.start_date ? new Date(p.start_date).toLocaleDateString() : '',
      end_date:     p.end_date   ? new Date(p.end_date).toLocaleDateString()   : '',
      is_overdue:   p.is_overdue ? 'Yes' : 'No',
      days_remaining: p.days_remaining ?? '',
      health_status: p.health_status,
      access_score: `${p.access_completion_score.percent}%`,
      owner:        p.owner ? `${p.owner.first_name} ${p.owner.last_name}` : '',
    }));

    if (format === 'csv') {
      const cols = [
        { label: 'Project',       key: 'title' },
        { label: 'Status',        key: 'status' },
        { label: 'Client',        key: 'client_name' },
        { label: 'Dev Status',    key: 'dev_status' },
        { label: 'Progress',      key: 'progress' },
        { label: 'Members',       key: 'members' },
        { label: 'Total Hours',   key: 'total_hours' },
        { label: 'Start Date',    key: 'start_date' },
        { label: 'End Date',      key: 'end_date' },
        { label: 'Overdue',       key: 'is_overdue' },
        { label: 'Days Remaining', key: 'days_remaining' },
        { label: 'Health',        key: 'health_status' },
        { label: 'Access Score',  key: 'access_score' },
        { label: 'Owner',         key: 'owner' },
      ];
      return send_csv(res, `projects_report.csv`, to_csv(rows, cols));
    }
    return res.json({ success: true, payload: rows, total: rows.length });
  } catch (e) { return next(e); }
});

/**
 * @swagger
 * /report/builder/schema:
 *   get:
 *     summary: Get available schema for report builder
 *     tags: [Reports]
 *     responses:
 *       200:
 *         description: Available models and fields
 *       401:
 *         description: Unauthorized
 * /report/builder/run:
 *   post:
 *     summary: Run a custom report query
 *     tags: [Reports]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               model: { type: string }
 *               filters: { type: object }
 *               columns:
 *                 type: array
 *                 items: { type: string }
 *     responses:
 *       200:
 *         description: Report results
 *       401:
 *         description: Unauthorized
 * /report/builder/saved:
 *   get:
 *     summary: List saved report builder queries
 *     tags: [Reports]
 *     responses:
 *       200:
 *         description: Saved queries
 *       401:
 *         description: Unauthorized
 * /report/builder/saved/{id}:
 *   delete:
 *     summary: Delete a saved report query
 *     tags: [Reports]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Saved query deleted
 *       401:
 *         description: Unauthorized
 */
router.get('/builder/schema', get_schema);
router.post('/builder/run', run_report);
router.get('/builder/saved', list_saved);
router.post('/builder/saved', save_report);
router.delete('/builder/saved/:id', delete_saved);

export default router;
