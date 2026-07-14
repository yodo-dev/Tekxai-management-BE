import prisma from '../../../shared/database/client.js';
import { find_devops_access_by_project, upsert_devops_access } from '../repositories/devops-access.repository.js';
import { validate_devops_access } from '../validators/devops-access.validation.js';
import { log_activity } from '../../activity-logs/repositories/activity.repository.js';

function ok(res, payload, msg = 'OK', status = 200) {
  return res.status(status).json({ success: true, message: msg, payload });
}
function fail(res, msg, status = 400) {
  return res.status(status).json({ success: false, message: msg });
}

const ADMIN_ROLES = ['ADMIN', 'SUPER_ADMIN'];

export async function admin_or_project_owner(req, res, next) {
  try {
    if (req.user.roles?.some((r) => ADMIN_ROLES.includes(r))) return next();
    const project = await prisma.projects.findFirst({
      where: { id: req.params.projectId, deleted_at: null },
      select: { owner_id: true, leader_id: true },
    });
    if (!project) return fail(res, 'Project not found', 404);
    if (project.owner_id === req.user.id || project.leader_id === req.user.id) return next();
    return fail(res, 'Insufficient permissions', 403);
  } catch (err) { next(err); }
}

export async function get_devops_access_ctrl(req, res, next) {
  try {
    const record = await find_devops_access_by_project(req.params.projectId);
    return ok(res, record);
  } catch (err) { next(err); }
}

const DIFF_FIELD_LABELS = {
  point_of_communication: 'Point of Communication',
  progress_shared_status: 'Progress Shared',
  git_access_status: 'Git access',
  server_access_status: 'Server access',
  domain_access_status: 'Domain access',
  email_smtp_access_status: 'Email/SMTP access',
  aws_access_status: 'AWS access',
  devops_remarks: 'DevOps remarks',
};

function describe_devops_diff(before, after) {
  const changes = Object.keys(DIFF_FIELD_LABELS)
    .filter((f) => before[f] !== after[f])
    .map((f) => `${DIFF_FIELD_LABELS[f]} changed to ${after[f] ?? '—'}`);
  return changes.length ? changes.join('; ') : 'Updated DevOps access tracking';
}

export async function update_devops_access_ctrl(req, res, next) {
  try {
    const { valid, message } = validate_devops_access(req.body);
    if (!valid) return fail(res, message);
    const before = await find_devops_access_by_project(req.params.projectId);
    const record = await upsert_devops_access(req.params.projectId, req.body);
    log_activity({
      user_id: req.user.id, action: 'UPDATE', entity_type: 'project', entity_id: req.params.projectId,
      description: describe_devops_diff(before, record),
    }).catch(() => {});
    return ok(res, record, 'DevOps access updated');
  } catch (err) { next(err); }
}
