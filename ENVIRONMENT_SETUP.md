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
```bash
# Set NODE_ENV=production in environment
npm run db:migrate:prod
npm run start:prod
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
