import { Router } from 'express';
import { authenticate, can_or_role } from '../../../shared/middleware/authenticate.js';
import {
  list_rooms_ctrl, get_room_ctrl, create_room_ctrl, update_room_ctrl, set_room_status_ctrl,
  delete_room_ctrl, add_room_member_ctrl, remove_room_member_ctrl, get_room_timeline_ctrl,
  list_agenda_ctrl, create_agenda_ctrl, update_agenda_ctrl, complete_agenda_ctrl,
  list_meetings_ctrl, get_meeting_ctrl, create_meeting_ctrl, update_meeting_ctrl,
  close_meeting_ctrl, cancel_meeting_ctrl, add_participant_ctrl, get_meeting_timeline_ctrl,
  add_note_ctrl, update_note_ctrl, add_decision_ctrl,
  list_action_items_ctrl, create_action_item_ctrl, update_action_item_ctrl, complete_action_item_ctrl,
  add_attachment_ctrl, list_attachments_ctrl, dashboard_ctrl,
} from '../controllers/meetings.controller.js';

const VIEW = can_or_role('erp.meetings.view', 'ADMIN', 'SUPER_ADMIN');
const CREATE = can_or_role('erp.meetings.create', 'ADMIN', 'SUPER_ADMIN');
const EDIT = can_or_role('erp.meetings.edit', 'ADMIN', 'SUPER_ADMIN');
const DELETE = can_or_role('erp.meetings.delete', 'ADMIN', 'SUPER_ADMIN');

const router = Router();
router.use(authenticate);

/**
 * @swagger
 * tags:
 *   name: Meetings
 *   description: Meeting rooms, meetings, agenda items, decisions, action items and attachments
 */

// ── Dashboard ────────────────────────────────────────────────────────────────
/**
 * @swagger
 * /meeting/dashboard:
 *   get:
 *     summary: Meeting management KPI dashboard (active rooms, upcoming meetings, overdue action items, pending agenda, completed meetings)
 *     tags: [Meetings]
 *     responses:
 *       200: { description: Dashboard payload }
 */
router.get('/dashboard', VIEW, dashboard_ctrl);

// ── Meeting Rooms ────────────────────────────────────────────────────────────
/**
 * @swagger
 * /meeting/room:
 *   get:
 *     summary: List meeting rooms (search + filters status/department_id/owner_id/participant_id)
 *     tags: [Meetings]
 *     parameters:
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [ACTIVE, CLOSED, ARCHIVED] }
 *       - in: query
 *         name: department_id
 *         schema: { type: string }
 *       - in: query
 *         name: owner_id
 *         schema: { type: string }
 *       - in: query
 *         name: participant_id
 *         schema: { type: string }
 *     responses:
 *       200: { description: Meeting rooms list }
 */
router.get('/room', VIEW, list_rooms_ctrl);

/**
 * @swagger
 * /meeting/room:
 *   post:
 *     summary: Create a meeting room
 *     tags: [Meetings]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name: { type: string }
 *               description: { type: string }
 *               department_id: { type: string }
 *               member_ids: { type: array, items: { type: string } }
 *     responses:
 *       201: { description: Meeting room created }
 */
router.post('/room', CREATE, create_room_ctrl);

/**
 * @swagger
 * /meeting/room/{id}:
 *   get:
 *     summary: Get a meeting room (members, agenda, meetings)
 *     tags: [Meetings]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Meeting room detail }
 */
router.get('/room/:id', VIEW, get_room_ctrl);

/**
 * @swagger
 * /meeting/room/{id}:
 *   put:
 *     summary: Update a meeting room (active rooms only)
 *     tags: [Meetings]
 *     responses:
 *       200: { description: Meeting room updated }
 */
router.put('/room/:id', EDIT, update_room_ctrl);

/**
 * @swagger
 * /meeting/room/{id}/status:
 *   patch:
 *     summary: Close or archive a meeting room
 *     tags: [Meetings]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status: { type: string, enum: [ACTIVE, CLOSED, ARCHIVED] }
 *     responses:
 *       200: { description: Status updated }
 */
router.patch('/room/:id/status', DELETE, set_room_status_ctrl);

/**
 * @swagger
 * /meeting/room/{id}:
 *   delete:
 *     summary: Soft-delete (archive) a meeting room
 *     tags: [Meetings]
 *     responses:
 *       200: { description: Room archived }
 */
router.delete('/room/:id', DELETE, delete_room_ctrl);

/**
 * @swagger
 * /meeting/room/{id}/members:
 *   post:
 *     summary: Add a member to a meeting room
 *     tags: [Meetings]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [user_id]
 *             properties:
 *               user_id: { type: string }
 *               role: { type: string, enum: [MEMBER, OWNER] }
 *     responses:
 *       201: { description: Member added }
 */
router.post('/room/:id/members', EDIT, add_room_member_ctrl);

/**
 * @swagger
 * /meeting/room/{id}/members/{userId}:
 *   delete:
 *     summary: Remove a member from a meeting room
 *     tags: [Meetings]
 *     responses:
 *       200: { description: Member removed }
 */
router.delete('/room/:id/members/:userId', EDIT, remove_room_member_ctrl);

/**
 * @swagger
 * /meeting/room/{id}/timeline:
 *   get:
 *     summary: Get a meeting room's activity timeline
 *     tags: [Meetings]
 *     responses:
 *       200: { description: Activity log entries for this room }
 */
router.get('/room/:id/timeline', VIEW, get_room_timeline_ctrl);

// ── Agenda Items (room-scoped, persist across meetings) ─────────────────────
/**
 * @swagger
 * /meeting/room/{id}/agenda:
 *   get:
 *     summary: List agenda items for a room (filters status, meeting_id)
 *     tags: [Meetings]
 *     responses:
 *       200: { description: Agenda items list }
 */
router.get('/room/:id/agenda', VIEW, list_agenda_ctrl);

/**
 * @swagger
 * /meeting/room/{id}/agenda:
 *   post:
 *     summary: Add an agenda item to a room
 *     tags: [Meetings]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title]
 *             properties:
 *               title: { type: string }
 *               description: { type: string }
 *     responses:
 *       201: { description: Agenda item created }
 */
router.post('/room/:id/agenda', CREATE, create_agenda_ctrl);

/**
 * @swagger
 * /meeting/room/{id}/agenda/{agendaId}:
 *   put:
 *     summary: Update an agenda item (title/description/status/meeting_id link)
 *     tags: [Meetings]
 *     responses:
 *       200: { description: Agenda item updated }
 */
router.put('/room/:id/agenda/:agendaId', EDIT, update_agenda_ctrl);

/**
 * @swagger
 * /meeting/room/{id}/agenda/{agendaId}/complete:
 *   patch:
 *     summary: Mark an agenda item as completed (never deleted, stays visible in history)
 *     tags: [Meetings]
 *     responses:
 *       200: { description: Agenda item marked completed }
 */
router.patch('/room/:id/agenda/:agendaId/complete', EDIT, complete_agenda_ctrl);

// ── Meetings ─────────────────────────────────────────────────────────────────
/**
 * @swagger
 * /meeting:
 *   get:
 *     summary: List meetings (filters room_id/status/organizer_id/participant_id/from/to/search)
 *     tags: [Meetings]
 *     responses:
 *       200: { description: Meetings list }
 */
router.get('/', VIEW, list_meetings_ctrl);

/**
 * @swagger
 * /meeting:
 *   post:
 *     summary: Create/schedule a meeting within a room (optionally as a follow-up via previous_meeting_id)
 *     tags: [Meetings]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [room_id, title, scheduled_at]
 *             properties:
 *               room_id: { type: string }
 *               title: { type: string }
 *               scheduled_at: { type: string, format: date-time }
 *               previous_meeting_id: { type: string }
 *               participant_ids: { type: array, items: { type: string } }
 *     responses:
 *       201: { description: Meeting created }
 */
router.post('/', CREATE, create_meeting_ctrl);

/**
 * @swagger
 * /meeting/{id}:
 *   get:
 *     summary: Get a meeting (notes, decisions, action items, agenda items, follow-ups)
 *     tags: [Meetings]
 *     responses:
 *       200: { description: Meeting detail }
 */
router.get('/:id', VIEW, get_meeting_ctrl);

/**
 * @swagger
 * /meeting/{id}:
 *   put:
 *     summary: Update a scheduled meeting (title/scheduled_at/participant_ids)
 *     tags: [Meetings]
 *     responses:
 *       200: { description: Meeting updated }
 */
router.put('/:id', EDIT, update_meeting_ctrl);

/**
 * @swagger
 * /meeting/{id}/close:
 *   patch:
 *     summary: Close a meeting (marks completed)
 *     tags: [Meetings]
 *     responses:
 *       200: { description: Meeting closed }
 */
router.patch('/:id/close', DELETE, close_meeting_ctrl);

/**
 * @swagger
 * /meeting/{id}/cancel:
 *   patch:
 *     summary: Cancel a meeting
 *     tags: [Meetings]
 *     responses:
 *       200: { description: Meeting cancelled }
 */
router.patch('/:id/cancel', DELETE, cancel_meeting_ctrl);

/**
 * @swagger
 * /meeting/{id}/participants:
 *   post:
 *     summary: Add a participant to a meeting
 *     tags: [Meetings]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [user_id]
 *             properties:
 *               user_id: { type: string }
 *     responses:
 *       201: { description: Participant added }
 */
router.post('/:id/participants', EDIT, add_participant_ctrl);

/**
 * @swagger
 * /meeting/{id}/timeline:
 *   get:
 *     summary: Get a meeting's activity timeline
 *     tags: [Meetings]
 *     responses:
 *       200: { description: Activity log entries for this meeting }
 */
router.get('/:id/timeline', VIEW, get_meeting_timeline_ctrl);

// ── Notes / Decisions ───────────────────────────────────────────────────────
/**
 * @swagger
 * /meeting/{id}/notes:
 *   post:
 *     summary: Add a note to a meeting (timestamped + authored)
 *     tags: [Meetings]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [content]
 *             properties:
 *               content: { type: string }
 *     responses:
 *       201: { description: Note added }
 */
router.post('/:id/notes', EDIT, add_note_ctrl);

/**
 * @swagger
 * /meeting/note/{noteId}:
 *   put:
 *     summary: Update an existing meeting note
 *     tags: [Meetings]
 *     responses:
 *       200: { description: Note updated }
 */
router.put('/note/:noteId', EDIT, update_note_ctrl);

/**
 * @swagger
 * /meeting/{id}/decisions:
 *   post:
 *     summary: Record a decision on a meeting
 *     tags: [Meetings]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [decision_text]
 *             properties:
 *               decision_text: { type: string }
 *     responses:
 *       201: { description: Decision recorded }
 */
router.post('/:id/decisions', EDIT, add_decision_ctrl);

// ── Action Items ─────────────────────────────────────────────────────────────
/**
 * @swagger
 * /meeting/action-item:
 *   get:
 *     summary: List action items (filters meeting_id/room_id/assignee_id/status/priority/due_from/due_to)
 *     tags: [Meetings]
 *     responses:
 *       200: { description: Action items list }
 */
router.get('/action-item', VIEW, list_action_items_ctrl);

/**
 * @swagger
 * /meeting/{id}/action-item:
 *   post:
 *     summary: Create an action item on a meeting
 *     tags: [Meetings]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, assignee_id]
 *             properties:
 *               title: { type: string }
 *               assignee_id: { type: string }
 *               due_date: { type: string, format: date }
 *               priority: { type: string, enum: [LOW, MEDIUM, HIGH, URGENT] }
 *               notes: { type: string }
 *     responses:
 *       201: { description: Action item created }
 */
router.post('/:id/action-item', CREATE, create_action_item_ctrl);

/**
 * @swagger
 * /meeting/action-item/{actionId}:
 *   put:
 *     summary: Update an action item
 *     tags: [Meetings]
 *     responses:
 *       200: { description: Action item updated }
 */
router.put('/action-item/:actionId', EDIT, update_action_item_ctrl);

/**
 * @swagger
 * /meeting/action-item/{actionId}/complete:
 *   patch:
 *     summary: Mark an action item as completed
 *     tags: [Meetings]
 *     responses:
 *       200: { description: Action item marked completed }
 */
router.patch('/action-item/:actionId/complete', EDIT, complete_action_item_ctrl);

// ── Attachments (reuses generic /storage/upload — this just records metadata) ─
/**
 * @swagger
 * /meeting/attachment:
 *   get:
 *     summary: List attachments for a room/meeting/agenda item/action item
 *     tags: [Meetings]
 *     parameters:
 *       - in: query
 *         name: attachable_type
 *         schema: { type: string, enum: [ROOM, MEETING, AGENDA_ITEM, ACTION_ITEM] }
 *       - in: query
 *         name: attachable_id
 *         schema: { type: string }
 *     responses:
 *       200: { description: Attachments list }
 */
router.get('/attachment', VIEW, list_attachments_ctrl);

/**
 * @swagger
 * /meeting/attachment:
 *   post:
 *     summary: Record an attachment (file already uploaded via /storage/upload)
 *     tags: [Meetings]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [attachable_type, attachable_id, file_url, file_name]
 *             properties:
 *               attachable_type: { type: string, enum: [ROOM, MEETING, AGENDA_ITEM, ACTION_ITEM] }
 *               attachable_id: { type: string }
 *               file_url: { type: string }
 *               file_name: { type: string }
 *     responses:
 *       201: { description: Attachment recorded }
 */
router.post('/attachment', EDIT, add_attachment_ctrl);

export default router;
