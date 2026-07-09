import prisma from '../../../shared/database/client.js';
import { get_hr_profile, upsert_hr_profile, get_full_employee_record } from '../services/hr-profile.service.js';

// Resolve a param that may be a DB cuid OR a human-readable employee_id (e.g. TXI-0046)
async function resolve_user_id(param) {
  if (!param) return param;
  const is_slug = /^[A-Z]+-\d+$/.test(param);
  if (!is_slug) return param;
  const user = await prisma.users.findFirst({ where: { employee_id: param, deleted_at: null }, select: { id: true } });
  return user?.id || param;
}

export async function get_profile_ctrl(req, res, next) {
  try {
    const user_id = await resolve_user_id(req.params.userId || req.user.id);
    const profile = await get_hr_profile(user_id);
    return res.json({ success: true, payload: profile });
  } catch (e) { return next(e); }
}

export async function upsert_profile_ctrl(req, res, next) {
  try {
    const user_id = await resolve_user_id(req.params.userId);
    const profile = await upsert_hr_profile(user_id, req.body, req.user.id);
    return res.json({ success: true, payload: profile });
  } catch (e) { return next(e); }
}

export async function get_full_record_ctrl(req, res, next) {
  try {
    const record = await get_full_employee_record(req.params.userId);
    if (!record) return res.status(404).json({ success: false, message: 'Employee not found' });
    return res.json({ success: true, payload: record });
  } catch (e) { return next(e); }
}

export async function get_designations_ctrl(_req, res, next) {
  try {
    const designations = [
      { value: 'frontend-developer', label: 'Frontend Developer' },
      { value: 'backend-developer', label: 'Backend Developer' },
      { value: 'fullstack-developer', label: 'Full Stack Developer' },
      { value: 'mobile-developer', label: 'Mobile Developer' },
      { value: 'devops-engineer', label: 'DevOps Engineer' },
      { value: 'ai-engineer', label: 'AI Engineer' },
      { value: 'ui-ux-designer', label: 'UI/UX Designer' },
      { value: 'qa-engineer', label: 'QA Engineer' },
      { value: 'cms-developer', label: 'CMS Developer' },
      { value: 'team-lead', label: 'Team Lead' },
      { value: 'tech-lead', label: 'Tech Lead' },
      { value: 'project-manager', label: 'Project Manager' },
      { value: 'business-analyst', label: 'Business Analyst' },
      { value: 'estimator', label: 'Estimator' },
      { value: 'hr-manager', label: 'HR Manager' },
      { value: 'hr-executive', label: 'HR Executive' },
      { value: 'recruiter', label: 'Recruiter' },
      { value: 'marketing-executive', label: 'Marketing Executive' },
      { value: 'sales-executive', label: 'Sales Executive' },
      { value: 'business-development', label: 'Business Development' },
      { value: 'account-manager', label: 'Account Manager' },
      { value: 'operations-manager', label: 'Operations Manager' },
      { value: 'finance-officer', label: 'Finance Officer' },
      { value: 'intern', label: 'Intern' },
      { value: 'trainee', label: 'Trainee' },
      { value: 'ceo', label: 'CEO' },
      { value: 'cto', label: 'CTO' },
      { value: 'other', label: 'Other' },
    ];
    return res.json({ success: true, payload: designations });
  } catch (e) { return next(e); }
}
