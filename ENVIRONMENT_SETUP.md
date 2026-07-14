# Environment Setup Guide

## Prerequisites

| Tool | Version |
|------|---------|
| Node.js | ≥ 20.x |
| npm | ≥ 10.x |
| PostgreSQL | ≥ 14 |

---

## Backend Setup

### 1. Install dependencies
```bash
cd Tekxai-management-BE-main
npm install
```

### 2. Configure environment
```bash
cp .env.example .env.development
```

Edit `.env.development`:

```env
NODE_ENV=development
PORT=4000
DATABASE_URL=postgresql://postgres:password@localhost:5432/tekxai_erp?schema=public

# Generate with: openssl rand -hex 64
JWT_SECRET=<64-byte-hex>
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=<64-byte-hex>
JWT_REFRESH_EXPIRES_IN=7d

CORS_ORIGIN=http://localhost:5173

SEED_SUPER_ADMIN_EMAIL=superadmin@tekxai.com
SEED_SUPER_ADMIN_PASSWORD=SuperAdmin@123
SEED_SUPER_ADMIN_FIRST_NAME=Super
SEED_SUPER_ADMIN_LAST_NAME=Admin

SEED_ADMIN_EMAIL=admin@tekxai.com
SEED_ADMIN_PASSWORD=Admin@123456
SEED_ADMIN_FIRST_NAME=System
SEED_ADMIN_LAST_NAME=Admin

SEED_EMPLOYEE_EMAIL=employee@tekxai.com
SEED_EMPLOYEE_PASSWORD=Employee@123
```

### 3. Create database
```bash
psql -U postgres -c "CREATE DATABASE tekxai_erp;"
```

### 4. Run migrations
```bash
npm run db:migrate:dev
# When prompted for migration name, enter: complete_schema
```

### 5. Seed the database
```bash
npm run db:seed
```

### 6. Start backend
```bash
npm run start:dev
# Server runs at http://localhost:4000
```

---

## Frontend Setup

### 1. Install dependencies
```bash
cd Tekxai-management-FE-main
npm install
```

### 2. Configure environment
```bash
# Create .env file
echo "VITE_API_BASE_URL=http://localhost:4000/" > .env
```

### 3. Start frontend
```bash
npm run dev
# App runs at http://localhost:5173
```

---

## Default Login Credentials

| Role | Email | Password |
|------|-------|---------|
| Super Admin | superadmin@tekxai.com | SuperAdmin@123 |
| Admin | admin@tekxai.com | Admin@123456 |
| Employee (demo) | employee@tekxai.com | Employee@123 |

---

## Production Deployment

### Backend

This is a manual deployment — there is no CI/CD pipeline. Every step below must be run, **in order**, on the production host on every deploy.

```bash
# 1. Pull latest code
git pull origin main

# 2. Install dependencies
npm install
# (use `npm ci` instead if you want a clean, lockfile-exact install —
# safe here since there is no postinstall script to worry about)

# 3. Generate the Prisma Client
npx prisma generate
```

**Why step 3 is required, and why it can't be skipped:** `npm install` normally regenerates the Prisma Client automatically via `@prisma/client`'s own install hook, but that only happens if the install actually runs with lifecycle scripts enabled against a clean/updated `node_modules`. If `node_modules` is reused/cached from a previous deploy, or the install step is skipped, or `schema.prisma` changed since the client was last generated, the generated client at `.prisma/client` goes stale or missing — even though the `@prisma/client` *package* itself is present. Running `npx prisma generate` explicitly removes that dependency on install-time side effects and guarantees the client matches the current `schema.prisma`.

**`prisma migrate deploy` (step 4 below) does NOT generate the client.** Migrating and generating are two independent Prisma operations: `migrate deploy` only applies pending SQL migrations to the database — it has no effect on the generated client code in `node_modules/@prisma/client`. Running migrations without also generating leaves you with a database schema that's ahead of the client your app is actually loading.

```bash
# 4. Run database migrations
NODE_ENV=production npx prisma migrate deploy

# 5. Restart the application
pm2 restart tekxai-be
```

### Verify the deployment

Run all of these after every deploy — a clean PM2 status alone is not sufficient proof the app is actually serving requests correctly:

```bash
# PM2 process is up and not crash-looping
pm2 status tekxai-be

# Application logs show a clean startup (no MODULE_NOT_FOUND / prisma:error lines)
pm2 logs tekxai-be --lines 50

# Health endpoint responds
curl -s http://localhost:4000/api/v1/health
# expect: {"success":true,"message":"OK",...}

# Prisma Client loads successfully (a route that touches the DB returns
# 401 "Authentication required" rather than 404 "Route not found" or a
# 500 with a prisma:error stack — a 404 on a route you know exists means
# the process didn't pick up the new routes at all; a prisma:error/500
# means the client or DB connection is broken)
curl -s http://localhost:4000/api/v1/user
```

### Frontend
```bash
# Set VITE_API_BASE_URL to your production API URL
npm run build
# Serve the dist/ folder with nginx or similar
```

### Required production environment variables
- `DATABASE_URL` — PostgreSQL connection string
- `JWT_SECRET` — 64+ byte random hex (never reuse dev secret)
- `JWT_REFRESH_SECRET` — 64+ byte random hex (different from JWT_SECRET)
- `CORS_ORIGIN` — Your frontend domain, e.g. `https://app.tekxai.com`
- `NODE_ENV=production`

---

## Deployment Troubleshooting

### `Error: Cannot find module '.prisma/client/default'`

**Cause:** The Prisma Client was never (re)generated after the last `npm install`/`git pull`. The `@prisma/client` package is present in `node_modules`, but the generated client output it depends on at runtime (`.prisma/client`) is missing or out of date with `schema.prisma`. This most often happens when a deploy skips `npx prisma generate`, or reuses a stale `node_modules` directory from before a schema change.

**Fix:**
```bash
npx prisma generate
pm2 restart tekxai-be
```
Then re-run the verification steps above to confirm the app started cleanly.

### A route that should exist returns `404 {"success":false,"message":"Route not found"}`

**Cause:** This is Express's own catch-all 404 handler, which only fires when **no route in the currently-running process** matches the path — meaning the deployed code predates that route being added, i.e. steps 1–2 above (`git pull` / `npm install`) were not actually run, or the app wasn't restarted afterward. This is different from a `404 "X not found"` coming from a controller (e.g. "Designation not found"), which means the route *did* match and a specific record lookup failed — that's an application-level 404, not a deployment gap.

**Fix:** Confirm the latest commit is checked out (`git log -1`), re-run the full deployment sequence above, and re-verify with the health/route checks.

### `prisma:error` / `P1001` or similar during migrate or at runtime

**Cause:** Usually `DATABASE_URL` is missing, wrong, or the target database doesn't exist/isn't reachable from the host.

**Fix:** Confirm `DATABASE_URL` is set in the production environment (see "Required production environment variables" above) and points at the correct database, then retry `npx prisma migrate deploy`.
