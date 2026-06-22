import { Router } from 'express';
import { authenticate, authorize } from '../../../shared/middleware/authenticate.js';
import prisma from '../../../shared/database/client.js';

const router = Router();
router.use(authenticate);
const ADMIN_HR = authorize('ADMIN', 'SUPER_ADMIN', 'HR');

const USER_SELECT = {
  id: true, email: true, first_name: true, last_name: true,
  phone: true, avatar: true, employee_id: true, designation: true,
  status: true, hire_date: true, business_unit: true,
  department: { select: { id: true, name: true } },
  division: { select: { id: true, name: true } },
  team_memberships: { select: { team: { select: { id: true, name: true } } }, take: 1 },
  supervisor: { select: { id: true, first_name: true, last_name: true, avatar: true, designation: true } },
  employee_profile: { select: { employment_status: true, employment_type: true, grade: true, base_salary: true } },
  roles: { select: { role: { select: { name: true } } }, take: 1 },
};

// GET /api/v1/employee — directory listing
router.get('/', ADMIN_HR, async (req, res, next) => {
  try {
    const {
      q, division_id, department_id, team_id, status,
      page = 1, limit = 20, business_unit
    } = req.query;

    const take = Math.min(+limit || 20, 100);
    const skip = ((+page || 1) - 1) * take;

    const where = { deleted_at: null };
    if (business_unit) where.business_unit = business_unit;
    if (division_id)   where.division_id = division_id;
    if (department_id) where.department_id = department_id;
    if (status)        where.status = status;
    if (team_id) {
      where.team_memberships = { some: { team_id } };
    }
    if (q) {
      where.OR = [
        { first_name: { contains: q, mode: 'insensitive' } },
        { last_name:  { contains: q, mode: 'insensitive' } },
        { email:      { contains: q, mode: 'insensitive' } },
        { employee_id:{ contains: q, mode: 'insensitive' } },
        { designation:{ contains: q, mode: 'insensitive' } },
      ];
    }

    const [total, records] = await Promise.all([
      prisma.users.count({ where }),
      prisma.users.findMany({ where, select: USER_SELECT, orderBy: { hire_date: 'desc' }, skip, take }),
    ]);

    // stats for summary cards
    const stats = await prisma.users.groupBy({
      by: ['status'],
      where: { deleted_at: null, ...(business_unit ? { business_unit } : {}) },
      _count: { id: true },
    });
    const stat_map = {};
    for (const s of stats) stat_map[s.status] = s._count.id;

    // on-leave count via time_off_requests
    const on_leave = await prisma.time_off_requests.count({
      where: { status: 'APPROVED', start_date: { lte: new Date() }, end_date: { gte: new Date() } },
    });

    const normalized = records.map(u => ({
      id: u.id, email: u.email,
      full_name: `${u.first_name || ''} ${u.last_name || ''}`.trim(),
      first_name: u.first_name, last_name: u.last_name,
      avatar: u.avatar, phone: u.phone,
      employee_id: u.employee_id, designation: u.designation,
      status: u.status, hire_date: u.hire_date,
      department: u.department,
      division: u.division,
      team: u.team_memberships?.[0]?.team || null,
      manager: u.supervisor,
      employment_type: u.employee_profile?.employment_type,
      employment_status: u.employee_profile?.employment_status,
      grade: u.employee_profile?.grade,
      base_salary: u.employee_profile?.base_salary,
      role: u.roles?.[0]?.role?.name,
    }));

    return res.json({
      success: true,
      payload: {
        records: normalized, total,
        page: +page, limit: take,
        pages: Math.ceil(total / take),
        stats: {
          total_employees: total,
          active: stat_map['ACTIVE'] || 0,
          inactive: stat_map['INACTIVE'] || 0,
          on_leave,
        },
      },
    });
  } catch (err) { next(err); }
});

// GET /api/v1/employee/stats — summary cards only
router.get('/stats', ADMIN_HR, async (req, res, next) => {
  try {
    const { business_unit } = req.query;
    const where = { deleted_at: null, ...(business_unit ? { business_unit } : {}) };
    const total = await prisma.users.count({ where });
    const active = await prisma.users.count({ where: { ...where, status: 'ACTIVE' } });
    const inactive = await prisma.users.count({ where: { ...where, status: 'INACTIVE' } });
    const on_leave = await prisma.time_off_requests.count({
      where: { status: 'APPROVED', start_date: { lte: new Date() }, end_date: { gte: new Date() } },
    });
    return res.json({ success: true, payload: { total, active, inactive, on_leave } });
  } catch (err) { next(err); }
});

// GET /api/v1/employee/:id — single employee detail
router.get('/:id', ADMIN_HR, async (req, res, next) => {
  try {
    const user = await prisma.users.findUnique({ where: { id: req.params.id }, select: USER_SELECT });
    if (!user) return res.status(404).json({ success: false, message: 'Employee not found' });
    return res.json({ success: true, payload: user });
  } catch (err) { next(err); }
});

export default router;
