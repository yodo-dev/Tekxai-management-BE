import prisma from '../../../shared/database/client.js';
import {
  create_new_project,
  delete_existing_project,
  get_project,
  get_saved,
  list_projects,
  toggle_save_project,
  update_existing_project,
} from '../services/projects.service.js';

export async function get_projects(req, res, next) {
  try {
    const { search, page, limit, status } = req.query;
    const ADMIN_ROLES = ['SUPER_ADMIN', 'ADMIN', 'HR', 'MARKETING'];
    const role = req.user?.role_name || req.user?.role || '';
    const member_only = !ADMIN_ROLES.includes(role);
    const result = await list_projects({ search, page: +page || 1, limit: +limit || 20, status, member_only }, req.user.id);
    return res.json({ success: true, payload: result });
  } catch (e) { return next(e); }
}

export async function get_project_by_id(req, res, next) {
  try {
    return res.json({ success: true, payload: await get_project(req.params.id, req.user.id) });
  } catch (e) { return next(e); }
}

export async function create_project_ctrl(req, res, next) {
  try {
    const data = { ...req.body, owner_id: req.body.owner_id || req.user.id };
    return res.status(201).json({ success: true, payload: await create_new_project(data) });
  } catch (e) { return next(e); }
}

export async function update_project_ctrl(req, res, next) {
  try {
    return res.json({ success: true, payload: await update_existing_project(req.params.id, req.body, req.user.id) });
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

export async function request_extension_ctrl(req, res, next) {
  try {
    const { proposed_deadline, reason } = req.body;
    if (!proposed_deadline || !reason?.trim()) {
      return res.status(400).json({ success: false, message: 'proposed_deadline and reason are required' });
    }
    // Store extension request as a project note/comment for admin review
    // For now we notify by updating a meta field — admins see it in approvals
    const project = await prisma.projects.findUnique({ where: { id: req.params.id } });
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

    // Create an approval/notification record
    await prisma.notifications.create({
      data: {
        user_id: req.user.id,
        title: `Deadline Extension Request — ${project.name}`,
        message: `Requested new deadline: ${new Date(proposed_deadline).toLocaleDateString()}. Reason: ${reason}`,
        type: 'PROJECT',
        link: `/admin/project-detail?id=${req.params.id}`,
      },
    }).catch(() => null); // graceful — if notifications table missing just skip

    return res.json({ success: true, message: 'Extension request submitted' });
  } catch (e) { return next(e); }
}
