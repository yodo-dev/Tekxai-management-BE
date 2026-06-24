import { Router } from 'express';
import auth_routes          from '../modules/auth/routes/auth.routes.js';
import users_routes         from '../modules/users/routes/users.routes.js';
import teams_routes         from '../modules/teams/routes/teams.routes.js';
import departments_routes   from '../modules/departments/routes/departments.routes.js';
import projects_routes      from '../modules/projects/routes/projects.routes.js';
import tasks_routes         from '../modules/tasks/routes/tasks.routes.js';
import milestones_routes    from '../modules/milestones/routes/milestones.routes.js';
import timesheets_routes    from '../modules/timesheets/routes/timesheets.routes.js';
import invites_routes       from '../modules/invites/routes/invites.routes.js';
import settings_routes      from '../modules/settings/routes/settings.routes.js';
import starred_routes       from '../modules/starred/routes/starred.routes.js';
import notifications_routes from '../modules/notifications/routes/notifications.routes.js';
import tickets_routes       from '../modules/tickets/routes/tickets.routes.js';
import marketing_routes     from '../modules/marketing/routes/marketing.routes.js';
import assets_routes        from '../modules/assets/routes/assets.routes.js';
import activity_routes      from '../modules/activity-logs/routes/activity.routes.js';
import jd_routes            from '../modules/job-descriptions/routes/jd.routes.js';
import leave_balance_routes from '../modules/leave-balances/routes/leave-balances.routes.js';
import attendance_routes    from '../modules/attendance/routes/attendance.routes.js';
import performance_routes   from '../modules/performance/routes/performance.routes.js';
import storage_routes from '../modules/storage/storage.routes.js';
import reports_routes       from '../modules/reports/routes/reports.routes.js';
import monitoring_routes    from '../modules/monitoring/routes/monitoring.routes.js';
import onboarding_routes    from '../modules/onboarding/routes/onboarding.routes.js';
import contracts_routes     from '../modules/contracts/routes/contracts.routes.js';
import policies_routes      from '../modules/policies/routes/policies.routes.js';
import crm_routes              from '../modules/crm/routes/crm.routes.js';
import chat_routes             from '../modules/chat/routes/chat.routes.js';
import hr_profile_routes       from '../modules/hr-profile/routes/hr-profile.routes.js';
import employee_doc_routes     from '../modules/employee-documents/routes/employee-documents.routes.js';
import requisitions_routes     from '../modules/requisitions/routes/requisitions.routes.js';
import permissions_routes      from '../modules/permissions/routes/permissions.routes.js';
import employees_routes        from '../modules/employees/routes/employees.routes.js';
import education_routes        from '../modules/education-records/routes/education-records.routes.js';
import employment_hist_routes  from '../modules/employment-history/routes/employment-history.routes.js';
import increments_routes       from '../modules/increments/routes/increments.routes.js';
import overtime_routes         from '../modules/overtime/routes/overtime.routes.js';
import hr_reports_routes       from '../modules/hr-reports/hr-reports.routes.js';
import expenses_routes         from '../modules/expenses/routes/expenses.routes.js';
import reporting_routes        from '../modules/reporting/routes/reporting.routes.js';

const router = Router();

// Core ERP
router.use('/auth',              auth_routes);
router.use('/user',              users_routes);
router.use('/team',              teams_routes);
router.use('/department',        departments_routes);
router.use('/project',           projects_routes);
router.use('/project/:projectId/tasks',      tasks_routes);
router.use('/project/:projectId/milestones', milestones_routes);
router.use('/timesheet',         timesheets_routes);
router.use('/invite',            invites_routes);
router.use('/settings',          settings_routes);
router.use('/starred',           starred_routes);
router.use('/notification',      notifications_routes);
router.use('/ticket',            tickets_routes);
router.use('/marketing',         marketing_routes);
router.use('/asset',             assets_routes);

// HR & People
router.use('/attendance',        attendance_routes);
router.use('/leave-balance',     leave_balance_routes);
router.use('/performance',       performance_routes);
router.use('/job-description',   jd_routes);
router.use('/onboarding',        onboarding_routes);
router.use('/contract',          contracts_routes);
router.use('/policy',            policies_routes);

// Monitoring & Productivity
router.use('/monitoring',        monitoring_routes);
router.use('/activity-log',      activity_routes);

// Reporting
router.use('/storage',       storage_routes);
router.use('/report',            reports_routes);

// Communication
router.use('/chat',              chat_routes);

// CRM
router.use('/crm',               crm_routes);

// Extended HR
router.use('/hr-profile',        hr_profile_routes);
router.use('/employee-doc',      employee_doc_routes);
router.use('/requisition',       requisitions_routes);

// Permissions management
router.use('/permission',        permissions_routes);

// Employee Directory + Profile
router.use('/employee',          employees_routes);
router.use('/education-record',  education_routes);
router.use('/employment-history',employment_hist_routes);

// Increment module
router.use('/increment',         increments_routes);

// Overtime module
router.use('/overtime',          overtime_routes);

// HR Reports
router.use('/hr-report',         hr_reports_routes);

// Expense Management
router.use('/expenses',          expenses_routes);

// Financial Reporting (Super Admin only)
router.use('/reporting',         reporting_routes);

export default router;
