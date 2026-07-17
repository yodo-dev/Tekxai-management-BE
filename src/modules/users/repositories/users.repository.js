import prisma from '../../../shared/database/client.js';

const USER_SELECT = {
  id: true,
  email: true,
  first_name: true,
  last_name: true,
  phone: true,
  avatar: true,
  department: true,
  position: true,
  designation: true,
  designation_ref: { select: { id: true, name: true } },
  grade: { select: { id: true, name: true, level: true } },
  business_unit: true,
  supervisor_id: true,
  supervisor: { select: { id: true, first_name: true, last_name: true } },
  status: true,
  is_active: true,
  hire_date: true,
  created_at: true,
  updated_at: true,
  roles: { include: { role: { select: { id: true, name: true } } } },
  team_memberships: { include: { team: { select: { id: true, name: true } } } },
};

function normalize_user(user) {
  const role = user.roles?.[0]?.role;
  return {
    id: user.id,
    email: user.email,
    first_name: user.first_name,
    last_name: user.last_name,
    phone: user.phone,
    avatar: user.avatar,
    department: user.department,
    position: user.position,
    designation: user.designation,
    designation_id: user.designation_ref?.id || null,
    designation_ref: user.designation_ref || null,
    grade_id: user.grade?.id || null,
    grade: user.grade || null,
    business_unit: user.business_unit || 'ERP',
    supervisor_id: user.supervisor_id,
    supervisor: user.supervisor,
    hire_date: user.hire_date,
    status: user.status,
    is_active: user.is_active,
    created_at: user.created_at,
    updated_at: user.updated_at,
    role: role || null,
    role_name: role?.name || null,
    team_memberships: user.team_memberships || [],
  };
}

export async function find_users({ search, page = 1, limit = 20, role } = {}) {
  page = +page || 1; limit = +limit || 20;
  const skip = (page - 1) * limit;
  const where = { deleted_at: null };

  if (search) {
    where.OR = [
      { first_name: { contains: search, mode: 'insensitive' } },
      { last_name:  { contains: search, mode: 'insensitive' } },
      { email:      { contains: search, mode: 'insensitive' } },
      { department: { name: { contains: search, mode: 'insensitive' } } },
    ];
  }

  if (role) {
    where.roles = { some: { role: { name: role } } };
  }

  const [total, records] = await Promise.all([
    prisma.users.count({ where }),
    prisma.users.findMany({
      where,
      select: USER_SELECT,
      skip,
      take: limit,
      orderBy: { created_at: 'desc' },
    }),
  ]);

  return {
    records: records.map(normalize_user),
    total,
    page,
    limit,
    pages: Math.ceil(total / limit),
  };
}

export async function find_user_by_id(id) {
  const user = await prisma.users.findFirst({
    where: { id, deleted_at: null },
    select: USER_SELECT,
  });
  return user ? normalize_user(user) : null;
}

export async function create_user({ email, password_hash, first_name, last_name, phone, department_id, division_id, position, designation, designation_id, grade_id, role_id, avatar, business_unit, supervisor_id, hire_date, employee_id }) {
  return prisma.$transaction(async (tx) => {
    const user = await tx.users.create({
      data: {
        email,
        password_hash,
        first_name,
        last_name,
        phone,
        ...(department_id ? { department_id } : {}),
        ...(division_id   ? { division_id }   : {}),
        ...(designation_id ? { designation_id } : {}),
        ...(grade_id       ? { grade_id }       : {}),
        ...(supervisor_id  ? { supervisor_id }  : {}),
        ...(employee_id    ? { employee_id }    : {}),
        ...(hire_date      ? { hire_date: new Date(hire_date) } : {}),
        position,
        designation,
        avatar,
        business_unit: business_unit || 'ERP',
        status: 'ACTIVE',
      },
    });

    // Every creation path must leave the user with a role — Quick Add always
    // collects one, but Add Employee's wizard doesn't yet, so fall back to
    // the same default ('EMPLOYEE') already used by invite redemption and
    // Google SSO auto-provisioning, rather than leaving user_roles empty.
    let effective_role_id = role_id;
    if (!effective_role_id) {
      const default_role = await tx.roles.findFirst({ where: { name: 'EMPLOYEE' } });
      effective_role_id = default_role?.id;
    }
    if (effective_role_id) {
      await tx.user_roles.create({ data: { user_id: user.id, role_id: effective_role_id } });
    }

    await tx.user_settings.create({ data: { user_id: user.id } });

    const full_user = await tx.users.findUnique({ where: { id: user.id }, select: USER_SELECT });
    return normalize_user(full_user);
  });
}

// RBAC ISOLATION (critical): update_user is the generic profile-field patch
// used by Employee Directory / Employee Profile / HR flows. It must NEVER
// write to user_roles or user_permissions — role/permission assignment has
// exactly one write path (set_user_role below), reachable only from the
// dedicated RBAC/User Management module. This function used to accept a
// `role_id` and silently delete+recreate the user's user_roles row on any
// generic profile save; that is the exact mechanism that demoted a
// SUPER_ADMIN to EMPLOYEE when their profile was edited from Employee
// Directory (the directory's list payload never carried the real role id,
// so the edit form's role dropdown silently defaulted to EMPLOYEE and that
// wrong value got submitted). role_id/role/roles/permissions/user_permissions
// are now unconditionally stripped here — even if a caller sends them, they
// are ignored, not applied.
export async function update_user(id, data) {
  // Strip relation objects, non-column fields, and anything RBAC-related.
  // `status` is intentionally excluded — Employment Status has exactly one
  // write path (set_employment_status below), never a generic field patch,
  // so it can never drift from employee_profiles.employment_status.
  const {
    role_id, role, roles, permissions, user_permissions,
    password, department, division, supervisor, status,
    ...rest
  } = data;

  // If department_id is a string ID use it; otherwise drop it (frontend may send name)
  const update_data = { ...rest, updated_at: new Date() };
  if (rest.department_id === null || rest.department_id === '') delete update_data.department_id;
  if (rest.designation_id === null || rest.designation_id === '') update_data.designation_id = null;
  if (rest.grade_id === null || rest.grade_id === '') update_data.grade_id = null;
  if (rest.hire_date === '' || rest.hire_date === null) delete update_data.hire_date;
  else if (rest.hire_date !== undefined) update_data.hire_date = new Date(rest.hire_date);

  await prisma.users.update({
    where: { id },
    data: update_data,
  });

  return find_user_by_id(id);
}

// The ONLY write path for a user's role assignment. Callable exclusively
// from the dedicated RBAC/User Management module's role-change endpoint —
// never from generic profile updates (see update_user above).
export async function set_user_role(user_id, role_id) {
  const existing = await prisma.user_roles.findFirst({ where: { user_id } });
  if (existing) {
    await prisma.user_roles.delete({
      where: { user_id_role_id: { user_id, role_id: existing.role_id } },
    });
  }
  await prisma.user_roles.upsert({
    where: { user_id_role_id: { user_id, role_id } },
    update: {},
    create: { user_id, role_id },
  });
  return find_user_by_id(user_id);
}

export async function soft_delete_user(id) {
  return prisma.$transaction(async (tx) => {
    await tx.users.update({
      where: { id },
      data: { deleted_at: new Date(), is_active: false, status: 'INACTIVE' },
    });
    await tx.employee_profiles.upsert({
      where: { user_id: id },
      update: { employment_status: 'INACTIVE' },
      create: { user_id: id, employment_status: 'INACTIVE' },
    });
  });
}

// Employment Status — the ONE write path for this field. Every caller that
// wants to change an employee's operational state (HR profile edit, generic
// user update, future Attendance/Leave automation) must go through this
// function, never write `users.status` or `employee_profiles.employment_status`
// directly — that is exactly the drift Milestone 1 (Sprint 1 Phase 2) exists
// to eliminate. Employee Lifecycle (a separate field, added later) is not
// touched here.
export async function set_employment_status(user_id, status) {
  return prisma.$transaction(async (tx) => {
    await tx.users.update({ where: { id: user_id }, data: { status } });
    await tx.employee_profiles.upsert({
      where: { user_id },
      update: { employment_status: status },
      create: { user_id, employment_status: status },
    });
  });
}

// Promotion / Transfer — the ONE write path for designation_id, grade_id and
// department_id changes. Every caller that wants to record a promotion or
// transfer (the new /user/:id/designation-change endpoint today, any future
// bulk HR tool) must go through this function, never patch these three
// columns via the generic update_user() — that generic edit path is exactly
// the silent, un-audited drift this milestone exists to eliminate.
//
// `changes` may include any subset of { designation_id, grade_id, department_id }.
// change_type is derived: designation_id/grade_id => PROMOTION,
// department_id => TRANSFER, both => PROMOTION_AND_TRANSFER.
export async function record_designation_change(user_id, changes, changed_by) {
  const { designation_id, grade_id, department_id, reason, effective_date } = changes;

  return prisma.$transaction(async (tx) => {
    const current = await tx.users.findUnique({
      where: { id: user_id },
      select: { designation_id: true, grade_id: true, department_id: true },
    });
    if (!current) {
      const e = new Error('User not found');
      e.status_code = 404;
      throw e;
    }

    const update_data = { updated_at: new Date() };
    if (designation_id !== undefined) update_data.designation_id = designation_id || null;
    if (grade_id !== undefined) update_data.grade_id = grade_id || null;
    if (department_id !== undefined) update_data.department_id = department_id || null;

    await tx.users.update({ where: { id: user_id }, data: update_data });

    const is_promotion = designation_id !== undefined || grade_id !== undefined;
    const is_transfer = department_id !== undefined;
    const change_type = is_promotion && is_transfer
      ? 'PROMOTION_AND_TRANSFER'
      : is_transfer
        ? 'TRANSFER'
        : 'PROMOTION';

    const history = await tx.designation_history.create({
      data: {
        user_id,
        previous_designation_id: current.designation_id,
        new_designation_id: designation_id !== undefined ? (designation_id || null) : current.designation_id,
        previous_grade_id: current.grade_id,
        new_grade_id: grade_id !== undefined ? (grade_id || null) : current.grade_id,
        previous_department_id: current.department_id,
        new_department_id: department_id !== undefined ? (department_id || null) : current.department_id,
        change_type,
        effective_date: effective_date ? new Date(effective_date) : new Date(),
        reason: reason || null,
        changed_by,
      },
    });

    const user = await tx.users.findUnique({ where: { id: user_id }, select: USER_SELECT });
    return { user: normalize_user(user), history };
  });
}
