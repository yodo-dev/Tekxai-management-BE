# Changelog

## [3.0.0] — 2026-06-18 (Phase 1-3 Complete)

### Phase 1 — Critical Bug Fixes
- FIX: TimeTrackerCard now calls POST /timesheet/clock-in and POST /timesheet/clock-out (was fully mocked)
- FIX: duration_sec auto-calculated on clock-out (was always stored as 0)
- FIX: NotificationDropdown now reads from real API (replaced hardcoded mockNotifications array)
- FIX: ProjectDetailPage milestones now load from GET /project/:id/milestones (replaced mockMilestones)
- FIX: AddTaskModal now calls POST /project/:id/tasks (removed explicit 'Mock' toast)
- FIX: CreateMilestoneModal now calls POST /project/:id/milestones (removed explicit 'Mock' toast)
- FIX: Bonus engine reads from bonus_configurations DB table with hardcoded fallback
- FIX: Estimator division filter now passed to API query
- FIX: Departments division add uses apiRequest instead of raw fetch + hardcoded localStorage key
- FIX: Chat module replaced with Phase 4 placeholder (removed 100% hardcoded fake data)

### Phase 2 — Partial Features Completed
- COMPLETE: Attendance clock-in/clock-out wired end-to-end to /timesheet/clock-in, /clock-out, /today
- COMPLETE: Employee profile edit via PATCH /user/me
- COMPLETE: Employee settings page with real profile + password change forms
- COMPLETE: NotificationDropdown reads real notifications with unread count badge
- COMPLETE: ProjectDetailPage fully connected to milestones and tasks APIs
- COMPLETE: Team member management: POST/DELETE /team/:id/members

### Phase 3 — New Features Implemented
- NEW: POST /timesheet/clock-in, POST /timesheet/clock-out, GET /timesheet/today
- NEW: Shifts module: GET/POST /attendance/shifts, POST /attendance/shifts/assign
- NEW: Late coming detection: /attendance/violations (auto-computed on clock-in)
- NEW: Grace period per shift (configurable, stored in shifts.grace_period_min)
- NEW: Leave balances: GET /leave-balance/my, GET /leave-balance/:userId
- NEW: Job Descriptions: GET/PUT /job-description/my, GET/PUT /job-description/:userId
- NEW: Activity Logs: GET /activity-log, GET /activity-log/my
- NEW: Tasks CRUD: GET/POST /project/:id/tasks, PUT/DELETE /project/:id/tasks/:taskId
- NEW: Milestones CRUD: GET/POST /project/:id/milestones, PUT/DELETE /project/:id/milestones/:id
- NEW: Admin Attendance page (shifts, violations, grace period config)
- NEW: Admin Job Descriptions page (per-employee JD management)

### Database Changes
- NEW: shifts (id, name, start_time, end_time, grace_period_min, is_default)
- NEW: employee_shifts (user_id, shift_id, effective)
- NEW: attendance_violations (user_id, date, expected_check_in, late_minutes, violation_type)
- NEW: leave_balances (user_id, policy_id, year, allocated, used, pending, remaining)
- NEW: job_descriptions (user_id, title, summary, responsibilities, qualifications, kpi_targets)
- NEW: activity_logs (user_id, action, entity, entity_id, ip_address)
- Total models: 48 (was 36)
