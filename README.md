# TokTickIT (Lab 3 — Users, Roles, IT Staff Ticketing, and Admin Screens)

TokTickIT is an enterprise IT Helpdesk Support and Ticketing System built with a React frontend, Node.js + Express backend, and PostgreSQL database managed via Prisma ORM. Lab 3 replaces the temporary Development Requester selector with real authentication, HttpOnly cookie-based session management, and server-side role-based authorization across three roles: Requester, IT Staff, and Administrator. It also introduces mandatory first-login password changes, IT Staff Ticket Queue & Detail workflows, Public Comments vs. role-restricted Internal Notes, decoupled IT Priority, and minimalist Administrator User Management adhering strictly to the Zen Green visual language.

## Project Structure

* `client/` - React 18 + TypeScript + Vite frontend styled with Zen Green Theme CSS.
* `server/` - Node.js + Express + TypeScript backend REST API using Prisma ORM (`server/prisma/`).
* `docs/lab-03/` - Sprint 3 engineering contracts including `specification.md`, `api-spec.md`, `ui-spec.md`, `tests.md`, `reviewer.md`, and `ai-use.md`.
* `e2e/lab-03/` - Playwright End-to-End test suites (`authentication.spec.ts`, `staff-ticket-flow.spec.ts`, `user-administration.spec.ts`).
* `artifacts/lab-03/screenshots/` - Visual evidence across desktop, tablet, and mobile viewports (`authentication/`, `staff-queue/`, `staff-ticket-detail/`, `user-management/`).

## Prerequisites

* Node.js (v18 or higher)
* npm (v9 or higher)
* PostgreSQL database instance

## Getting Started

### 1. Installation

Install root and workspace dependencies:

```bash
npm install
npm --prefix server install
npm --prefix client install
```

### 2. Environment Setup

Copy `.env.example` in the `server/` directory to `.env`:

```bash
cp server/.env.example server/.env
```

Ensure `DATABASE_URL` (PostgreSQL connection string) and `PORT` (default `3000`) are set correctly in `server/.env`. Never commit `.env` to source control.

### 3. Database Migration & Safe Seeding

Run Prisma migrations, legacy data migration, and the idempotent seed script:

```bash
# Apply schema changes and evolve legacy Requesters to Users
npm --prefix server run prisma:migrate

# Seed default accounts (Requesters, IT Staff, Administrators), categories, and related systems
npm --prefix server run prisma:seed
```

The seed script is safe to run repeatedly.

**Seed Accounts** (for local development only):

| Role | Email | Status |
|---|---|---|
| Requester | `req.active1@toktickit.local` to `req.active4@toktickit.local` | Active |
| Requester | `req.inactive@toktickit.local` | Inactive |
| IT Staff | `staff.alex@toktickit.local`, `staff.sarah@toktickit.local`, `staff.david@toktickit.local` | Active |
| IT Staff | `staff.inactive@toktickit.local` | Inactive |
| Administrator | `admin.main@toktickit.local`, `admin.secondary@toktickit.local` | Active |

All seeded accounts share the local-only password `Password123!` (defined in `server/prisma/seed.ts`). Only `req.active4@toktickit.local` is flagged to change its password at first login; it is used to demonstrate the mandatory password change. These credentials are for local development only; never reuse real passwords or secrets. Re-running `npm --prefix server run prisma:seed` resets every seeded account's password and first-login flag to this initial state (recommended before running E2E tests).

### 4. Running Development Servers

Run the backend and frontend in two separate terminals from the project root:

* Server (Express): `npm run dev:server` (runs on `http://localhost:3000`)
* Client (Vite): `npm run dev:client` (runs on `http://localhost:5173`)

### 5. Running Automated Tests

```bash
# Run all client and server test suites
npm test

# Run Server unit, API integration, and Security/RBAC tests
npm run test:server

# Run Client UI component and Responsive tests
npm run test:client

# Run Playwright E2E and multi-role workflow tests
npm run test:e2e
```

Before running E2E tests, re-seed the database (`npm --prefix server run prisma:seed`) so that seeded accounts start from their initial state.

## Documentation

All Sprint 3 engineering documents are in [`docs/lab-03/`](docs/lab-03/):

* [`specification.md`](docs/lab-03/specification.md)
* [`api-spec.md`](docs/lab-03/api-spec.md)
* [`ui-spec.md`](docs/lab-03/ui-spec.md)
* [`tests.md`](docs/lab-03/tests.md)
* [`reviewer.md`](docs/lab-03/reviewer.md)
* [`ai-use.md`](docs/lab-03/ai-use.md)