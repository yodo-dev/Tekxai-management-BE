import { Router } from 'express';
import { authenticate, authorize } from '../../../shared/middleware/authenticate.js';
import { create_contract, create_template, get_contract, list_contracts, list_templates, sign_contract, update_contract, update_template } from '../controllers/contracts.controller.js';

const router = Router();
router.use(authenticate);
const HR = authorize('ADMIN', 'SUPER_ADMIN', 'HR');

/**
 * @swagger
 * /contracts/templates:
 *   get:
 *     summary: List contract templates
 *     tags: [Contracts]
 *     responses:
 *       200:
 *         description: Templates list
 *       401:
 *         description: Unauthorized
 */
router.get('/templates',     HR, list_templates);

/**
 * @swagger
 * /contracts/templates:
 *   post:
 *     summary: Create a contract template
 *     tags: [Contracts]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, body]
 *             properties:
 *               name: { type: string }
 *               body: { type: string }
 *     responses:
 *       201:
 *         description: Template created
 *       401:
 *         description: Unauthorized
 */
router.post('/templates',    HR, create_template);

/**
 * @swagger
 * /contracts/templates/{id}:
 *   put:
 *     summary: Update a contract template
 *     tags: [Contracts]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Template updated
 *       401:
 *         description: Unauthorized
 */
router.put('/templates/:id', HR,   update_template);

/**
 * @swagger
 * /contracts:
 *   get:
 *     summary: List contracts
 *     tags: [Contracts]
 *     responses:
 *       200:
 *         description: Contracts list
 *       401:
 *         description: Unauthorized
 */
router.get('/',              list_contracts);

/**
 * @swagger
 * /contracts:
 *   post:
 *     summary: Create a contract
 *     tags: [Contracts]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [user_id, template_id]
 *             properties:
 *               user_id: { type: string }
 *               template_id: { type: string }
 *               start_date: { type: string, format: date }
 *               end_date: { type: string, format: date }
 *     responses:
 *       201:
 *         description: Contract created
 *       401:
 *         description: Unauthorized
 */
router.post('/',             HR, create_contract);

/**
 * @swagger
 * /contracts/{id}:
 *   get:
 *     summary: Get contract by ID
 *     tags: [Contracts]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Contract object
 *       401:
 *         description: Unauthorized
 */
router.get('/:id',           get_contract);

/**
 * @swagger
 * /contracts/{id}:
 *   put:
 *     summary: Update a contract
 *     tags: [Contracts]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Contract updated
 *       401:
 *         description: Unauthorized
 */
router.put('/:id',           HR,   update_contract);

/**
 * @swagger
 * /contracts/{id}/sign:
 *   post:
 *     summary: Sign a contract
 *     tags: [Contracts]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Contract signed
 *       401:
 *         description: Unauthorized
 */
router.post('/:id/sign',     sign_contract);

export default router;
