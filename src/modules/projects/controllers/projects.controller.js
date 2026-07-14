import prisma from '../../../shared/database/client.js';
import {
  create_new_project,
  delete_existing_project,
  get_dashboard,
  get_project,
  get_saved,
  list_projects,
  toggle_save_project,
  update_existing_project,
} from '../services/projects.service.js';
import {
  validate_create_project,
  validate_update_project,
  validate_budget_update,
  validate_extension_request,
  validate_extension_review,
} from '../validators/projects.validation.js';
import { log_activity } from '../../activity-logs/repositories/activity.repository.js';
import {
  create_extension_request,
  find_extension_requests,
  find_extension_request_by_id,
  review_extension_request,
} from '../repositories/projects.repository.js';

const ADMIN_ONLY_ROLES = ['ADMIN', 'SUPER_ADMIN'];

// Reviewing an extension request is gated to ADMIN/SUPER_ADMIN or the project's own owner/leader.
export async function admin_or_project_owner(req, res, next) {
  try {
    if (req.user.roles?.some((r) => ADMIN_ONLY_ROLES.includes(r))) return next();
    const project = await prisma.projects.findFirst({
      where: { id: req.params.id, deleted_at: null },
      select: { owner_id: true, leader_id: true },
    });
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });
    if (project.owner_id === req.user.id || project.leader_id === req.user.id) return next();
    return res.status(403).json({ success: false, message: 'Insufficient permissions' });
  } catch (e) { next(e); }
}

export async function get_projects(req, res, next) {
  try {
    const { search, page, limit, status, client_name, owner_id, overdue } = req.query;
    const ADMIN_ROLES = ['SUPER_ADMIN', 'ADMIN', 'HR', 'MARKETING'];
    const member_only = !req.user?.roles?.some((r) => ADMIN_ROLES.includes(r));
    const result = await list_projects({ search, page: +page || 1, limit: +limit || 20, status, client_name, owner_id, overdue, member_only }, req.user.id);
    return res.json({ success: true, payload: result });
  } catch (e) { return next(e); }
}

export async function get_dashboard_stats_ctrl(req, res, next) {
  try {
    return res.json({ success: true, payload: await get_dashboard() });
  } catch (e) { return next(e); }
}

export async function get_project_by_id(req, res, next) {
  try {
    return res.json({ success: true, payload: await get_project(req.params.id, req.user.id) });
  } catch (e) { return next(e); }
}

export async function create_project_ctrl(req, res, next) {
  try {
    const { valid, message } = validate_create_project(req.body);
    if (!valid) return res.status(400).json({ success: false, message });
    const data = { ...req.body, owner_id: req.body.owner_id || req.user.id };
    return res.status(201).json({ success: true, payload: await create_new_project(data) });
  } catch (e) { return next(e); }
}

function name_of(user) {
  if (!user) return 'Unknown';
  return `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email || 'Unknown';
}

// Diffs the member list before/after an update and logs one entry per
// meaningful change (added / removed / role changed) — reuses the same
// activity_logs table/entity_type as every other project event, no new store.
function log_member_changes({ user_id, project_id, before_members, after_members }) {
  const before_map = new Map(before_members.map((m) => [m.user_id, m]));
  const after_map = new Map(after_members.map((m) => [m.user_id, m]));

  for (const [uid, after] of after_map) {
    const before = before_map.get(uid);
    if (!before) {
      log_activity({
        user_id, action: 'UPDATE', entity_type: 'project', entity_id: project_id,
        description: `Added ${name_of(after.user)} to the team as ${after.role}`,
      }).catch(() => {});
    } else if (before.role !== after.role) {
      log_activity({
        user_id, action: 'UPDATE', entity_type: 'project', entity_id: project_id,
        description: `Changed ${name_of(after.user)}'s role from ${before.role} to ${after.role}`,
      }).catch(() => {});
    }
  }

  for (const [uid, before] of before_map) {
    if (!after_map.has(uid)) {
      log_activity({
        user_id, action: 'UPDATE', entity_type: 'project', entity_id: project_id,
        description: `Removed ${name_of(before.user)} from the team`,
      }).catch(() => {});
    }
  }
}

export async function update_project_ctrl(req, res, next) {
  try {
    const { valid, message } = validate_update_project(req.body);
    if (!valid) return res.status(400).json({ success: false, message });

    const needs_before = req.body.status !== undefined || req.body.progress !== undefined
      || Array.isArray(req.body.members) || Array.isArray(req.body.member_ids);
    const before = needs_before
      ? await prisma.projects.findUnique({
        where: { id: req.params.id },
        select: {
          status: true, title: true, owner_id: true, leader_id: true, progress: true,
          members: { select: { user_id: true, role: true, user: { select: { first_name: true, last_name: true, email: true } } } },
        },
      })
      : null;

    const updated = await update_existing_project(req.params.id, req.body, req.user.id);

    if (before && req.body.progress !== undefined && +req.body.progress !== before.progress) {
      log_activity({
        user_id: req.user.id, action: 'UPDATE', entity_type: 'project', entity_id: req.params.id,
        description: `Progress updated from ${before.progress}% to ${req.body.progress}%`,
      }).catch(() => {});
    }

    if (before && (Array.isArray(req.body.members) || Array.isArray(req.body.member_ids))) {
      log_member_changes({
        user_id: req.user.id,
        project_id: req.params.id,
        before_members: before.members,
        after_members: updated.members.map((m) => ({ user_id: m.id, role: m.role, user: m })),
      });
    }

    if (before && req.body.status !== undefined && req.body.status !== before.status) {
      log_activity({
        user_id: req.user.id, action: 'UPDATE', entity_type: 'project', entity_id: req.params.id,
        description: `Status changed from ${before.status} to ${req.body.status}`,
      }).catch(() => {});

      // No scheduler exists in this codebase for time-based checks (delivery/milestone overdue),
      // so notifications here are limited to event-driven transitions like BLOCKED.
      if (req.body.status === 'BLOCKED') {
        const recipients = [...new Set([before.owner_id, before.leader_id].filter(Boolean))];
        for (const user_id of recipients) {
          prisma.notifications.create({
            data: {
              user_id,
              title: `Project Blocked — ${before.title}`,
              message: `${req.user.email} marked "${before.title}" as BLOCKED.`,
              type: 'PROJECT',
            },
          }).catch(() => null);
        }
      }
    }

    return res.json({ success: true, payload: updated });
  } catch (e) { return next(e); }
}

export async function delete_project_ctrl(req, res, next) {
  try {
    await delete_existing_project(req.params.id);
    return res.json({ success: true, message: 'Project deleted' });
  } catch (e) { return next(e); }
}

export async function get_saved_projects(req, res, next) {
  try {
    const projects = await get_saved(req.user.id, req.query);
    return res.json({ success: true, payload: { records: projects } });
  } catch (e) { return next(e); }
}

export async function save_project_ctrl(req, res, next) {
  try {
    await toggle_save_project(req.user.id, req.params.id, 'save');
    return res.json({ success: true, message: 'Project saved' });
  } catch (e) { return next(e); }
}

export async function unsave_project_ctrl(req, res, next) {
  try {
    await toggle_save_project(req.user.id, req.params.id, 'unsave');
    return res.json({ success: true, message: 'Project unsaved' });
  } catch (e) { return next(e); }
}

export async function update_budget(req, res, next) {
  try {
    const { valid, message } = validate_budget_update(req.body);
    if (!valid) return res.status(400).json({ success: false, message });

    const { budget, budget_currency, budget_spent } = req.body;
    const project = await prisma.projects.update({
      where: { id: req.params.id },
      data: {
        ...(budget !== undefined && { budget: budget === null || budget === '' ? null : +budget }),
        ...(budget_currency && { budget_currency }),
        ...(budget_spent !== undefined && { budget_spent: +budget_spent }),
      },
    });

    log_activity({
      user_id: req.user.id, action: 'UPDATE', entity_type: 'project', entity_id: req.params.id,
      description: `Updated budget: ${project.budget_currency} ${project.budget ?? 'n/a'} (spent: ${project.budget_spent})`,
    }).catch(() => {});

    return res.json({ success: true, message: 'Budget updated', payload: project });
  } catch (e) { next(e); }
}

export async function request_extension_ctrl(req, res, next) {
  try {
    const { valid, message } = validate_extension_request(req.body);
    if (!valid) return res.status(400).json({ success: false, message });

    const { proposed_deadline, reason } = req.body;
    const project = await prisma.projects.findUnique({ where: { id: req.params.id } });
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

    const request = await create_extension_request({
      project_id: req.params.id,
      requested_by: req.user.id,
      current_deadline: project.end_date,
      proposed_deadline,
      reason,
    });

    // Notify admin/owner/leader that a review is needed.
    const recipients = [...new Set([project.owner_id, project.leader_id].filter((id) => id && id !== req.user.id))];
    for (const user_id of recipients) {
      prisma.notifications.create({
        data: {
          user_id,
          title: `Deadline Extension Requested — ${project.title}`,
          message: `${req.user.email} requested a new deadline: ${new Date(proposed_deadline).toLocaleDateString()}. Reason: ${reason}`,
          type: 'PROJECT',
        },
      }).catch(() => null);
    }

    log_activity({
      user_id: req.user.id, action: 'CREATE', entity_type: 'project', entity_id: req.params.id,
      description: `Requested deadline extension to ${new Date(proposed_deadline).toLocaleDateString()}: ${reason}`,
    }).catch(() => {});

    return res.status(201).json({ success: true, message: 'Extension request submitted', payload: request });
  } catch (e) { return next(e); }
}

export async function list_extension_requests_ctrl(req, res, next) {
  try {
    const requests = await find_extension_requests(req.params.id);
    return res.json({ success: true, payload: requests });
  } catch (e) { return next(e); }
}

export async function review_extension_request_ctrl(req, res, next) {
  try {
    const { valid, message } = validate_extension_review(req.body);
    if (!valid) return res.status(400).json({ success: false, message });

    const existing = await find_extension_request_by_id(req.params.requestId);
    if (!existing || existing.project_id !== req.params.id) {
      return res.status(404).json({ success: false, message: 'Extension request not found' });
    }
    if (existing.status !== 'PENDING') {
      return res.status(400).json({ success: false, message: `Request already ${existing.status.toLowerCase()}` });
    }

    const { status, review_reason } = req.body;
    const reviewed = await review_extension_request(req.params.requestId, {
      status, reviewed_by: req.user.id, review_reason,
    });

    const decision = status === 'APPROVED' ? 'approved' : 'rejected';
    prisma.notifications.create({
      data: {
        user_id: existing.requested_by,
        title: `Extension Request ${decision === 'approved' ? 'Approved' : 'Rejected'} — ${existing.project?.title || ''}`,
        message: decision === 'approved'
          ? `Your deadline extension to ${new Date(existing.proposed_deadline).toLocaleDateString()} was approved.`
          : `Your deadline extension request was rejected. Reason: ${review_reason}`,
        type: 'PROJECT',
      },
    }).catch(() => null);

    log_activity({
      user_id: req.user.id, action: 'UPDATE', entity_type: 'project', entity_id: req.params.id,
      description: `${decision === 'approved' ? 'Approved' : 'Rejected'} deadline extension request${review_reason ? `: ${review_reason}` : ''}`,
    }).catch(() => {});

    return res.json({ success: true, message: `Extension request ${decision}`, payload: reviewed });
  } catch (e) { return next(e); }
}
