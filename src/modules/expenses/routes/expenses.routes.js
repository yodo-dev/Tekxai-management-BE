import { Router } from 'express';
import { authenticate, can_or_role } from '../../../shared/middleware/authenticate.js';
import {
  list_accounts, get_account, create_account, update_account,
  list_transactions, add_transaction, update_transaction, delete_transaction,
  list_categories, create_category, title_suggestions,
  get_summary, update_receipt,
} from '../controllers/expenses.controller.js';

const router = Router();
router.use(authenticate);

const SA_VIEW   = can_or_role('erp.expenses.view', 'SUPER_ADMIN', 'ADMIN');
const SA_CREATE = can_or_role('erp.expenses.create', 'SUPER_ADMIN', 'ADMIN');
const SA_EDIT   = can_or_role('erp.expenses.edit', 'SUPER_ADMIN', 'ADMIN');
const SA_DELETE = can_or_role('erp.expenses.delete', 'SUPER_ADMIN', 'ADMIN');

/**
 * @swagger
 * /expenses/summary:
 *   get:
 *     summary: Get expenses summary
 *     tags: [Expenses]
 *     parameters:
 *       - in: query
 *         name: from
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: to
 *         schema: { type: string, format: date }
 *     responses:
 *       200:
 *         description: Expense summary
 *       401:
 *         description: Unauthorized
 */
router.get('/summary',                    SA_VIEW, get_summary);

/**
 * @swagger
 * /expenses/categories:
 *   get:
 *     summary: List expense categories
 *     tags: [Expenses]
 *     responses:
 *       200:
 *         description: Categories list
 *       401:
 *         description: Unauthorized
 */
router.get('/categories',                     list_categories);

/**
 * @swagger
 * /expenses/categories:
 *   post:
 *     summary: Create expense category
 *     tags: [Expenses]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name: { type: string }
 *               color: { type: string }
 *     responses:
 *       201:
 *         description: Category created
 *       401:
 *         description: Unauthorized
 */
router.post('/categories',                SA_CREATE, create_category);
router.get('/title-suggestions',              title_suggestions);

/**
 * @swagger
 * /expenses/accounts:
 *   get:
 *     summary: List expense accounts
 *     tags: [Expenses]
 *     responses:
 *       200:
 *         description: Accounts list
 *       401:
 *         description: Unauthorized
 */
router.get('/accounts',                   SA_VIEW, list_accounts);

/**
 * @swagger
 * /expenses/accounts:
 *   post:
 *     summary: Create expense account for a user
 *     tags: [Expenses]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [user_id]
 *             properties:
 *               user_id: { type: string }
 *               monthly_limit: { type: number }
 *     responses:
 *       201:
 *         description: Account created
 *       401:
 *         description: Unauthorized
 */
router.post('/accounts',                  SA_CREATE, create_account);

/**
 * @swagger
 * /expenses/accounts/{userId}:
 *   get:
 *     summary: Get expense account for a user
 *     tags: [Expenses]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Account object
 *       401:
 *         description: Unauthorized
 */
router.get('/accounts/:userId',           SA_VIEW, get_account);

/**
 * @swagger
 * /expenses/accounts/{userId}:
 *   put:
 *     summary: Update expense account for a user
 *     tags: [Expenses]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               monthly_limit: { type: number }
 *     responses:
 *       200:
 *         description: Account updated
 *       401:
 *         description: Unauthorized
 */
router.put('/accounts/:userId',           SA_EDIT, update_account);

/**
 * @swagger
 * /expenses/accounts/{userId}/transactions:
 *   get:
 *     summary: List transactions for a user account
 *     tags: [Expenses]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: from
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: to
 *         schema: { type: string, format: date }
 *     responses:
 *       200:
 *         description: Transactions list
 *       401:
 *         description: Unauthorized
 */
router.get('/accounts/:userId/transactions',    SA_VIEW, list_transactions);

/**
 * @swagger
 * /expenses/accounts/{userId}/transactions:
 *   post:
 *     summary: Add a transaction to user account
 *     tags: [Expenses]
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
 *             required: [amount, category_id, description]
 *             properties:
 *               amount: { type: number }
 *               category_id: { type: string }
 *               description: { type: string }
 *               date: { type: string, format: date }
 *     responses:
 *       201:
 *         description: Transaction added
 *       401:
 *         description: Unauthorized
 */
router.post('/accounts/:userId/transactions',   SA_CREATE, add_transaction);

/**
 * @swagger
 * /expenses/transactions/{id}:
 *   put:
 *     summary: Update a transaction
 *     tags: [Expenses]
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
 *               amount: { type: number }
 *               description: { type: string }
 *     responses:
 *       200:
 *         description: Transaction updated
 *       401:
 *         description: Unauthorized
 */
router.put('/transactions/:id',           SA_EDIT, update_transaction);

/**
 * @swagger
 * /expenses/transactions/{id}:
 *   delete:
 *     summary: Delete a transaction
 *     tags: [Expenses]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Transaction deleted
 *       401:
 *         description: Unauthorized
 */
router.delete('/transactions/:id',        SA_DELETE, delete_transaction);

/**
 * @swagger
 * /expenses/transactions/{id}/receipt:
 *   patch:
 *     summary: Update receipt for a transaction
 *     tags: [Expenses]
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
 *               receipt_url: { type: string }
 *     responses:
 *       200:
 *         description: Receipt updated
 *       401:
 *         description: Unauthorized
 */
router.patch('/transactions/:id/receipt',     update_receipt);

export default router;
