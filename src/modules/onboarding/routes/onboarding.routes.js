import { Router } from 'express';
import { authenticate, authorize } from '../../../shared/middleware/authenticate.js';
import { accept_offer, complete_task, create_candidate, create_offer, create_task, get_candidate, get_tasks, list_candidates, reject_offer, send_offer } from '../controllers/onboarding.controller.js';

const router = Router();
router.use(authenticate);
const HR = authorize('ADMIN', 'SUPER_ADMIN', 'HR');

/**
 * @swagger
 * /onboarding/candidates:
 *   get:
 *     summary: List onboarding candidates
 *     tags: [Onboarding]
 *     responses:
 *       200:
 *         description: Candidates list
 *       401:
 *         description: Unauthorized
 */
router.get('/candidates',         HR,   list_candidates);

/**
 * @swagger
 * /onboarding/candidates:
 *   post:
 *     summary: Create a candidate
 *     tags: [Onboarding]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [first_name, last_name, email]
 *             properties:
 *               first_name: { type: string }
 *               last_name: { type: string }
 *               email: { type: string, format: email }
 *               position: { type: string }
 *     responses:
 *       201:
 *         description: Candidate created
 *       401:
 *         description: Unauthorized
 */
router.post('/candidates',        HR, create_candidate);

/**
 * @swagger
 * /onboarding/candidates/{id}:
 *   get:
 *     summary: Get a candidate by ID
 *     tags: [Onboarding]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Candidate object
 *       401:
 *         description: Unauthorized
 */
router.get('/candidates/:id',     HR,   get_candidate);

/**
 * @swagger
 * /onboarding/offers:
 *   post:
 *     summary: Create an offer letter
 *     tags: [Onboarding]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [candidate_id]
 *             properties:
 *               candidate_id: { type: string }
 *               salary: { type: number }
 *               start_date: { type: string, format: date }
 *     responses:
 *       201:
 *         description: Offer created
 *       401:
 *         description: Unauthorized
 */
router.post('/offers',            HR, create_offer);

/**
 * @swagger
 * /onboarding/offers/{id}/send:
 *   post:
 *     summary: Send offer to candidate
 *     tags: [Onboarding]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Offer sent
 *       401:
 *         description: Unauthorized
 */
router.post('/offers/:id/send',   HR, send_offer);

/**
 * @swagger
 * /onboarding/offers/{id}/accept:
 *   post:
 *     summary: Accept an offer (candidate action)
 *     tags: [Onboarding]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Offer accepted
 *       401:
 *         description: Unauthorized
 */
router.post('/offers/:id/accept', accept_offer);

/**
 * @swagger
 * /onboarding/offers/{id}/reject:
 *   post:
 *     summary: Reject an offer (candidate action)
 *     tags: [Onboarding]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Offer rejected
 *       401:
 *         description: Unauthorized
 */
router.post('/offers/:id/reject', reject_offer);

/**
 * @swagger
 * /onboarding/tasks/{userId}:
 *   get:
 *     summary: Get onboarding tasks for a user
 *     tags: [Onboarding]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Tasks list
 *       401:
 *         description: Unauthorized
 */
router.get('/tasks/:userId',      HR,   get_tasks);

/**
 * @swagger
 * /onboarding/tasks:
 *   post:
 *     summary: Create an onboarding task
 *     tags: [Onboarding]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [user_id, title]
 *             properties:
 *               user_id: { type: string }
 *               title: { type: string }
 *               due_date: { type: string, format: date }
 *     responses:
 *       201:
 *         description: Task created
 *       401:
 *         description: Unauthorized
 */
router.post('/tasks',             HR, create_task);

/**
 * @swagger
 * /onboarding/tasks/{id}/complete:
 *   patch:
 *     summary: Mark onboarding task as complete
 *     tags: [Onboarding]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Task completed
 *       401:
 *         description: Unauthorized
 */
router.patch('/tasks/:id/complete', complete_task);

export default router;
