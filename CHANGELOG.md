# Changelog

All notable changes to Tekxai ERP are documented here.

## [2.0.0] — 2026-06-16

### Added — Backend

**Schema & Database**
- Complete Prisma schema with 35+ production tables
- Departments & Divisions (org hierarchy)
- Projects, Tasks, Milestones
- Timesheet system (entries, edit requests, time-off policies/requests)
- Invites with token-based registration
- Notifications
- Support Tickets
- Marketing Deals + Salary Builders
- Asset Management (categories, locations, vendors, assignments, maintenance, disposals)
- Performance Management (daily reports, scores, bonus engine)
- User Settings

**Authentication**
- `GET /auth/me` — authenticated user profile
- `POST /auth/forgot` — OTP-based password reset
- `POST /auth/verify/:id` — OTP verification
- `POST /auth/reset/:id` — password reset
- `GET /auth/resendOTP/:id` — OTP resend
- JWT authenticate middleware
- RBAC authorize middleware

**New Roles Seeded**
- `EMPLOYEE`, `HR`, `MARKETING`, `DIVISION_MANAGER` (in addition to existing SUPER_ADMIN, ADMIN)

**New Modules**
- Users, Teams, Departments, Projects, Timesheets, Invites, Settings, Starred, Notifications, Tickets, Marketing, Assets, Performance

**Seeder**
- 5 departments, 14 divisions (including all EST-* codes)
- 4 time-off policies
- Asset categories, locations
- Bonus configurations (5 tiers, PKR-denominated)

### Added — Frontend

**New Pages**
- `/admin/assets` — Asset Management with full CRUD, assign/return/maintenance
- `/admin/performance` — Performance with daily reports, scoring, bonus approval
- `/employee/daily-report` — Daily progress report submission
- `/403` — Forbidden access page

**New Services**
- `notificationService.ts`
- `assetService.ts`
- `performanceService.ts`
- `departmentService.ts`

**Sidebar Updates**
- Admin: Asset Management, Performance links added
- Employee: Daily Report link added

### Fixed

- **BUG-001** Token key mismatch (`accessToken` vs `access_token`)
- **BUG-002** Refresh token key mismatch (`refreshToken` vs `refresh_token`)
- **BUG-003** Post-login redirect — `role_name` now in user response
- **BUG-004** EMPLOYEE role missing — all 6 roles now exist
- **BUG-006** Admin dashboard called wrong endpoint (`packing-list/summary`)
- **BUG-007** Hardcoded LAN IP `192.168.0.231:3022` as fallback
- **BUG-017** AcceptInvite form missing Formik `validate` prop

### Changed

- `employeeService.ts` — all mock data replaced with real API calls
- `ticketService.ts` — localStorage implementation replaced with backend API
- `adminService.ts` — correct dashboard stats endpoint
- `marketingService.ts` — real API hooks for deals and salary data
- `notifications/index.tsx` — connected to real notification API
- `admin/dashboard/index.tsx` — real stats from projects + timesheet
- `constants/roles.ts` — all 6 roles, fixed `EMPLOYEE` spelling
- `routes/router.tsx` — role guards fixed, new pages added, `/403` route added
- `ProtectedRoute.tsx` — redirects to `/403` instead of silent logout
- `app.js` — CORS credentials enabled, body size limit increased to 10mb

---

## [1.0.0] — 2026-06-07 (Original)

- Initial project with auth-only backend (login, refresh, logout)
- Frontend with mock data throughout
- Basic UI screens (admin, employee, marketing portals)
- Chat UI (mock data, no backend)
