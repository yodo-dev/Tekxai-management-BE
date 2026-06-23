import { Router } from 'express';
import { authenticate, authorize } from '../../../shared/middleware/authenticate.js';
import {
  list_accounts, get_account, create_account, update_account,
  list_transactions, add_transaction, update_transaction, delete_transaction,
  list_categories, create_category,
  get_summary,
} from '../controllers/expenses.controller.js';

const router = Router();
router.use(authenticate);

const SA = authorize('SUPER_ADMIN', 'ADMIN');

router.get('/summary',                    SA, get_summary);
router.get('/categories',                     list_categories);
router.post('/categories',                SA, create_category);
router.get('/accounts',                   SA, list_accounts);
router.post('/accounts',                  SA, create_account);
router.get('/accounts/:userId',           SA, get_account);
router.put('/accounts/:userId',           SA, update_account);
router.get('/accounts/:userId/transactions',    SA, list_transactions);
router.post('/accounts/:userId/transactions',   SA, add_transaction);
router.put('/transactions/:id',           SA, update_transaction);
router.delete('/transactions/:id',        SA, delete_transaction);

export default router;
