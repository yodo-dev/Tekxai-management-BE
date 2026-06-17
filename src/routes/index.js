import { Router } from 'express';
import auth_routes from '../modules/auth/routes/auth.routes.js';
import users_routes from '../modules/users/routes/users.routes.js';
import teams_routes from '../modules/teams/routes/teams.routes.js';
import departments_routes from '../modules/departments/routes/departments.routes.js';
import projects_routes from '../modules/projects/routes/projects.routes.js';
import timesheets_routes from '../modules/timesheets/routes/timesheets.routes.js';
import invites_routes from '../modules/invites/routes/invites.routes.js';
import settings_routes from '../modules/settings/routes/settings.routes.js';
import starred_routes from '../modules/starred/routes/starred.routes.js';
import notifications_routes from '../modules/notifications/routes/notifications.routes.js';
import tickets_routes from '../modules/tickets/routes/tickets.routes.js';
import marketing_routes from '../modules/marketing/routes/marketing.routes.js';
import assets_routes from '../modules/assets/routes/assets.routes.js';
import performance_routes from '../modules/performance/routes/performance.routes.js';

const router = Router();

router.use('/auth',         auth_routes);
router.use('/user',         users_routes);
router.use('/team',         teams_routes);
router.use('/department',   departments_routes);
router.use('/project',      projects_routes);
router.use('/timesheet',    timesheets_routes);
router.use('/invite',       invites_routes);
router.use('/settings',     settings_routes);
router.use('/starred',      starred_routes);
router.use('/notification', notifications_routes);
router.use('/ticket',       tickets_routes);
router.use('/marketing',    marketing_routes);
router.use('/asset',        assets_routes);
router.use('/performance',  performance_routes);

export default router;
