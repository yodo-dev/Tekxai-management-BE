# Technical Debt Register

Tracks known architectural debt items that are explicitly deferred — not blocking
current sprint work, not silently ignored. Each item gets picked up only when
someone deliberately schedules it, with its own audit-first workflow like any
other milestone.

Opened: 2026-07-21, at Sprint 1 (Reporting & Business Intelligence) closure,
following the mandatory pre-Sprint-2 Reporting Engine audit.

---

## TD-1: Admin Reports Migration

**Item:** `/admin/reports` (frontend page `fe-work/src/pages/admin/reports/index.tsx`)
consumes legacy backend endpoints `GET /report/attendance`, `/report/leave`,
`/report/performance`, `/report/projects` (`be-work/src/modules/reports/routes/reports.routes.js`,
via `fe-work/src/services/reportService.ts`) — hand-rolled Prisma queries and CSV
export logic that predate the generic Report Builder engine
(`report_builder.controller.js`).

**Status:** Live, routed, actively used. Not dead code — confirmed via full
codebase grep, not just the 6 pages touched in Sprint 1.

**Action needed:** Audit `/admin/reports` — what it renders, who uses it, whether
its four report types map cleanly onto `run_report`/`run_aggregate`/`run_kpi`
against the existing `ENTITY_MAP` entities (`time_off_requests`, `payroll_entries`,
`tasks`, `projects`, etc.), or whether it needs to stay a hand-formatted
operational report.

**Decision to make:** Migrate to a Report Builder preset, or keep as a dedicated
formatted operational report. **Not decided yet — no migration until audited.**

---

## TD-2: Project Report Migration

**Item:** `/admin/project-report` (`fe-work/src/pages/admin/project-report/index.tsx`)
consumes `GET /report/projects` via the same legacy `reportService.ts`.

**Status:** Live, routed, actively used.

**Action needed:** Audit `/admin/project-report` — compare its output against what
the generic engine's `projects` entity (already registered in `ENTITY_MAP`) can
produce via aggregate/detail/KPI calls, and against the existing Project
Report/Export page built in an earlier sprint (`be-work` Milestone 33/34 era) to
avoid a third parallel project-reporting surface.

**Decision to make:** Migrate to Report Builder, or keep as a dedicated executive
report. **Not decided yet — no migration until audited.**

---

## TD-3: HR Reports Evaluation

**Item:** `hr-reports` module (`be-work/src/modules/hr-reports/hr-reports.routes.js`,
mounted at `/hr-report`) — `GET /hr-report/aggregate` (hand-rolled `groupBy`/`having`)
plus `GET /hr-report/employee/:userId/annual` and `/monthly` (per-employee formatted
reports). Consumed by `/hr/reports` (`fe-work/src/pages/admin/hr-reports/index.tsx`)
alongside the new generic-engine `BUILDER` calls added in Sprint 1 Milestone 2 — both
coexist in the same page today.

**Status:** Live, actively used, not dead.

**Action needed:** Separate the two kinds of thing this module does before deciding
anything:
- **Generic analytical reports** (`/hr-report/aggregate`'s groupBy/having counts) —
  candidate for migration onto `run_aggregate` if the `having` logic can be expressed
  or dropped without losing the report's meaning.
- **Formatted per-employee reports** (`/annual`, `/monthly`) — likely NOT a fit for
  the generic engine; these render a specific per-employee document layout, not a
  filterable/groupable dataset.

**Decision to make:** Only migrate the analytical-report piece if the audit shows a
clean fit. Leave the formatted per-employee reports alone by default.

---

## TD-4: Tickets Stats Review

**Item:** `GET /tickets/stats` (`be-work/src/modules/tickets/routes/tickets.routes.js`,
`tickets.controller.js` `stats_ctrl`). Consumed by `useGetTicketStats` in
`fe-work/src/services/hrService.ts`, used by the **Approvals dashboard**
(`fe-work/src/pages/admin/approvals/index.tsx`) for a ticket status-breakdown widget
— not by the Tickets page itself (which already uses the generic engine per Sprint 1
Milestone 6).

**Status:** Live, used only by Approvals, not by Tickets.

**Decision (default, per Sprint 2 rule below):** If the Approvals dashboard is the
only consumer and it's a live operational widget rather than ad-hoc reporting, **keep
it as a specialized endpoint** — this is exactly the "operational dashboard" carve-out.
Only migrate later if a genuine architectural need arises (e.g. the widget needs to
become filterable/exportable like a real report).

---

## Sprint 2 ground rules (governing how/when these get picked up)

- Do not migrate existing working pages unless there is **measurable architectural
  benefit** (duplicate logic actually removed, a real bug fixed, or a genuinely new
  capability unlocked) — migration-for-consistency's-sake is not a reason.
- The generic Report Builder (`report_builder.controller.js`) is the platform's
  reporting engine for anything that is filter/groupBy/KPI-shaped ad-hoc reporting.
- **Operational dashboards** (HR Dashboard, Project Dashboard, Approvals Dashboard,
  etc.) may keep specialized endpoints when they serve a live operational workflow
  (real-time widget, action-driving view) rather than ad-hoc reporting — that
  distinction is the deciding line, not "is it a `groupBy` query."
- None of TD-1 through TD-4 block Sprint 2. They are picked up individually, each
  with its own audit-first pass, only when explicitly scheduled.
