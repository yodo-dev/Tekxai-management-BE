import { Router } from 'express';
import { authenticate, authorize } from '../../../shared/middleware/authenticate.js';
import {
  add_maintenance_ctrl,
  approve_asset_request_ctrl,
  list_all_maintenance_ctrl,
  assign_asset_ctrl,
  create_asset_ctrl,
  create_asset_request_ctrl,
  create_category_ctrl,
  create_disposal_ctrl,
  delete_asset_ctrl,
  get_asset_ctrl,
  get_asset_requests_ctrl,
  get_assets,
  get_categories,
  get_depreciation_report_ctrl,
  get_disposals_ctrl,
  get_inventory_report_ctrl,
  get_locations,
  get_vendors,
  reject_asset_request_ctrl,
  return_asset_ctrl,
  update_asset_ctrl,
} from '../controllers/assets.controller.js';

const router = Router();
router.use(authenticate);
const HR = authorize('ADMIN', 'SUPER_ADMIN', 'HR');

/**
 * @swagger
 * /assets/categories:
 *   get:
 *     summary: List asset categories
 *     tags: [Assets]
 *     responses:
 *       200:
 *         description: Categories list
 *       401:
 *         description: Unauthorized
 */
router.get('/categories',       get_categories);

/**
 * @swagger
 * /assets/categories:
 *   post:
 *     summary: Create an asset category
 *     tags: [Assets]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name: { type: string }
 *     responses:
 *       201:
 *         description: Category created
 *       401:
 *         description: Unauthorized
 */
router.post('/categories',      HR, create_category_ctrl);

/**
 * @swagger
 * /assets/locations:
 *   get:
 *     summary: List asset locations
 *     tags: [Assets]
 *     responses:
 *       200:
 *         description: Locations list
 *       401:
 *         description: Unauthorized
 */
router.get('/locations',        get_locations);

/**
 * @swagger
 * /assets/vendors:
 *   get:
 *     summary: List asset vendors
 *     tags: [Assets]
 *     responses:
 *       200:
 *         description: Vendors list
 *       401:
 *         description: Unauthorized
 */
router.get('/vendors',          get_vendors);

/**
 * @swagger
 * /assets/requests:
 *   post:
 *     summary: Create an asset request
 *     tags: [Assets]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [asset_category_id]
 *             properties:
 *               requested_for_user_id: { type: string }
 *               asset_category_id: { type: string }
 *               reason: { type: string }
 *     responses:
 *       201:
 *         description: Asset request created
 *       401:
 *         description: Unauthorized
 */
router.post('/requests',        create_asset_request_ctrl);

/**
 * @swagger
 * /assets/requests:
 *   get:
 *     summary: List asset requests
 *     tags: [Assets]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Asset requests list
 *       401:
 *         description: Unauthorized
 */
router.get('/requests',         HR,   get_asset_requests_ctrl);

/**
 * @swagger
 * /assets/requests/{id}/approve:
 *   post:
 *     summary: Approve an asset request and assign a specific asset
 *     tags: [Assets]
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
 *             required: [asset_id]
 *             properties:
 *               asset_id: { type: string }
 *               notes: { type: string }
 *     responses:
 *       200:
 *         description: Request approved and asset assigned
 *       401:
 *         description: Unauthorized
 */
router.post('/requests/:id/approve', HR, approve_asset_request_ctrl);

/**
 * @swagger
 * /assets/requests/{id}/reject:
 *   post:
 *     summary: Reject an asset request
 *     tags: [Assets]
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
 *               rejection_reason: { type: string }
 *     responses:
 *       200:
 *         description: Request rejected
 *       401:
 *         description: Unauthorized
 */
router.post('/requests/:id/reject',  HR, reject_asset_request_ctrl);

/**
 * @swagger
 * /assets/disposals:
 *   get:
 *     summary: List asset disposal records
 *     tags: [Assets]
 *     responses:
 *       200:
 *         description: Disposals list
 *       401:
 *         description: Unauthorized
 */
router.get('/disposals',        HR,   get_disposals_ctrl);

/**
 * @swagger
 * /assets/disposals:
 *   post:
 *     summary: Create a disposal record for an asset
 *     tags: [Assets]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [asset_id, reason]
 *             properties:
 *               asset_id: { type: string }
 *               reason: { type: string }
 *               disposal_date: { type: string, format: date }
 *               notes: { type: string }
 *     responses:
 *       201:
 *         description: Disposal recorded
 *       401:
 *         description: Unauthorized
 */
router.post('/disposals',       HR,   create_disposal_ctrl);

/**
 * @swagger
 * /assets/reports/depreciation:
 *   get:
 *     summary: Depreciation report for all non-deleted assets (straight-line, 36-month useful life)
 *     tags: [Assets]
 *     responses:
 *       200:
 *         description: Depreciation report
 *       401:
 *         description: Unauthorized
 */
router.get('/reports/depreciation', HR, get_depreciation_report_ctrl);

/**
 * @swagger
 * /assets/reports/inventory:
 *   get:
 *     summary: Inventory report — counts by status/category, warranty-expiry alerts, avg time-in-assignment
 *     tags: [Assets]
 *     responses:
 *       200:
 *         description: Inventory report
 *       401:
 *         description: Unauthorized
 */
router.get('/reports/inventory',    HR, get_inventory_report_ctrl);

/**
 * @swagger
 * /assets:
 *   get:
 *     summary: List all assets
 *     tags: [Assets]
 *     parameters:
 *       - in: query
 *         name: category_id
 *         schema: { type: string }
 *       - in: query
 *         name: status
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Assets list
 *       401:
 *         description: Unauthorized
 */
router.get('/',                 get_assets);

/**
 * @swagger
 * /assets:
 *   post:
 *     summary: Create an asset
 *     tags: [Assets]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, category_id]
 *             properties:
 *               name: { type: string }
 *               category_id: { type: string }
 *               serial_number: { type: string }
 *               purchase_date: { type: string, format: date }
 *               purchase_cost: { type: number }
 *     responses:
 *       201:
 *         description: Asset created
 *       401:
 *         description: Unauthorized
 */
router.post('/',                HR,   create_asset_ctrl);

/**
 * @swagger
 * /assets/{id}:
 *   get:
 *     summary: Get asset by ID
 *     tags: [Assets]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Asset object
 *       404:
 *         description: Not found
 *       401:
 *         description: Unauthorized
 */
router.get('/:id',              get_asset_ctrl);

/**
 * @swagger
 * /assets/{id}:
 *   put:
 *     summary: Update an asset
 *     tags: [Assets]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Asset updated
 *       401:
 *         description: Unauthorized
 */
router.put('/:id',              HR,     update_asset_ctrl);

/**
 * @swagger
 * /assets/{id}:
 *   delete:
 *     summary: Delete an asset
 *     tags: [Assets]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Asset deleted
 *       401:
 *         description: Unauthorized
 */
router.delete('/:id',           HR,   delete_asset_ctrl);

/**
 * @swagger
 * /assets/{id}/assign:
 *   post:
 *     summary: Assign asset to an employee
 *     tags: [Assets]
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
 *             required: [user_id]
 *             properties:
 *               user_id: { type: string }
 *               notes: { type: string }
 *     responses:
 *       200:
 *         description: Asset assigned
 *       401:
 *         description: Unauthorized
 */
router.post('/:id/assign',      HR,    assign_asset_ctrl);

/**
 * @swagger
 * /assets/{id}/return:
 *   post:
 *     summary: Return an assigned asset
 *     tags: [Assets]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Asset returned
 *       401:
 *         description: Unauthorized
 */
router.post('/:id/return',      HR,    return_asset_ctrl);

/**
 * @swagger
 * /assets/maintenance/all:
 *   get:
 *     summary: List all maintenance records
 *     tags: [Assets]
 *     responses:
 *       200:
 *         description: Maintenance records list
 *       401:
 *         description: Unauthorized
 */
router.get('/maintenance/all',  list_all_maintenance_ctrl);

/**
 * @swagger
 * /assets/{id}/maintenance:
 *   post:
 *     summary: Add maintenance record for an asset
 *     tags: [Assets]
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
 *             required: [description, date]
 *             properties:
 *               description: { type: string }
 *               date: { type: string, format: date }
 *               cost: { type: number }
 *     responses:
 *       201:
 *         description: Maintenance record added
 *       401:
 *         description: Unauthorized
 */
router.post('/:id/maintenance', HR,     add_maintenance_ctrl);

export default router;
