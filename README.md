# TokTickIT

TokTickIT is an IT Helpdesk Support and Ticketing System built with a React frontend, Node.js + Express backend, and PostgreSQL database managed via Prisma ORM.

## Project Structure

- `client/` - React + TypeScript + Vite frontend application (styled with Bootstrap).
- `server/` - Node.js + Express + TypeScript backend REST API.
- `prisma/` - Prisma ORM database schema and configuration for PostgreSQL.
- `docs/lab-01/` - Documentation and lab review records for Lab 01.
- `tests/lab-01/` - Test suites for Lab 01 validation.

## Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- PostgreSQL database instance

## Getting Started

### 1. Installation

Install dependencies for both client and server:

```bash
cd client && npm install
cd ../server && npm install
```

### 2. Environment Setup

Copy `.env.example` files to `.env` in the server and prisma directories:

- `server/.env.example` -> `server/.env`
- `prisma/.env.example` -> `prisma/.env`

Update `DATABASE_URL` and `PORT` according to your local environment.

### 3. Database Migration & Seed

From the `server/` directory:

```bash
npx prisma migrate dev
npm run prisma:seed
```

### 4. Running Development Servers

From root:
- Run Client: `npm run dev:client`
- Run Server: `npm run dev:server`

Or individually within `client/` and `server/` directories using `npm run dev`.

### 5. Running Tests

- Run all tests: `npm test`
- Client unit tests: `npm run test:client`
- Server API tests: `npm run test:server`