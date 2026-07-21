import prisma from '../../../shared/database/client.js';

const INCLUDE = {
  assigner: { select: { id: true, first_name: true, last_name: true } },
};

export async function find_access_items_by_user(user_id) {
  return prisma.employee_access_items.findMany({
    where: { user_id },
    orderBy: [{ status: 'asc' }, { created_at: 'desc' }],
    include: INCLUDE,
  });
}

export async function find_access_item_by_id(id) {
  return prisma.employee_access_items.findFirst({ where: { id }, include: INCLUDE });
}

export async function create_access_item({ user_id, platform, identifier, status, granted_date, revoked_date, assigned_by, remarks }) {
  return prisma.employee_access_items.create({
    data: {
      user_id,
      platform,
      identifier: identifier || null,
      status: status || 'ACTIVE',
      granted_date: granted_date ? new Date(granted_date) : new Date(),
      revoked_date: revoked_date ? new Date(revoked_date) : null,
      assigned_by: assigned_by || null,
      remarks: remarks || null,
    },
    include: INCLUDE,
  });
}

export async function update_access_item(id, data) {
  const payload = {};
  if (data.platform !== undefined) payload.platform = data.platform;
  if (data.identifier !== undefined) payload.identifier = data.identifier || null;
  if (data.status !== undefined) payload.status = data.status;
  if (data.granted_date !== undefined) payload.granted_date = data.granted_date ? new Date(data.granted_date) : null;
  if (data.revoked_date !== undefined) payload.revoked_date = data.revoked_date ? new Date(data.revoked_date) : null;
  if (data.remarks !== undefined) payload.remarks = data.remarks || null;
  // Revoking always stamps revoked_date "now" unless the caller supplied
  // one explicitly above — HR shouldn't have to remember to set the date
  // every time they flip the status.
  if (data.status === 'REVOKED' && data.revoked_date === undefined) payload.revoked_date = new Date();
  return prisma.employee_access_items.update({ where: { id }, data: payload, include: INCLUDE });
}

export async function delete_access_item(id) {
  return prisma.employee_access_items.delete({ where: { id } });
}
