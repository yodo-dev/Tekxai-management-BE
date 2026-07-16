# Tekxai ERP API Documentation

**Base URL:** `http://localhost:4000/api/v1`

All authenticated routes require: `Authorization: Bearer <access_token>`

Response format:
```json
{ "success": true, "payload": <data>, "message": "..." }
```

Error format:
```json
{ "success": false, "message": "Error description" }
```

---

## Authentication `/auth`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/auth/login` | ❌ | Login → returns `{ user, accessToken, refreshToken }` |
| POST | `/auth/refresh` | ❌ | Refresh tokens → body: `{ refresh_token }` |
| POST | `/auth/logout` | ❌ | Revoke refresh token |
| GET | `/auth/me` | ✅ | Get current user profile |
| POST | `/auth/forgot` | ❌ | Send OTP to email |
| POST | `/auth/verify/:userId` | ❌ | Verify OTP → body: `{ otp }` |
| POST | `/auth/reset/:userId` | ❌ | Reset password → body: `{ otp, password }` |
| GET | `/auth/resendOTP/:userId` | ❌ | Resend OTP |

### Login Example
```http
POST /api/v1/auth/login
Content-Type: application/json

{ "email": "admin@tekxai.com", "password": "Admin@123456" }
```

Response:
```json
{
  "success": true,
  "data": {
    "user": { "id": "...", "email": "...", "role_name": "ADMIN", "roles": ["ADMIN"] },
    "accessToken": "eyJ...",
    "refreshToken": "eyJ..."
  }
}
```

---

## Users `/user`

| Method | Path | Roles | Description |
|--------|------|-------|-------------|
| GET | `/user` | ADMIN+ | List users (search, page, limit, role) |
| GET | `/user/:id` | Any auth | Get user detail |
| POST | `/user` | ADMIN+ | Create user |
| PUT | `/user/:id` | ADMIN+ | Update user |
| DELETE | `/user/:id` | ADMIN+ | Soft delete user |

**Query params (GET /user):** `search`, `page`, `limit`, `role`

---

## Teams `/team`

| Method | Path | Roles | Description |
|--------|------|-------|-------------|
| GET | `/team` | Any auth | List teams |
| GET | `/team/:id` | Any auth | Get team |
| POST | `/team` | ADMIN+ | Create team |
| PUT | `/team/:id` | ADMIN+ | Update team |
| DELETE | `/team/:id` | ADMIN+ | Delete team |

---

## Departments `/department`

| Method | Path | Roles | Description |
|--------|------|-------|-------------|
| GET | `/department` | Any auth | List departments with divisions |
| GET | `/department/:id` | Any auth | Get department |
| POST | `/department` | ADMIN+ | Create department |
| PUT | `/department/:id` | ADMIN+ | Update department |
| DELETE | `/department/:id` | ADMIN+ | Delete department |
| GET | `/department/:id/divisions` | Any auth | List divisions |
| POST | `/department/:id/divisions` | ADMIN+ | Create division |

---

## Projects `/project`

| Method | Path | Roles | Description |
|--------|------|-------|-------------|
| GET | `/project` | Any auth | List projects (search, status, page, limit) |
| GET | `/project/saved` | Any auth | List saved/starred projects |
| GET | `/project/:id` | Any auth | Get project detail |
| POST | `/project` | ADMIN+ | Create project |
| PUT | `/project/:id` | ADMIN+ | Update project |
| DELETE | `/project/:id` | ADMIN+ | Delete project |
| POST | `/project/:id/save` | Any auth | Save/star project |
| DELETE | `/project/:id/save` | Any auth | Unsave project |

**Create/Update body:**
```json
{
  "title": "Project Name",
  "description": "...",
  "start_date": "2026-01-01",
  "end_date": "2026-12-31",
  "total_hours": 500,
  "owner_id": "...",
  "leader_id": "...",
  "member_ids": ["...", "..."]
}
```

---

## Timesheets `/timesheet`

| Method | Path | Roles | Description |
|--------|------|-------|-------------|
| GET | `/timesheet/weekly` | Any auth | Weekly view (date, search for admin) |
| GET | `/timesheet/requests` | Any auth | All requests (admin) / own (employee) |
| GET | `/timesheet/my-requests` | Any auth | Own time-off + edit requests |
| POST | `/timesheet/entry` | Any auth | Create time entry |
| PUT | `/timesheet/entry/:id` | Any auth | Update entry |
| DELETE | `/timesheet/entry/:id` | Any auth | Delete entry |
| POST | `/timesheet/entry/:id/request` | Any auth | Request edit |
| POST | `/timesheet/edit-request/:id/approve` | ADMIN+ | Approve edit |
| POST | `/timesheet/edit-request/:id/reject` | ADMIN+ | Reject edit |
| GET | `/timesheet/time-off/policies` | Any auth | List policies |
| POST | `/timesheet/time-off/request` | Any auth | Submit time-off request |
| POST | `/timesheet/time-off/:id/approve` | ADMIN+ | Approve time-off |
| POST | `/timesheet/time-off/:id/reject` | ADMIN+ | Reject time-off |

---

## Invites `/invite`

| Method | Path | Roles | Description |
|--------|------|-------|-------------|
| GET | `/invite/token/:token/preview` | ❌ | Preview invite token |
| POST | `/invite/redeem` | ❌ | Redeem invite & create account |
| GET | `/invite` | ADMIN+ | List invites |
| POST | `/invite` | ADMIN+ | Send invite |
| GET | `/invite/:id` | ADMIN+ | Get invite |
| PUT | `/invite/:id` | ADMIN+ | Update invite |
| DELETE | `/invite/:id` | ADMIN+ | Delete invite |
| POST | `/invite/:id/accept` | Any auth | Accept invite (existing user) |

**Send invite body:**
```json
{
  "email": "newuser@company.com",
  "role_id": "<role-id>",
  "team_id": "<optional>",
  "department": "Engineering",
  "designation": "Frontend Developer"
}
```

---

## Settings `/settings`

| Method | Path | Roles | Description |
|--------|------|-------|-------------|
| GET | `/settings/me` | Any auth | Get user settings |
| PATCH | `/settings/preferences` | Any auth | Update preferences |
| PATCH | `/settings/password` | Any auth | Change password |

**Change password body:** `{ old_password, new_password }`

---

## Starred `/starred`

| Method | Path | Roles | Description |
|--------|------|-------|-------------|
| GET | `/starred/queries` | Any auth | Get starred items (groups: projects, tasks, comments) |
| POST | `/starred/:item_type/:id` | Any auth | Star item |
| DELETE | `/starred/:item_type/:id` | Any auth | Unstar item |

---

## Notifications `/notification`

| Method | Path | Roles | Description |
|--------|------|-------|-------------|
| GET | `/notification` | Any auth | List notifications |
| PATCH | `/notification/read-all` | Any auth | Mark all as read |
| PATCH | `/notification/:id/read` | Any auth | Mark one as read |
| DELETE | `/notification/:id` | Any auth | Delete notification |

---

## Tickets `/ticket` — Enterprise Service Desk

Two creation paths share one endpoint: **legacy** (no `ticket_type_id` — the
original free-form ticket, unchanged) and **Service Desk** (`ticket_type_id`
present — dynamic form, workflow, SLA, and assignment all driven by the
ticket type's configuration). Admins configure types under
`/ticket-categories` and `/ticket-types` (see below); everything else in
this section auto-derives from that config.

| Method | Path | Roles | Description |
|--------|------|-------|-------------|
| GET | `/ticket` | Any auth | List tickets (own or all for admin). See query params below |
| POST | `/ticket` | Any auth | Create ticket (legacy or Service Desk path) |
| GET | `/ticket/:id` | Any auth (owner) / ADMIN+ | Get ticket, including custom fields, SLA due dates, assignee/team, approvals |
| PATCH | `/ticket/:id` | ADMIN+ | Update status/assignee/team/priority/severity — status changes are validated against the ticket's workflow if it has one |
| GET | `/ticket/:id/timeline` | Any auth (owner) / ADMIN+ | Activity log entries for this ticket (reuses `activity_logs`, no separate timeline table) |
| POST | `/ticket/:id/attachments` | Any auth (owner) / ADMIN+ | Attach a file |
| POST | `/ticket/:id/replies` | Any auth (owner) / ADMIN+ | Post a reply (auto-moves legacy `pending` → `in_progress` on admin reply) |
| GET | `/ticket/:id/approvals` | ADMIN+ | Approval history for this ticket |
| POST | `/ticket/:id/approvals` | ADMIN+ | Approve/reject at the ticket's current workflow step (only valid when that step is approval-gated) |
| GET | `/ticket/stats` | ADMIN+ | Counts by status and by ticket type |

**`GET /ticket` query params:**

| Param | Notes |
|---|---|
| `status`, `priority`, `severity` | Exact match |
| `category_id`, `ticket_type_id` | Filter by Service Desk config |
| `department_id`, `assignee_id`, `team_id`, `project_id`, `asset_id` | Assignment filters |
| `approval_status` | `PENDING` \| `APPROVED` \| `REJECTED` |
| `sla=overdue` | Tickets not yet closed whose `response_due_at` or `resolution_due_at` has passed |
| `search` | Free-text match over subject, description, and ticket number |
| `from`, `to` | Filters on `created_at` |

**Create ticket body — legacy path (no `ticket_type_id`):**
```json
{
  "subject": "AC not working",
  "description": "The AC in bay 2 has been broken for 3 days.",
  "recipient_role": "office_boy",
  "recipient_label": "Office Boy",
  "recipient_name": "Ahmed Khan",
  "priority": "high"
}
```

**Create ticket body — Service Desk path (`ticket_type_id` present):**
```json
{
  "subject": "Need a replacement laptop",
  "description": "Screen and battery both failed",
  "ticket_type_id": "cmr...",
  "custom_fields": { "device_model": "MacBook Pro", "reason": "Screen and battery both failed" },
  "project_id": "cmr...",
  "severity": "high"
}
```
`custom_fields` is validated against the type's `field_schema` server-side —
missing required fields or unknown keys are rejected with a 400. Department,
team, and assignee are auto-filled from the type's configured defaults
(an admin/HR caller may override); `response_due_at`/`resolution_due_at` are
stamped from the type's `response_sla_mins`/`resolution_sla_mins` at creation
time; the ticket's initial `status` is the first step of the type's
`workflow`. A frozen `type_snapshot` (field schema + workflow as they existed
at creation) is stored on the ticket so historical tickets keep validating
against the workflow they were created under, even if the type config
changes later.

**SLA escalation**: a scheduler job (every 15 minutes) checks open tickets
past `response_due_at`/`resolution_due_at` and escalates through configurable
stages (see `escalation_policies` with key `ticket_response_sla_breach` /
`ticket_resolution_sla_breach`), notifying the assignee, then supervisor,
then admins as stages progress. Same generic escalation engine used by the
Compliance module — see `/compliance-escalation/policies` to view or edit
the stage thresholds.

---

## Ticket Categories `/ticket-categories` and Ticket Types `/ticket-types`

Admin-only configuration for the Service Desk. A **category** is a simple
grouping (`IT`, `HR`, `Facilities`, ...); a **type** belongs to a category
and defines everything a ticket of that type needs: its dynamic form
(`field_schema`), its approval workflow (`workflow`), SLA minutes, and
default department/team/assignee.

| Method | Path | Permission |
|--------|------|------------|
| GET | `/ticket-categories` | `erp.ticket-categories.view` |
| POST | `/ticket-categories` | `erp.ticket-categories.manage` |
| PUT / PATCH `:id/active` | `/ticket-categories/:id` | `erp.ticket-categories.manage` |
| GET | `/ticket-types?category_id=&include_inactive=` | `erp.ticket-types.view` |
| POST | `/ticket-types` | `erp.ticket-types.manage` |
| PUT / PATCH `:id/active` | `/ticket-types/:id` | `erp.ticket-types.manage` |

**`field_schema` shape** (an array of sections, each with typed fields):
```json
[
  { "section": "Device Details", "fields": [
    { "key": "device_model", "label": "Preferred Model", "type": "select", "options": ["MacBook Pro", "MacBook Air"], "required": true },
    { "key": "reason", "label": "Reason", "type": "textarea", "required": true },
    { "key": "needed_by", "label": "Needed By", "type": "date" }
  ]}
]
```
Supported `type` values: `text`, `textarea`, `number`, `date`, `time`,
`checkbox`, `switch`, `select`, `multiselect`, `user`, `employee`, `team`,
`department`, `project`, `asset`, `email`, `phone`, `url`, `file`, `image`.

**`workflow` shape** (an ordered array of steps; a step with
`requires_approval: true` can only be advanced via `POST /ticket/:id/approvals`,
never a direct `PATCH` status change):
```json
[
  { "key": "submitted", "label": "Submitted", "requires_approval": true, "approver_role": "ADMIN" },
  { "key": "procurement", "label": "In Procurement" },
  { "key": "delivered", "label": "Delivered" }
]
```

---

## Marketing `/marketing`

| Method | Path | Roles | Description |
|--------|------|-------|-------------|
| GET | `/marketing/deals` | MARKETING+ | List won deals |
| POST | `/marketing/deals` | MARKETING+ | Create deal |
| GET | `/marketing/salary-builder` | MARKETING+ | Get salary builder |
| POST | `/marketing/salary-builder` | MARKETING+ | Create/update salary builder |
| POST | `/marketing/salary-builder/:userId/:period/publish` | ADMIN+ | Publish salary |
| GET | `/marketing/salary-history` | MARKETING+ | Salary history |

---

## Assets `/asset`

| Method | Path | Roles | Description |
|--------|------|-------|-------------|
| GET | `/asset/categories` | Any auth | List categories |
| GET | `/asset/locations` | Any auth | List locations |
| GET | `/asset/vendors` | Any auth | List vendors |
| GET | `/asset` | Any auth | List assets (search, status, category_id) |
| POST | `/asset` | HR+ | Create asset |
| GET | `/asset/:id` | Any auth | Get asset |
| PUT | `/asset/:id` | HR+ | Update asset |
| DELETE | `/asset/:id` | HR+ | Retire asset |
| POST | `/asset/:id/assign` | HR+ | Assign to user |
| POST | `/asset/:id/return` | HR+ | Mark as returned |
| POST | `/asset/:id/maintenance` | HR+ | Log maintenance |

---

## Performance `/performance`

| Method | Path | Roles | Description |
|--------|------|-------|-------------|
| GET | `/performance/daily-report` | Any auth | List reports (own or all) |
| POST | `/performance/daily-report` | Any auth | Submit report |
| PUT | `/performance/daily-report/:id` | Any auth | Update report |
| GET | `/performance/score` | Any auth | List scores |
| GET | `/performance/score/:employeeId` | MANAGER+ | Employee score |
| POST | `/performance/score` | MANAGER+ | Create/update score |
| GET | `/performance/bonus` | Any auth | List bonus records |
| POST | `/performance/bonus/calculate` | MANAGER+ | Calculate bonus |
| POST | `/performance/bonus/:id/approve` | MANAGER+ | Approve bonus |
| POST | `/performance/bonus/:id/pay` | ADMIN+ | Mark as paid |

---

## Health Check

```http
GET /api/v1/health
```

Response: `{ "success": true, "message": "OK", "timestamp": "..." }`
