import prisma from '../../../shared/database/client.js';

function app_error(m, c = 400) { const e = new Error(m); e.status_code = c; return e; }

const JD_INCLUDE = {
  user: { select: { id: true, first_name: true, last_name: true, email: true, avatar: true } },
};

// ── Repository ────────────────────────────────────────────────────────────────

async function find_jd(user_id) {
  return prisma.job_descriptions.findFirst({ where: { user_id }, include: JD_INCLUDE });
}

async function upsert_jd(user_id, data) {
  return prisma.job_descriptions.upsert({
    where: { user_id },
    update: { ...data, updated_at: new Date() },
    create: { user_id, ...data },
    include: JD_INCLUDE,
  });
}

// ── Service ───────────────────────────────────────────────────────────────────

export async function get_jd(user_id) {
  return find_jd(user_id);
}

export async function save_jd(user_id, data) {
  const { title, responsibilities, qualifications, kpi_targets, employment_type, effective_date, reporting_to_id, department_id, division_id } = data;
  if (!title?.trim()) throw app_error('title is required');
  return upsert_jd(user_id, {
    title: title.trim(),
    responsibilities:   responsibilities || null,
    qualifications:     qualifications   || null,
    kpi_targets:        kpi_targets      || [],
    employment_type:    employment_type  || 'FULL_TIME',
    effective_date:     effective_date   ? new Date(effective_date) : null,
    reporting_to_id:    reporting_to_id  || null,
    department_id:      department_id    || null,
    division_id:        division_id      || null,
  });
}

export async function list_jds({ department_id } = {}) {
  const where = {};
  if (department_id) where.department_id = department_id;
  return prisma.job_descriptions.findMany({ where, include: JD_INCLUDE, orderBy: { created_at: 'desc' } });
}

export async function delete_jd_svc(user_id) {
  const jd = await find_jd(user_id);
  if (!jd) throw app_error('JD not found', 404);
  return prisma.job_descriptions.delete({ where: { user_id } });
}

// ── Routes ────────────────────────────────────────────────────────────────────

import { Router } from 'express';
import { authenticate, authorize } from '../../../shared/middleware/authenticate.js';

const router = Router();
router.use(authenticate);
const MANAGER = authorize('ADMIN', 'SUPER_ADMIN', 'HR');

router.get('/', MANAGER, async (req, res, next) => {
  try {
    return res.json({ success: true, payload: await list_jds(req.query) });
  } catch (e) { return next(e); }
});

router.get('/me', async (req, res, next) => {
  try {
    return res.json({ success: true, payload: await get_jd(req.user.id) });
  } catch (e) { return next(e); }
});

router.get('/:userId', async (req, res, next) => {
  try {
    return res.json({ success: true, payload: await get_jd(req.params.userId) });
  } catch (e) { return next(e); }
});

router.post('/:userId', MANAGER, async (req, res, next) => {
  try {
    const jd = await save_jd(req.params.userId, req.body);
    return res.status(201).json({ success: true, payload: jd, message: 'JD saved' });
  } catch (e) { return next(e); }
});

router.put('/:userId', MANAGER, async (req, res, next) => {
  try {
    const jd = await save_jd(req.params.userId, req.body);
    return res.json({ success: true, payload: jd, message: 'JD updated' });
  } catch (e) { return next(e); }
});

router.delete('/:userId', MANAGER, async (req, res, next) => {
  try {
    await delete_jd_svc(req.params.userId);
    return res.json({ success: true, message: 'JD deleted' });
  } catch (e) { return next(e); }
});

export default router;
