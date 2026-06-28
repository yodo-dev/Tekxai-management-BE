import { Router } from 'express';
import { authenticate, authorize } from '../../../shared/middleware/authenticate.js';
import { create_doc_ctrl, delete_doc_ctrl, get_doc_types_ctrl, get_docs_ctrl, update_doc_ctrl } from '../controllers/employee-documents.controller.js';

const router = Router();
router.use(authenticate);

const ADMIN_HR = authorize('SUPER_ADMIN', 'ADMIN', 'HR');

/**
 * @swagger
 * /employee-documents/types:
 *   get:
 *     summary: List document types
 *     tags: [Employee Documents]
 *     responses:
 *       200:
 *         description: Document types
 *       401:
 *         description: Unauthorized
 */
router.get('/types', get_doc_types_ctrl);

/**
 * @swagger
 * /employee-documents/{userId}:
 *   get:
 *     summary: List documents for a user
 *     tags: [Employee Documents]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Documents list
 *       401:
 *         description: Unauthorized
 */
router.get('/:userId',            ADMIN_HR, get_docs_ctrl);

/**
 * @swagger
 * /employee-documents/{userId}:
 *   post:
 *     summary: Upload a document for a user
 *     tags: [Employee Documents]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [doc_type, file_url, file_name]
 *             properties:
 *               doc_type: { type: string }
 *               file_url: { type: string }
 *               file_name: { type: string }
 *               expiry_date: { type: string, format: date }
 *     responses:
 *       201:
 *         description: Document uploaded
 *       401:
 *         description: Unauthorized
 */
router.post('/:userId',           ADMIN_HR, create_doc_ctrl);

/**
 * @swagger
 * /employee-documents/{userId}/{docId}:
 *   put:
 *     summary: Update a user document
 *     tags: [Employee Documents]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: docId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Document updated
 *       401:
 *         description: Unauthorized
 */
router.put('/:userId/:docId',     ADMIN_HR, update_doc_ctrl);

/**
 * @swagger
 * /employee-documents/{userId}/{docId}:
 *   delete:
 *     summary: Delete a user document
 *     tags: [Employee Documents]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: docId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Document deleted
 *       401:
 *         description: Unauthorized
 */
router.delete('/:userId/:docId',  ADMIN_HR, delete_doc_ctrl);

export default router;
