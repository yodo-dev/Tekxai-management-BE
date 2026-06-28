import { Router } from 'express';
import { authenticate, authorize } from '../../../shared/middleware/authenticate.js';
import { acknowledge_policy, create_policy, get_policy, list_policies, my_acknowledgements, publish_policy, update_policy } from '../controllers/policies.controller.js';

const router = Router();
router.use(authenticate);
const HR = authorize('ADMIN', 'SUPER_ADMIN', 'HR');

/**
 * @swagger
 * /policies:
 *   get:
 *     summary: List all policies
 *     tags: [Policies]
 *     responses:
 *       200:
 *         description: Policies list
 *       401:
 *         description: Unauthorized
 */
router.get('/',                  list_policies);

/**
 * @swagger
 * /policies/my-acknowledgements:
 *   get:
 *     summary: List policies acknowledged by current user
 *     tags: [Policies]
 *     responses:
 *       200:
 *         description: Acknowledgements list
 *       401:
 *         description: Unauthorized
 */
router.get('/my-acknowledgements', my_acknowledgements);

/**
 * @swagger
 * /policies:
 *   post:
 *     summary: Create a policy
 *     tags: [Policies]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, content]
 *             properties:
 *               title: { type: string }
 *               content: { type: string }
 *               category: { type: string }
 *     responses:
 *       201:
 *         description: Policy created
 *       401:
 *         description: Unauthorized
 */
router.post('/',                 HR, create_policy);

/**
 * @swagger
 * /policies/{id}:
 *   get:
 *     summary: Get policy by ID
 *     tags: [Policies]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Policy object
 *       401:
 *         description: Unauthorized
 */
router.get('/:id',               get_policy);

/**
 * @swagger
 * /policies/{id}:
 *   put:
 *     summary: Update a policy
 *     tags: [Policies]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Policy updated
 *       401:
 *         description: Unauthorized
 */
router.put('/:id',               HR, update_policy);

/**
 * @swagger
 * /policies/{id}/publish:
 *   post:
 *     summary: Publish a policy
 *     tags: [Policies]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Policy published
 *       401:
 *         description: Unauthorized
 */
router.post('/:id/publish',      HR, publish_policy);

/**
 * @swagger
 * /policies/{id}/acknowledge:
 *   post:
 *     summary: Acknowledge a policy
 *     tags: [Policies]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Policy acknowledged
 *       401:
 *         description: Unauthorized
 */
router.post('/:id/acknowledge',  acknowledge_policy);

export default router;
