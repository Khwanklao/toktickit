# TokTickIT (Lab 4 — Actions Taken, Ticket Resolution Gate, and Dual Dashboards)

TokTickIT is an enterprise IT Helpdesk Support and Ticketing System built with a **React** frontend, a **Node.js + Express** backend, and a **PostgreSQL** database managed via **Prisma ORM**.

Lab 4 extends the core ticketing workflow by introducing:

- an immutable **Actions Taken** audit log,
- an automated **Resolution Gate** requiring at least one qualifying service action before resolving tickets, and
- dedicated **Dual Dashboards**: a Requester Dashboard (attention-required notifications and drill-down filters) and an IT Staff Operational Dashboard.

All features maintain strict backward compatibility, optimistic concurrency controls, and the signature Zen Green visual design language.

---

## Project Structure

| Path | Description |
|---|---|
| `client/` | React 18 + TypeScript + Vite frontend styled with the Zen Green theme CSS |
| `server/` | Node.js + Express + TypeScript backend REST API using Prisma ORM (`server/prisma/`) |
| `docs/lab-04/` | Sprint 4 engineering contracts: `specification.md`, `api-spec.md`, `ui-spec.md`, `tests.md`, `reviewer.md`, `ai-use.md` |
| `e2e/lab-04/` | Playwright end-to-end suites: `actions-taken-flow.spec.ts`, `dashboards.spec.ts`, `ticket-resolution.spec.ts` |
| `artifacts/lab-04/screenshots/` | Visual evidence across desktop, tablet, and mobile viewports: `actions-taken/`, `requester-dashboard/`, `staff-dashboard/`, `regression/` |

---

## Prerequisites

- Node.js v18 or higher
- npm v9 or higher
- A PostgreSQL database instance

---

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

Make sure `DATABASE_URL` (the PostgreSQL connection string) and `PORT` (default `3000`) are set correctly in `server/.env`.

> **Never commit `.env` to source control.**

### 3. Database Migration & Safe Seeding

Run the Prisma migrations and the idempotent seed script:

```bash
# Apply schema changes (ActionTaken model and Ticket.reopenedAt field)
npm --prefix server run prisma:migrate

# Seed default accounts (Requesters, IT Staff, Administrators), categories, and tickets
npm --prefix server run prisma:seed
```

The seed script is safe to run repeatedly.

> **⚠️ Warning / Operational Note:** Running the seed script (`npm --prefix server run prisma:seed` or `npm run prisma:seed`) performs idempotent upserts on demo tickets `TKT-2026-000101` through `TKT-2026-000109`. This overwrites their `summary`, `description`, `requestedPriority`, `itPriority`, `status`, `isRequesterResolved`, `reopenedAt`, `ownerId`, and `updatedAt` to restore a deterministic demo state.

#### Seed Accounts (local development only)

| Role | Email | Status |
|---|---|---|
| Requester | `req.active1@toktickit.local` to `req.active4@toktickit.local` | Active |
| Requester | `req.zero@toktickit.local` (zero tickets, for dashboard empty state) | Active |
| Requester | `req.inactive@toktickit.local` | Inactive |
| IT Staff | `staff.alex@toktickit.local`, `staff.sarah@toktickit.local`, `staff.david@toktickit.local` | Active |
| IT Staff | `staff.inactive@toktickit.local` | Inactive |
| Administrator | `admin.main@toktickit.local`, `admin.secondary@toktickit.local` | Active |

All seeded accounts share the local-only password `Password123!` (defined in `server/prisma/seed.ts`). Only `req.active4@toktickit.local` is flagged to change its password at first login, to verify the password-rotation flow.

These credentials are for **local development only**. Never reuse real passwords or secrets.

Re-running `npm --prefix server run prisma:seed` resets every seeded account's password and first-login flag to this initial state (recommended before running E2E tests).

### 4. Running Development Servers

Run the backend and frontend in two separate terminals from the project root:

| Service | Command | URL |
|---|---|---|
| Server (Express) | `npm run dev:server` | http://localhost:3000 |
| Client (Vite) | `npm run dev:client` | http://localhost:5173 |

### 5. Running Automated Tests

```bash
# Run all client and server test suites
npm test

# Run server unit, API integration, and Lab 4 domain logic tests
npm run test:server

# Run client UI component and responsive tests
npm run test:client

# Run Playwright E2E suites for Lab 4 flows
npm run test:e2e
```

Before running E2E tests, re-seed the database (`npm --prefix server run prisma:seed`) so that seeded accounts and sample tickets start from their initial deterministic state.

---

## Documentation

All Sprint 4 engineering documents are in `docs/lab-04/`:

| Document | Contents |
|---|---|
| [`specification.md`](docs/lab-04/specification.md) | System architecture, business rules (BR-01 to BR-16), rollback procedures, and resolution gate behavior |
| [`api-spec.md`](docs/lab-04/api-spec.md) | REST API endpoints for Actions Taken, status transitions, and metric aggregations |
| [`ui-spec.md`](docs/lab-04/ui-spec.md) | Interface specifications for the Requester and Staff dashboards, modals, and responsive breakpoints |
| [`tests.md`](docs/lab-04/tests.md) | Traceability matrix covering unit, integration, and E2E regression test suites |
| [`reviewer.md`](docs/lab-04/reviewer.md) | Peer review records, change matrices, and sign-offs across Issues 2 through 7 |
| [`ai-use.md`](docs/lab-04/ai-use.md) | Documentation of AI assistance, prompting workflows, and validation methods |