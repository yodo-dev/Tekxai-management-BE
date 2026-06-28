import { Router } from 'express';
import { authenticate, authorize } from '../../../shared/middleware/authenticate.js';
import { upload_middleware, parse_file, get_internal_data, save_report, list_reports, get_report, delete_report } from '../controllers/reporting.controller.js';

const router = Router();
router.use(authenticate);
const SA = authorize('SUPER_ADMIN');

/**
 * @swagger
 * /reporting/parse:
 *   post:
 *     summary: Parse and import a financial report file
 *     tags: [Financial Reporting]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: File parsed
 *       400:
 *         description: Invalid file
 *       401:
 *         description: Unauthorized
 */
router.post('/parse', SA, upload_middleware.single('file'), parse_file);

/**
 * @swagger
 * /reporting/internal-data:
 *   get:
 *     summary: Get internal financial data for reporting
 *     tags: [Financial Reporting]
 *     responses:
 *       200:
 *         description: Internal data
 *       401:
 *         description: Unauthorized
 */
router.get('/internal-data', SA, get_internal_data);

/**
 * @swagger
 * /reporting:
 *   post:
 *     summary: Save a financial report
 *     tags: [Financial Reporting]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, data]
 *             properties:
 *               name: { type: string }
 *               data: { type: object }
 *     responses:
 *       201:
 *         description: Report saved
 *       401:
 *         description: Unauthorized
 */
router.post('/', SA, save_report);

/**
 * @swagger
 * /reporting:
 *   get:
 *     summary: List saved financial reports
 *     tags: [Financial Reporting]
 *     responses:
 *       200:
 *         description: Reports list
 *       401:
 *         description: Unauthorized
 */
router.get('/', SA, list_reports);

/**
 * @swagger
 * /reporting/{id}:
 *   get:
 *     summary: Get a financial report by ID
 *     tags: [Financial Reporting]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Report object
 *       401:
 *         description: Unauthorized
 */
router.get('/:id', SA, get_report);

/**
 * @swagger
 * /reporting/{id}:
 *   delete:
 *     summary: Delete a financial report
 *     tags: [Financial Reporting]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Report deleted
 *       401:
 *         description: Unauthorized
 */
router.delete('/:id', SA, delete_report);

export default router;
