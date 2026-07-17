import { Router } from 'express';
import { authenticate, authorize } from '../../../shared/middleware/authenticate.js';
import {
  create_dependency_ctrl, delete_dependency_ctrl,
  list_dependencies, update_dependency_ctrl,
} from '../controllers/dependencies.controller.js';

const router = Router({ mergeParams: true });
router.use(authenticate);
const MANAGER = authorize('ADMIN', 'SUPER_ADMIN', 'HR', 'DIVISION_MANAGER');

/**
 * @swagger
 * /project/{projectId}/dependencies:
 *   get:
 *     summary: List third-party/infra dependencies for a project
 *     tags: [ProjectDependencies]
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: List of dependencies
 *       401:
 *         description: Unauthorized
 */
router.get('/',                    list_dependencies);

/**
 * @swagger
 * /project/{projectId}/dependencies:
 *   post:
 *     summary: Add a dependency
 *     tags: [ProjectDependencies]
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, type]
 *             properties:
 *               name: { type: string }
 *               type: { type: string, enum: [GITHUB, SERVER, DOMAIN, SMTP, OPENAI, ANTHROPIC, GEMINI, STRIPE, TWILIO, FIREBASE, SUPABASE, AWS, DIGITALOCEAN, CLOUDFLARE, GOOGLE_OAUTH, APPLE_DEVELOPER, PLAY_STORE, OTHER] }
 *               category: { type: string }
 *               owner: { type: string }
 *               status: { type: string, enum: [NOT_STARTED, WAITING, ACTIVE, BLOCKED, COMPLETED] }
 *               vendor: { type: string }
 *               external_url: { type: string }
 *               notes: { type: string }
 *               blocking: { type: boolean }
 *     responses:
 *       201:
 *         description: Dependency created
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post('/',                   MANAGER, create_dependency_ctrl);

/**
 * @swagger
 * /project/{projectId}/dependencies/{dependencyId}:
 *   put:
 *     summary: Update a dependency
 *     tags: [ProjectDependencies]
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: dependencyId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Dependency updated
 *       401:
 *         description: Unauthorized
 */
router.put('/:dependencyId',       MANAGER, update_dependency_ctrl);

/**
 * @swagger
 * /project/{projectId}/dependencies/{dependencyId}:
 *   delete:
 *     summary: Remove a dependency
 *     tags: [ProjectDependencies]
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: dependencyId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Dependency deleted
 *       401:
 *         description: Unauthorized
 */
router.delete('/:dependencyId',    MANAGER, delete_dependency_ctrl);

export default router;
