# Simplidoro

A web-based productivity timer with three modes and structured reflection.

## Stack

- **Frontend:** React 18 + TypeScript + Vite
- **Backend:** Node 20 + Express + TypeScript (ts-node in dev, tsc in prod)
- **Database:** Neon PostgreSQL via postgres.js (app queries) + pg (transitive, session store only)
- **Auth:** passport + passport-google-oauth20 → Google OAuth
- **Sessions:** express-session + connect-pg-simple

## Setup

1. `git clone <repo>` and `cd Pomodoro`
2. `npm install` (installs both workspaces)
3. Create a Neon database. Copy the pooled connection string.
4. Create a Google OAuth client at https://console.cloud.google.com/apis/credentials
   - Authorized redirect URI: `http://localhost:3001/api/auth/google/callback`
   - Scopes: `profile`, `email`
5. Copy `.env.example` to `.env` and fill in: `DATABASE_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL`, `SESSION_SECRET`
6. `npm run migrate` — applies migrations 001 (users) + 002 (sessions). Idempotent.
7. `npm run dev` — starts server on `:3001`, client on `:5173`. Open `http://localhost:5173`.

## Verification

- `npm run smoke` — hits `/api/health`, exits 0 on success.
- `npm run test` — runs server vitest suite.

## Documentation

Full project documentation lives in the Claude Project (Batches A through G). Local working copies live in `Documentation/` (untracked).

## devDep audit (libraries not in Batch D §11.2)

These devDeps are used solely to support the approved runtime stack and are treated as implicitly approved:
- `ts-node`, `concurrently`, `vitest`, `supertest`, `@vitejs/plugin-react`, all `@types/*`

## Phase status

Phase 0 (Foundation) — in progress. See `docs/phase-0-plan.md` (local, gitignored).
