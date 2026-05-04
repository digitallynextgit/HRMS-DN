# HRMS — Human Resource Management System

A full-featured HRMS built for **Digitally Next** using Next.js 14, Prisma, Supabase, and Tailwind CSS. Covers the complete HR lifecycle from recruitment to payroll.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Database | PostgreSQL via Supabase |
| ORM | Prisma v5 |
| Auth | NextAuth v5 (Credentials) |
| Storage | Supabase Storage |
| Styling | Tailwind CSS + shadcn/ui |
| State | TanStack Query + Zustand |
| Email | Nodemailer (SMTP/Gmail) |
| Package Manager | pnpm |

---

## Modules

| Module | Features |
|---|---|
| **Auth & PBAC** | Login, forgot/reset password, role-based permissions, permission matrix |
| **Employee Management** | Directory, profiles, add/edit, org chart, department & designation management |
| **Attendance** | Manual entry, CSV import, QR kiosk, GPS check-in, Hikvision device sync, holiday management |
| **Leave Management** | Apply for leave, approval workflow, leave balances, team calendar, leave types |
| **Payroll** | Salary structures, payroll generation, payslips, PF/ESI/TDS calculations, pro-rata & LOP |
| **Performance** | Review cycles, self-review, manager review, goals tracking |
| **Recruitment** | Job postings, applicant pipeline (Kanban with drag-and-drop), interview scheduling |
| **Projects & Tasks** | Project management, task assignment, my tasks view |
| **Documents** | Employee document locker, company library, Supabase Storage upload |
| **Notifications** | In-app notification inbox, email notifications |
| **Analytics** | Dashboard KPIs, department headcount, hire trends, recruitment pipeline charts |
| **Admin** | Roles & permissions, audit log, email template management |

---

## Automated Emails

| Trigger | Email Sent |
|---|---|
| New employee created | Welcome / onboarding email |
| Applicant moves to Screening | Shortlisting notification |
| Leave approved or rejected | Leave status email to employee |
| Employee birthday (daily cron) | Birthday greeting |

---

## Project Structure

```
HRMS/
├── app/
│   ├── (auth)/              # Login, forgot password, reset password
│   ├── (dashboard)/         # All protected pages
│   │   ├── dashboard/       # Main dashboard
│   │   ├── employees/       # Employee management
│   │   ├── attendance/      # Attendance tracking
│   │   ├── leave/           # Leave management
│   │   ├── payroll/         # Payroll & salary
│   │   ├── performance/     # Reviews & goals
│   │   ├── recruitment/     # Jobs & applicants
│   │   ├── projects/        # Projects & tasks
│   │   ├── documents/       # Document management
│   │   ├── notifications/   # Notification inbox
│   │   ├── analytics/       # Reports & charts
│   │   └── admin/           # Roles, audit log, email templates
│   └── api/                 # All API routes (REST)
├── components/
│   ├── ui/                  # shadcn/ui primitives
│   ├── layout/              # Sidebar, topbar, breadcrumbs
│   └── shared/              # Reusable components
├── lib/
│   ├── db.ts                # Prisma singleton
│   ├── auth-options.ts      # NextAuth config
│   ├── storage.ts           # Supabase Storage client
│   ├── mailer.ts            # Nodemailer wrapper
│   ├── queue.ts             # Email job dispatcher
│   ├── permissions.ts       # PBAC helpers
│   ├── constants.ts         # Permission definitions, roles
│   └── utils.ts             # cn(), formatDate(), etc.
├── prisma/
│   ├── schema.prisma        # Full database schema
│   ├── seed.ts              # Seed script (35 employees)
│   └── migrations/          # All SQL migrations
└── middleware.ts            # Edge auth + permission checks
```

---

## Getting Started (Local Development)

### Prerequisites

- Node.js 18+
- pnpm (`npm install -g pnpm`)
- A Supabase project (free tier works)

### 1. Clone and install

```bash
git clone https://github.com/digitallynextgit/HRMS-DN.git
cd HRMS-DN
pnpm install
```

### 2. Configure environment

Create a `.env` file in the root:

```env
# Database — use Supabase session pooler URL
DATABASE_URL="postgresql://postgres.[ref]:[password]@aws-1-[region].pooler.supabase.com:5432/postgres"

# Supabase Storage
NEXT_PUBLIC_SUPABASE_URL="https://[ref].supabase.co"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
SUPABASE_STORAGE_BUCKET="hrms-documents"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
AUTH_SECRET="generate-with-openssl-rand-base64-32"

# Email (Gmail SMTP)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER="your-gmail@gmail.com"
SMTP_PASS="your-gmail-app-password"
SMTP_FROM="HRMS <noreply@yourcompany.com>"

# App
APP_NAME="HRMS"
APP_URL="http://localhost:3000"
NODE_ENV="development"
CRON_SECRET="your-cron-secret"
```

> **Supabase connection:** Use the **Session pooler** URL from Supabase → Settings → Database → Connection pooling → Session mode. Direct port 5432 may be blocked by some ISPs.

> **Gmail SMTP:** Enable 2FA on your Gmail account, then generate an App Password at myaccount.google.com/apppasswords.

### 3. Run migrations and seed

```bash
pnpm prisma migrate deploy
pnpm prisma db seed
```

This creates all tables and seeds:
- 35 employees (34 real + 1 system admin)
- Roles, permissions, departments, designations
- Leave types, salary structures, attendance logs
- Demo projects, performance reviews, job postings

### 4. Create Supabase Storage bucket

In your Supabase dashboard → Storage → Create bucket named `hrms-documents` (keep it **private**).

### 5. Start the dev server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000)

**Default login:**
```
Email:    admin@hrms.dev
Password: Admin@123
```

---

## Deployment (Vercel)

### 1. Push to GitHub

```bash
git push origin main
```

### 2. Import on Vercel

- Go to [vercel.com](https://vercel.com) → Add New → Project
- Import `digitallynextgit/HRMS-DN`
- Framework: **Next.js** (auto-detected)

### 3. Set environment variables

Add all variables from your `.env` in Vercel project settings. Update:
- `NEXTAUTH_URL` → your Vercel URL (e.g. `https://hrms-dn.vercel.app`)
- `APP_URL` → same Vercel URL
- `NODE_ENV` → `production`

### 4. Deploy

Vercel builds and deploys automatically on every push to `main`.

---

## Birthday Email Cron

The birthday cron is a protected API route — it does **not** run automatically on Vercel. Set up a free daily trigger at [cron-job.org](https://cron-job.org):

- **URL:** `https://your-vercel-url.vercel.app/api/cron/birthdays`
- **Method:** GET
- **Header:** `Authorization: Bearer your-cron-secret`
- **Schedule:** Daily at 9:00 AM

---

## Roles & Permissions

| Role | Access |
|---|---|
| `super_admin` | Full access to everything |
| `hr_admin` | Full HR module access |
| `hr_manager` | HR management with limited admin |
| `employee` | Self-service (own profile, leave, payslips) |
| `viewer` | Read-only access |

Custom roles can be created from Admin → Roles & Permissions.

---

## Scripts

```bash
pnpm dev                      # Start development server
pnpm build                    # Production build
pnpm start                    # Start production server
pnpm prisma migrate deploy    # Apply migrations to database
pnpm prisma db seed           # Seed database with demo data
pnpm prisma studio            # Open Prisma Studio (DB GUI)
```
