# Testing Guide

## Backend Tests

### Run All Tests
```bash
cd Tekxai-management-BE-main
node --test tests/**/*.test.js
```

### Run Individual Suites
```bash
node --test tests/auth/auth.service.test.js
node --test tests/projects/projects.test.js
node --test tests/timesheets/timesheets.test.js
node --test tests/performance/bonus.test.js
```

### Test Coverage

| Suite | Tests | What's Covered |
|-------|-------|----------------|
| auth.service.test.js | 10 | Login validation, email normalisation, OTP format, camelCase/snake refresh key, role constants |
| projects.test.js | 4 | Status map, unknown status default, page offset, total pages |
| timesheets.test.js | 7 | Week start (Mon/Sun/Sat), duration formatting, weekly row count |
| bonus.test.js | 14 | All 5 bonus tiers, boundary values, engineering score calculation |

---

## Manual API Testing (curl)

### 1. Health Check
```bash
curl http://localhost:4000/api/v1/health
```

### 2. Login
```bash
curl -X POST http://localhost:4000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@tekxai.com","password":"Admin@123456"}'
```

Save `accessToken` and `refreshToken` from response.

### 3. Get Profile
```bash
curl http://localhost:4000/api/v1/auth/me \
  -H "Authorization: Bearer <accessToken>"
```

### 4. List Users
```bash
curl "http://localhost:4000/api/v1/user?page=1&limit=10" \
  -H "Authorization: Bearer <accessToken>"
```

### 5. Create Project
```bash
curl -X POST http://localhost:4000/api/v1/project \
  -H "Authorization: Bearer <accessToken>" \
  -H "Content-Type: application/json" \
  -d '{"title":"Test Project","start_date":"2026-06-01","end_date":"2026-12-31","total_hours":200}'
```

### 6. Token Refresh
```bash
curl -X POST http://localhost:4000/api/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refresh_token":"<refreshToken>"}'
```

### 7. List Assets
```bash
curl "http://localhost:4000/api/v1/asset?status=AVAILABLE" \
  -H "Authorization: Bearer <accessToken>"
```

### 8. Submit Daily Report
```bash
curl -X POST http://localhost:4000/api/v1/performance/daily-report \
  -H "Authorization: Bearer <accessToken>" \
  -H "Content-Type: application/json" \
  -d '{"todays_progress":"Completed login page fixes","completion_percentage":80,"blockers":"None","tomorrow_plan":"Start dashboard work"}'
```

---

## Frontend Testing

### Smoke Tests (Manual)

Run these after starting both backend and frontend:

1. **Login Flow**
   - Go to `http://localhost:5173/login`
   - Log in with `admin@tekxai.com` / `Admin@123456`
   - Verify redirect to `/admin`
   - Check browser DevTools → Application → localStorage for `tekxai_access_token`

2. **Employee Login**
   - Log in with `employee@tekxai.com` / `Employee@123`
   - Verify redirect to `/employee`

3. **Role Protection**
   - While logged in as employee, navigate to `/admin`
   - Verify redirect to `/403`

4. **Token Refresh**
   - Log in and wait 16 minutes (or shorten `JWT_EXPIRES_IN=1m` for testing)
   - Make any API call — verify it succeeds (refresh happened silently)

5. **Ticket Creation**
   - Log in as employee
   - Navigate to `/employee/tickets`
   - Click "Create Ticket"
   - Fill form and submit
   - Verify ticket appears in list (sourced from backend, not localStorage)

6. **Notifications**
   - Navigate to `/employee/notifications` or `/admin/notifications`
   - Verify real notifications load (or empty state if none created)
   - Click "Mark all as read"

7. **Project Save/Unsave**
   - Navigate to `/admin/projects`
   - Click the star icon on a project
   - Navigate to `/admin/starred`
   - Verify project appears

8. **Invite Flow**
   - Navigate to `/admin/settings` → Member Invites tab
   - Click "Invite Team Member"
   - Fill in email and role
   - Copy the invite link (check backend logs for token)
   - Open invite URL in incognito
   - Complete registration
   - Log in with new account

9. **Asset Management**
   - Navigate to `/admin/assets`
   - Click "Add Asset"
   - Fill form, save
   - Click "Assign" on an available asset
   - Select a user, assign
   - Verify status changes to ASSIGNED

10. **Daily Report**
    - Log in as employee
    - Navigate to `/employee/daily-report`
    - Submit a report
    - Verify it appears in the list
