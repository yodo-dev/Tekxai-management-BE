import { Router } from 'express';
import { authenticate } from '../../../shared/middleware/authenticate.js';
import { get_queries, star_item_ctrl, unstar_item_ctrl } from '../controllers/starred.controller.js';

const router = Router();
router.use(authenticate);

/**
 * @swagger
 * /starred/queries:
 *   get:
 *     summary: Get starred report builder queries
 *     tags: [Starred]
 *     responses:
 *       200:
 *         description: Starred queries
 *       401:
 *         description: Unauthorized
 */
router.get('/queries', get_queries);

/**
 * @swagger
 * /starred/{item_type}/{id}:
 *   post:
 *     summary: Star an item
 *     tags: [Starred]
 *     parameters:
 *       - in: path
 *         name: item_type
 *         required: true
 *         schema: { type: string }
 *         description: Type of item (e.g. project, task)
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Item starred
 *       401:
 *         description: Unauthorized
 */
router.post('/:item_type/:id', star_item_ctrl);

/**
 * @swagger
 * /starred/{item_type}/{id}:
 *   delete:
 *     summary: Unstar an item
 *     tags: [Starred]
 *     parameters:
 *       - in: path
 *         name: item_type
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Item unstarred
 *       401:
 *         description: Unauthorized
 */
router.delete('/:item_type/:id', unstar_item_ctrl);

export default router;
