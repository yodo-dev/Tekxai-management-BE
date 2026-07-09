import { Router } from 'express';
import { authenticate, authorize } from '../../../shared/middleware/authenticate.js';
import prisma from '../../../shared/database/client.js';

const router = Router();
router.use(authenticate);
const ADMIN_HR = authorize('ADMIN', 'SUPER_ADMIN', 'HR');

const USER_SELECT = {
  id: true, email: true, first_name: true, last_name: true,
  phone: true, avatar: true, employee_id: true, designation: true,
  designation_ref: { select: { id: true, name: true } },
  grade: { select: { id: true, name: true, level: true } },
  status: true, hire_date: true, business_unit: true,
  department: { select: { id: true, name: true } },
  division: { select: { id: true, name: true } },
  team_memberships: { select: { team: { select: { id: true, name: true } } }, take: 1 },
  supervisor: { select: { id: true, first_name: true, last_name: true, avatar: true, designation: true } },
  employee_profile: { select: { employment_status: true, employment_type: true, grade: true, base_salary: true, profile_status: true } },
  roles: { select: { role: { select: { name: true } } }, take: 1 },
};

/**
 * @swagger
 * /employee:
 *   get:
 *     summary: List employees (directory with stats)
 *     tags: [Employees]
 *     parameters:
 *       - in: query
 *         name: q
 *         schema: { type: string }
 *         description: Search by name, email, designation
 *       - in: query
 *         name: department_id
 *         schema: { type: string }
 *       - in: query
 *         name: division_id
 *         schema: { type: string }
 *       - in: query
 *         name: status
 *         schema: { type: string }
 *       - in: query
 *         name: employment_status
 *         schema: { type: string }
 *       - in: query
 *         name: business_unit
 *         schema: { type: string }
 *       - in: query
 *         name: page
 *         schema: { type: integer }
 *       - in: query
 *         name: limit
 *         schema: { type: integer }
 *       - in: query
 *         name: sort_by
 *         schema: { type: string }
 *       - in: query
 *         name: sort_dir
 *         schema: { type: string, enum: [asc, desc] }
 *     responses:
 *       200:
 *         description: Paginated employee list with stats
 *       401:
 *         description: Unauthorized
 */
// GET /api/v1/employee — directory listing
router.get('/', ADMIN_HR, async (req, res, next) => {
  try {
    const {
      q, division_id, department_id, team_id, status, employment_status,
      hire_from, page = 1, limit = 20, business_unit,
      sort_by = 'hire_date', sort_dir = 'desc',
    } = req.query;

    const take = Math.min(+limit || 20, 100);
    const skip = ((+page || 1) - 1) * take;

    const where = { deleted_at: null };
    if (business_unit) where.business_unit = business_unit;
    if (division_id)   where.division_id = division_id;
    if (department_id) where.department_id = department_id;
    if (status)        where.status = { equals: status, mode: 'insensitive' };
    if (hire_from)     where.hire_date = { gte: new Date(hire_from) };
    if (team_id)       where.team_memberships = { some: { team_id } };
    if (employment_status) {
      where.employee_profile = { employment_status: { equals: employment_status, mode: 'insensitive' } };
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

    const SORTABLE = { name: 'first_name', hire_date: 'hire_date', designation: 'designation', email: 'email', status: 'status' };
    const orderField = SORTABLE[sort_by] || 'hire_date';
    const orderDir   = sort_dir === 'asc' ? 'asc' : 'desc';
    const orderBy    = [{ [orderField]: orderDir }, { last_name: orderDir }];

    const [total, records] = await Promise.all([
      prisma.users.count({ where }),
      prisma.users.findMany({
  take: 500, where, select: USER_SELECT, orderBy, skip, take }),
    ]);

    const baseWhere = { deleted_at: null, ...(business_unit ? { business_unit } : {}) };
    const stats = await prisma.users.groupBy({
      by: ['status'],
      where: baseWhere,
      _count: { id: true },
    });
    // Normalize to uppercase so 'Active' and 'ACTIVE' are merged
    const stat_map = {};
    for (const s of stats) {
      const key = (s.status || '').toUpperCase();
      stat_map[key] = (stat_map[key] || 0) + s._count.id;
    }

    const on_leave = await prisma.time_off_requests.count({
      where: { status: 'APPROVED', start_date: { lte: new Date() }, end_date: { gte: new Date() } },
    });

    const now = new Date();
    const new_this_month = await prisma.users.count({
      where: { ...baseWhere, hire_date: { gte: new Date(now.getFullYear(), now.getMonth(), 1) } },
    });

    const normalized = records.map(u => ({
      id: u.id, email: u.email,
      full_name: `${u.first_name || ''} ${u.last_name || ''}`.trim(),
      first_name: u.first_name, last_name: u.last_name,
      avatar: u.avatar, phone: u.phone,
      employee_id: u.employee_id, designation: u.designation,
      designation_id: u.designation_ref?.id || null,
      designation_ref: u.designation_ref || null,
      grade_id: u.grade?.id || null,
      grade_ref: u.grade || null,
      status: u.status, hire_date: u.hire_date,
      department: u.department,
      division: u.division,
      team: u.team_memberships?.[0]?.team || null,
      manager: u.supervisor,
      employment_type: u.employee_profile?.employment_type,
      employment_status: u.employee_profile?.employment_status,
      profile_status: u.employee_profile?.profile_status,
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
          new_this_month,
          suspended: stat_map['SUSPENDED'] || 0,
        },
      },
    });
  } catch (err) { next(err); }
});

/**
 * @swagger
 * /employee/stats:
 *   get:
 *     summary: Get employee count statistics
 *     tags: [Employees]
 *     parameters:
 *       - in: query
 *         name: business_unit
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Employee stats summary
 *       401:
 *         description: Unauthorized
 */
// GET /api/v1/employee/stats — summary cards only
router.get('/stats', ADMIN_HR, async (req, res, next) => {
  try {
    const { business_unit } = req.query;
    const baseWhere = { deleted_at: null, ...(business_unit ? { business_unit } : {}) };

    const [total, active, inactive, on_leave, suspended] = await Promise.all([
      prisma.users.count({ where: baseWhere }),
      prisma.users.count({ where: { ...baseWhere, status: 'ACTIVE' } }),
      prisma.users.count({ where: { ...baseWhere, status: 'INACTIVE' } }),
      prisma.time_off_requests.count({
        where: { status: 'APPROVED', start_date: { lte: new Date() }, end_date: { gte: new Date() } },
      }),
      prisma.users.count({ where: { ...baseWhere, status: 'SUSPENDED' } }),
    ]);

    const now = new Date();
    const [new_this_month] = await Promise.all([
      prisma.users.count({
        where: { ...baseWhere, hire_date: { gte: new Date(now.getFullYear(), now.getMonth(), 1) } },
      }),
    ]);

    return res.json({
      success: true,
      payload: { total, active, inactive, on_leave, new_this_month, suspended },
    });
  } catch (err) { next(err); }
});

/**
 * @swagger
 * /employee/{id}:
 *   get:
 *     summary: Get employee by ID
 *     tags: [Employees]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Employee object
 *       404:
 *         description: Employee not found
 *       401:
 *         description: Unauthorized
 */
// GET /api/v1/employee/:id — single employee detail
router.get('/:id', ADMIN_HR, async (req, res, next) => {
  try {
    const user = await prisma.users.findUnique({ where: { id: req.params.id }, select: USER_SELECT });
    if (!user) return res.status(404).json({ success: false, message: 'Employee not found' });
    return res.json({ success: true, payload: user });
  } catch (err) { next(err); }
});

export default router;
