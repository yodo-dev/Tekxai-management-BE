import { Router } from 'express';
import { authenticate, authorize } from '../../../shared/middleware/authenticate.js';
import prisma from '../../../shared/database/client.js';

const router = Router();
router.use(authenticate);
const ADMIN_HR = authorize('SUPER_ADMIN', 'ADMIN', 'HR');

/**
 * @swagger
 * /emergency-contacts/{userId}:
 *   get:
 *     summary: Get emergency contacts for a user
 *     tags: [Emergency Contacts]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Emergency contacts list
 *       401:
 *         description: Unauthorized
 */
router.get('/:userId', ADMIN_HR, async (req, res, next) => {
  try {
    const contacts = await prisma.emergency_contacts.findMany({
      take: 500,
      where: { user_id: req.params.userId },
      orderBy: [{ is_primary: 'desc' }, { created_at: 'asc' }],
    });
    return res.json({ success: true, payload: { contacts, total: contacts.length } });
  } catch (err) { next(err); }
});

/**
 * @swagger
 * /emergency-contacts/{userId}:
 *   post:
 *     summary: Add an emergency contact for a user
 *     tags: [Emergency Contacts]
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
 *             required: [name, relation, phone]
 *             properties:
 *               name: { type: string }
 *               relation: { type: string }
 *               phone: { type: string }
 *               is_primary: { type: boolean }
 *     responses:
 *       201:
 *         description: Contact created
 *       401:
 *         description: Unauthorized
 */
router.post('/:userId', ADMIN_HR, async (req, res, next) => {
  try {
    const { name, relation, phone, is_primary } = req.body;
    const contact = await prisma.emergency_contacts.create({
      data: {
        user_id: req.params.userId,
        name,
        relation,
        phone,
        is_primary: !!is_primary,
      },
    });
    return res.status(201).json({ success: true, payload: contact });
  } catch (err) { next(err); }
});

/**
 * @swagger
 * /emergency-contacts/{id}:
 *   put:
 *     summary: Update an emergency contact
 *     tags: [Emergency Contacts]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Contact updated
 *       401:
 *         description: Unauthorized
 */
router.put('/:id', ADMIN_HR, async (req, res, next) => {
  try {
    const { name, relation, phone, is_primary } = req.body;
    const contact = await prisma.emergency_contacts.update({
      where: { id: req.params.id },
      data: {
        name,
        relation,
        phone,
        ...(is_primary !== undefined ? { is_primary: !!is_primary } : {}),
      },
    });
    return res.json({ success: true, payload: contact });
  } catch (err) { next(err); }
});

/**
 * @swagger
 * /emergency-contacts/{id}:
 *   delete:
 *     summary: Delete an emergency contact
 *     tags: [Emergency Contacts]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Contact deleted
 *       401:
 *         description: Unauthorized
 */
router.delete('/:id', ADMIN_HR, async (req, res, next) => {
  try {
    await prisma.emergency_contacts.delete({ where: { id: req.params.id } });
    return res.json({ success: true, payload: null });
  } catch (err) { next(err); }
});

export default router;
