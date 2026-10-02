# TokTickIT (Lab 2 — Requester Ticketing MVP)

TokTickIT is an IT Helpdesk Support and Ticketing System built with a React frontend, Node.js + Express backend, and PostgreSQL database managed via Prisma ORM. Lab 2 implements the complete Requester-facing ticketing experience using the Zen Green visual language, temporary Development Requester selection, attachment management, and comprehensive automated test suites.

## Project Structure

* `client/` - React 18 + TypeScript + Vite frontend styled with Zen Green Theme CSS.
* `server/` - Node.js + Express + TypeScript backend REST API using Prisma ORM (`server/prisma/`).
* `docs/lab-02/` - Sprint documentation including `specification.md`, `api-spec.md`, `ui-spec.md`, `tests.md`, `reviewer.md`, and `ai-use.md`.
* `e2e/lab-02/` - Playwright End-to-End and responsive design test suites.
* `artifacts/lab-02/` - Playwright screenshot artifacts across desktop, tablet, and mobile viewports.

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

Ensure `DATABASE_URL` and `PORT` are properly configured in `server/.env`.

### 3. Database Migration & Idempotent Seeding

Run Prisma migrations and seed default Requesters, Categories, and Systems:

```bash
npm --prefix server run prisma:migrate
npm --prefix server run prisma:seed
```

### 4. Running Development Servers

Run both the frontend and backend servers concurrently from the project root:

```bash
npm run dev
```

Or start them individually:

* **Client (Vite):** `npm run dev:client` (Runs on `http://localhost:5173`)
* **Server (Express):** `npm run dev:server` (Runs on `http://localhost:3000`)

### 5. Running Automated Tests

TokTickIT has 100% test coverage across all layers (107/107 tests passing):

```bash
# Run unit, API, and component test suites (88 tests)
npm test

# Run Server Unit & API integration tests (62 tests)
npm run test:server

# Run Client UI component tests (26 tests)
npm run test:client

# Run Playwright E2E and Responsive tests (19 tests)
npx playwright test
```
