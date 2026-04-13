# HRMS — Human Resource Management System

A full-featured HRMS built with Next.js 14 App Router, PostgreSQL, and modern tooling.

## Tech Stack

- **Framework:** Next.js 14 (App Router) — frontend + API routes in one project
- **Database:** PostgreSQL 16 via Prisma ORM
- **Auth:** NextAuth v5 (credentials + Google OAuth)
- **Queue:** BullMQ + Redis (async email delivery)
- **Storage:** MinIO (S3-compatible file storage)
- **UI:** shadcn/ui + Tailwind CSS
- **Package Manager:** pnpm

## Modules

| Module | Status |
|---|---|
| Auth & PBAC (roles, permissions, audit log) | ✅ Done |
| Employee Management (directory, org chart, profiles) | ✅ Done |
| Document Management (upload, signed URLs) | ✅ Done |
| Email Engine (templates, queue, notifications) | ✅ Done |
| Attendance (Hikvision integration) | 🔜 Phase 2 |
| Leave Management | 🔜 Phase 2 |
| Payroll | 🔜 Phase 2 |
| Performance Evaluation | 🔜 Phase 3 |
| Recruitment | 🔜 Phase 3 |
| Projects | 🔜 Phase 4 |
| Analytics | 🔜 Phase 4 |

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm
- Docker (for PostgreSQL, Redis, MinIO)

### 1. Clone & install

```bash
git clone <repo-url>
cd HRMS
pnpm install
```

### 2. Environment variables

```bash
cp .env.example .env
# Fill in your values (see .env.example for reference)
```

### 3. Start infrastructure

```bash
# Start all three services
docker run -d --name hrms-postgres \
  -e POSTGRES_DB=hrms \
  -e POSTGRES_USER=hrms_user \
  -e POSTGRES_PASSWORD=hrms_password_dev \
  -p 5432:5432 postgres:16-alpine

docker run -d --name hrms-redis -p 6379:6379 redis:7-alpine

docker run -d --name hrms-minio \
  -e MINIO_ROOT_USER=hrms_minio \
  -e MINIO_ROOT_PASSWORD=hrms_minio_secret \
  -p 9000:9000 -p 9001:9001 \
  minio/minio server /data --console-address ":9001"

# Or if you have docker compose working:
docker compose up -d
```

### 4. Database setup

```bash
pnpm prisma migrate dev --name init
pnpm prisma db seed
```

### 5. Run the app

```bash
# App
pnpm dev

# Email worker (separate terminal, optional)
pnpm worker
```

Open [http://localhost:3000](http://localhost:3000)

## Test Accounts

All accounts use password: `Admin@123`

| Role | Email |
|---|---|
| Super Admin | admin@hrms.dev |
| HR Admin | priya.sharma@hrms.dev |
| HR Manager | rahul.verma@hrms.dev |
| Employee | neha.gupta@hrms.dev |
| Viewer | viewer@hrms.dev |

## Daily Development

```bash
# Start containers (after PC restart)
docker start hrms-postgres hrms-redis hrms-minio

# Stop containers
docker stop hrms-postgres hrms-redis hrms-minio
```
