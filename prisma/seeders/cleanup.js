/**
 * Deletes all operational/demo data while preserving:
 *  - Roles
 *  - Departments & Divisions
 *  - System settings
 *  - Asset categories & locations
 *  - Time-off policies
 *  - Bonus configurations
 *  - Permissions
 *  - The two seeded users (superadmin@tekxai.com, hr@tekxai.com)
 */
import prisma from '../../src/shared/database/client.js';

const KEEP_EMAILS = ['superadmin@tekxai.com', 'hr@tekxai.com'];

async function main() {
  console.log('[cleanup] Starting full data wipe…');

  // --- Delete in dependency order (children before parents) ---

  await prisma.screenshots.deleteMany({});
  console.log('[cleanup] screenshots');

  await prisma.screenshot_sessions.deleteMany({});
  console.log('[cleanup] screenshot_sessions');

  await prisma.productivity_sessions.deleteMany({});
  console.log('[cleanup] productivity_sessions');

  await prisma.timesheet_entries.deleteMany({});
  console.log('[cleanup] timesheet_entries');

  await prisma.timesheet_edit_requests.deleteMany({});
  console.log('[cleanup] timesheet_edit_requests');

  await prisma.time_off_requests.deleteMany({});
  console.log('[cleanup] time_off_requests');

  await prisma.leave_balances.deleteMany({});
  console.log('[cleanup] leave_balances');

  await prisma.late_violations.deleteMany({});
  console.log('[cleanup] late_violations');

  await prisma.attendance_records.deleteMany({});
  console.log('[cleanup] attendance_records');

  await prisma.daily_reports.deleteMany({});
  console.log('[cleanup] daily_reports');

  await prisma.task_comments.deleteMany({});
  await prisma.task_attachments.deleteMany({});
  await prisma.tasks.deleteMany({});
  console.log('[cleanup] tasks');

  await prisma.project_members.deleteMany({});
  await prisma.projects.deleteMany({});
  console.log('[cleanup] projects');

  await prisma.ticket_replies.deleteMany({});
  await prisma.ticket_attachments.deleteMany({});
  await prisma.support_tickets.deleteMany({});
  console.log('[cleanup] tickets');

  await prisma.requisition_approvals.deleteMany({});
  await prisma.requisitions.deleteMany({});
  console.log('[cleanup] requisitions');

  await prisma.asset_assignments.deleteMany({});
  await prisma.asset_maintenance.deleteMany({});
  await prisma.assets.deleteMany({});
  console.log('[cleanup] assets');

  await prisma.contracts.deleteMany({});
  console.log('[cleanup] contracts');

  await prisma.salary_records.deleteMany({}).catch(() => {});
  await prisma.payroll_records.deleteMany({}).catch(() => {});
  console.log('[cleanup] payroll/salary');

  await prisma.employee_performance_scores.deleteMany({});
  await prisma.performance_reviews.deleteMany({}).catch(() => {});
  console.log('[cleanup] performance');

  await prisma.employee_documents.deleteMany({});
  await prisma.employee_profiles.deleteMany({});
  console.log('[cleanup] employee profiles & documents');

  await prisma.onboarding_tasks.deleteMany({});
  console.log('[cleanup] onboarding_tasks');

  await prisma.policy_acknowledgements.deleteMany({});
  await prisma.policies.deleteMany({});
  console.log('[cleanup] policies');

  await prisma.job_descriptions.deleteMany({});
  console.log('[cleanup] job_descriptions');

  await prisma.bonus_payouts.deleteMany({}).catch(() => {});
  await prisma.increment_records.deleteMany({}).catch(() => {});
  console.log('[cleanup] bonus/increments');

  await prisma.expense_items.deleteMany({}).catch(() => {});
  await prisma.expenses.deleteMany({}).catch(() => {});
  console.log('[cleanup] expenses');

  await prisma.starred_items.deleteMany({});
  await prisma.notifications.deleteMany({});
  console.log('[cleanup] starred & notifications');

  await prisma.team_memberships.deleteMany({});
  await prisma.teams.deleteMany({});
  console.log('[cleanup] teams');

  await prisma.password_reset_otps.deleteMany({});
  await prisma.user_sessions.deleteMany({}).catch(() => {});
  console.log('[cleanup] sessions & OTPs');

  // Delete all users EXCEPT the two kept ones
  const keepUsers = await prisma.users.findMany({
    where: { email: { in: KEEP_EMAILS } },
    select: { id: true },
  });
  const keepIds = keepUsers.map(u => u.id);

  // Clean up related records for non-kept users first
  await prisma.user_roles.deleteMany({ where: { user_id: { notIn: keepIds } } });
  await prisma.user_settings.deleteMany({ where: { user_id: { notIn: keepIds } } });
  await prisma.users.deleteMany({ where: { id: { notIn: keepIds } } });
  console.log(`[cleanup] users (kept: ${KEEP_EMAILS.join(', ')})`);

  // Restore the kept users to active state (in case they were soft-deleted)
  await prisma.users.updateMany({
    where: { email: { in: KEEP_EMAILS } },
    data: { deleted_at: null, is_active: true, status: 'ACTIVE' },
  });
  console.log('[cleanup] Restored kept users to ACTIVE');

  console.log('[cleanup] Done. Database is clean.');
}

main()
  .catch(e => { console.error('[cleanup] Error:', e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
