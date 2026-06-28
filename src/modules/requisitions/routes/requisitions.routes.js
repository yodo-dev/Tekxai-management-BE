import { Router } from 'express';
import { authenticate, authorize } from '../../../shared/middleware/authenticate.js';
import { approve_ctrl, create_ctrl, get_ctrl, get_meta_ctrl, list_ctrl, status_ctrl, submit_ctrl, update_ctrl, convert_to_asset_ctrl, update_cost_ctrl, stats_ctrl } from '../controllers/requisitions.controller.js';

const router = Router();
router.use(authenticate);

const ADMIN_HR = authorize('SUPER_ADMIN', 'ADMIN', 'HR');

/**
 * @swagger
 * /requisitions/meta:
 *   get:
 *     summary: Get requisition form metadata (categories, priorities)
 *     tags: [Requisitions]
 *     responses:
 *       200:
 *         description: Form metadata
 *       401:
 *         description: Unauthorized
 */
router.get('/meta',                get_meta_ctrl);

/**
 * @swagger
 * /requisitions/stats:
 *   get:
 *     summary: Get requisition statistics
 *     tags: [Requisitions]
 *     responses:
 *       200:
 *         description: Requisition stats
 *       401:
 *         description: Unauthorized
 */
router.get('/stats',               ADMIN_HR, stats_ctrl);

/**
 * @swagger
 * /requisitions:
 *   get:
 *     summary: List requisitions (scoped to own for non-admins)
 *     tags: [Requisitions]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string }
 *       - in: query
 *         name: page
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Requisitions list
 *       401:
 *         description: Unauthorized
 */
router.get('/',                    list_ctrl);

/**
 * @swagger
 * /requisitions:
 *   post:
 *     summary: Create a requisition
 *     tags: [Requisitions]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, category]
 *             properties:
 *               title: { type: string }
 *               category: { type: string }
 *               description: { type: string }
 *               quantity: { type: integer }
 *               estimated_cost: { type: number }
 *               priority: { type: string }
 *     responses:
 *       201:
 *         description: Requisition created
 *       401:
 *         description: Unauthorized
 */
router.post('/',   create_ctrl);

/**
 * @swagger
 * /requisitions/{id}:
 *   get:
 *     summary: Get requisition by ID
 *     tags: [Requisitions]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Requisition object
 *       401:
 *         description: Unauthorized
 */
router.get('/:id',                 get_ctrl);

/**
 * @swagger
 * /requisitions/{id}:
 *   put:
 *     summary: Update a requisition
 *     tags: [Requisitions]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Requisition updated
 *       401:
 *         description: Unauthorized
 */
router.put('/:id',                 update_ctrl);

/**
 * @swagger
 * /requisitions/{id}/submit:
 *   post:
 *     summary: Submit a requisition for approval
 *     tags: [Requisitions]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Requisition submitted
 *       401:
 *         description: Unauthorized
 */
router.post('/:id/submit',         submit_ctrl);

/**
 * @swagger
 * /requisitions/{id}/approve:
 *   post:
 *     summary: Approve a requisition
 *     tags: [Requisitions]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               comment: { type: string }
 *               action: { type: string, enum: [APPROVE, REJECT] }
 *     responses:
 *       200:
 *         description: Decision recorded
 *       401:
 *         description: Unauthorized
 */
router.post('/:id/approve',        ADMIN_HR, approve_ctrl);

/**
 * @swagger
 * /requisitions/{id}/status:
 *   patch:
 *     summary: Update requisition status
 *     tags: [Requisitions]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status: { type: string }
 *     responses:
 *       200:
 *         description: Status updated
 *       401:
 *         description: Unauthorized
 */
router.patch('/:id/status',        ADMIN_HR, status_ctrl);

/**
 * @swagger
 * /requisitions/{id}/cost:
 *   patch:
 *     summary: Update actual cost of a requisition
 *     tags: [Requisitions]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               actual_cost: { type: number }
 *     responses:
 *       200:
 *         description: Cost updated
 *       401:
 *         description: Unauthorized
 */
router.patch('/:id/cost',          ADMIN_HR, update_cost_ctrl);

/**
 * @swagger
 * /requisitions/{id}/convert-to-asset:
 *   post:
 *     summary: Convert approved requisition to asset
 *     tags: [Requisitions]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Asset created from requisition
 *       401:
 *         description: Unauthorized
 */
router.post('/:id/convert-to-asset', ADMIN_HR,     convert_to_asset_ctrl);

export default router;
