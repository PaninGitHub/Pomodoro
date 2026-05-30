# SIMPLIDORO — DOCUMENTATION PACK
# BATCH D: TECHNICAL BLUEPRINT
# Sections 11–12

---

PROJECT: Simplidoro
VERSION: 1.0 — Documentation Pack
GENERATED: 2025-07-14
STACK: React + TypeScript + Vite | Node.js + Express |
       postgres.js + Neon PostgreSQL | passport.js + Google OAuth |
       express-session + connect-pg-simple | Cloudflare R2
DEPLOYMENT TARGET: Vercel + Railway + Neon
DOCUMENTATION STATUS: DRAFT — Pending author review
CODING MODEL INSTRUCTIONS: Read all batches before implementing. Treat every
MUST as a hard constraint. SHOULD as a strong default. Never implement a
feature not in Batch B. Never introduce a library not confirmed in Batch D.
Flag any ambiguity before writing code.

---

## CORRECTIONS APPLIED IN THIS DOCUMENT

D-01: settings.user_id relationship corrected to one-to-one (was one-to-many).
      UNIQUE constraint on user_id enforces this at DB level.

D-02: reflections table hardcoded answer columns removed. Replaced with
      single answers JSONB column keyed by prompt_key. focus_rating retained
      as explicit column for Reports query performance. All downstream SQL
      references to removed columns must use answers->>'key' syntax.

D-03: pg (node-postgres) added to §11.2 as a permitted transitive dependency
      required by connect-pg-simple's session store. connect-pg-simple
      builds its own internal pg.Pool from DATABASE_URL via its conString
      option. Application code MUST continue to use postgres.js for all
      queries. pg is never imported or referenced anywhere outside the
      session store configuration.

D-04: reflections.tasks_snapshot per-entry shape extended from
      { task_id, name, is_complete } to
      { task_id, name, is_complete, added_during_period }.
      Backward-compatible JSONB extension — existing readers see the
      original three fields untouched. Driven by the Phase 3 reflection
      UI (F-07) which renders a Completed / Incomplete split with a
      visual indicator on tasks that weren't in the period-start
      snapshot. Deleted tasks (in snapshot, missing from live) are
      omitted from the persisted shape per §5 of the Phase 3 plan.

---

## CODING MODEL CONTEXT — BATCH D

This batch defines the full technical architecture and data model.
Every table, column, type, constraint, relationship, and API endpoint
is specified here. No database schema decision or API design may
contradict this batch. Prior constraints that apply:
- Simple, maintainable architecture over unnecessary complexity. [Batch A]
- No library not listed in Section 11 may be introduced. [Batch A Section 2.3]
- All SQL must use parameterized queries. Never string-concatenated. [Batch E]
- Timer accuracy uses datetime difference, not setInterval alone. [Batch B F-04]

---

## SECTION 11: TECHNICAL ARCHITECTURE

### 11.1 Confirmed Stack

| Layer              | Technology                         | Purpose                        |
|--------------------|------------------------------------|--------------------------------|
| Frontend framework | React 18 + TypeScript              | UI rendering                   |
| Build tool         | Vite                               | Frontend bundling              |
| Backend framework  | Node.js + Express                  | API server                     |
| Database           | Neon PostgreSQL                    | Persistent storage             |
| DB access          | postgres.js                        | Raw SQL, parameterized queries |
| Schema migrations  | Numbered .sql files in /migrations | Version-controlled schema      |
| Authentication     | passport.js + google-oauth20       | Google OAuth flow              |
| Session management | express-session + connect-pg-simple| HTTP-only cookie sessions      |
| Audio hosting      | Cloudflare R2                      | Ambient sound files            |
| Frontend hosting   | Vercel                             | Static + CDN                   |
| Backend hosting    | Railway                            | Always-on Express server       |

---

### 11.2 Approved Libraries Only

The coding model must not install any library not in this list without
explicit owner approval.

| Library                  | Version | Purpose                               |
|--------------------------|---------|---------------------------------------|
| react                    | 18.x    | UI framework                          |
| react-dom                | 18.x    | DOM rendering                         |
| typescript               | 5.x     | Type safety (simple types only)       |
| vite                     | 5.x     | Build tool                            |
| express                  | 4.x     | Backend API server                    |
| postgres                 | 3.x     | postgres.js raw SQL client            |
| passport                 | 0.6.x   | Authentication middleware             |
| passport-google-oauth20  | 2.x     | Google OAuth strategy                 |
| express-session          | 1.x     | Session middleware                    |
| connect-pg-simple        | 9.x     | PostgreSQL session store              |
| pg                       | 8.x     | Transitive dependency required by     |
|                          |         | connect-pg-simple. Used internally    |
|                          |         | for the session store pool. Never     |
|                          |         | imported or used in application code  |
|                          |         | — postgres.js is the only client for  |
|                          |         | app queries. See correction D-03.     |
| cors                     | 2.x     | CORS middleware                       |
| helmet                   | 7.x     | Security HTTP headers                 |
| express-rate-limit       | 7.x     | API rate limiting                     |
| dotenv                   | 16.x    | Environment variable loading          |
| [OPEN] charting library  | TBD     | Reports graphs. Recommended: Recharts |
|                          |         | Owner must confirm before use.        |

---

### 11.3 Repository Structure

  simplidoro/
  |
  +-- /client                        <- React frontend (Vite)
  |       +-- /src
  |       |       +-- /components
  |       |       +-- /pages
  |       |       +-- /hooks
  |       |       +-- /context
  |       |       +-- /types
  |       |       +-- /config
  |       |       |       +-- reflection-prompts.config.ts
  |       |       +-- /utils
  |       |       +-- App.tsx
  |       |       +-- main.tsx
  |       +-- index.html
  |       +-- vite.config.ts
  |
  +-- /server                        <- Node.js + Express backend
  |       +-- /routes
  |       +-- /controllers
  |       +-- /middleware
  |       +-- /db
  |       |       +-- /migrations
  |       |       |       +-- 001_create_users.sql
  |       |       |       +-- 002_create_sessions.sql
  |       |       |       +-- 003_create_tasks.sql
  |       |       |       +-- 004_create_reflections.sql
  |       |       |       +-- 005_create_break_activities.sql
  |       |       |       +-- 006_create_break_logs.sql
  |       |       |       +-- 007_create_settings.sql
  |       |       |       +-- 008_create_custom_prompts.sql
  |       |       |       +-- 009_create_timer_sessions.sql
  |       |       +-- db.ts
  |       +-- /types
  |       +-- app.ts
  |       +-- server.ts
  |
  +-- .env.example                   <- Template only. Never commit .env
  +-- .gitignore                     <- Must include .env
  +-- package.json                   <- Monorepo root
  +-- README.md

---

### 11.4 Environment Variables

All secrets and config must live in .env. Never hardcode any value.

  # Server
  PORT=
  NODE_ENV=

  # Database
  DATABASE_URL=

  # Google OAuth
  GOOGLE_CLIENT_ID=
  GOOGLE_CLIENT_SECRET=
  GOOGLE_CALLBACK_URL=

  # Session
  SESSION_SECRET=

  # Cloudflare R2
  R2_PUBLIC_BASE_URL=

  # App
  CLIENT_URL=

---

### 11.5 Request Flow

  [Browser]
      |
      -> GET/POST /api/*
      |
      -> [Vercel] proxies /api/* to [Railway Express server]
      |
      -> [Express Middleware Stack]
      |       1. helmet()           <- Security headers
      |       2. cors()             <- Origin whitelist
      |       3. express-session()  <- Cookie session
      |       4. passport.session() <- Auth deserialization
      |       5. express-rate-limit <- Rate limiting
      |       6. Route handler
      |
      -> [postgres.js]
      |
      -> [Neon PostgreSQL]

---

## SECTION 12: DATA MODEL AND ENTITIES

### 12.1 Schema Conventions

- All primary keys: UUID using gen_random_uuid()
- All timestamps: TIMESTAMPTZ (timezone-aware)
- All deletions: hard delete — no soft delete in v1
- All cascades: ON DELETE CASCADE from users table downward
- Parameterized queries only. No string concatenation in SQL ever.

---

### 12.2 Entity Relationship Summary

  users (1)
    |-- 1:1 ----> settings
    |-- 1:many -> tasks
    |-- 1:many -> break_activities
    |-- 1:many -> custom_prompts
    |-- 1:many -> timer_sessions
                      |-- 1:many -> reflections
                      |-- 1:many -> break_logs

  sessions table (managed by connect-pg-simple — do not modify structure)

---

### 12.3 Table: users

| Column        | Type         | Constraints                              |
|---------------|--------------|------------------------------------------|
| id            | UUID         | PK, DEFAULT gen_random_uuid()            |
| google_id     | VARCHAR(255) | NOT NULL, UNIQUE                         |
| email         | VARCHAR(255) | NOT NULL, UNIQUE                         |
| display_name  | VARCHAR(255) | NOT NULL                                 |
| avatar_url    | TEXT         | NULLABLE                                 |
| role          | VARCHAR(20)  | NOT NULL, DEFAULT 'user'                 |
|               |              | CHECK (role IN ('user', 'admin'))         |
| created_at    | TIMESTAMPTZ  | NOT NULL, DEFAULT NOW()                  |
| last_login_at | TIMESTAMPTZ  | NULLABLE                                 |

Indexes: UNIQUE(google_id), UNIQUE(email)

Business rules:
- role = 'admin' is set directly in DB only. No API endpoint may promote users.
- On first Google OAuth login: INSERT new row.
- On subsequent logins: UPDATE last_login_at only.

---

### 12.4 Table: settings

One row per user. Created on account creation with all defaults.
[CORRECTION D-01: one-to-one relationship with users, not one-to-many]

| Column                | Type         | Constraints / Default              |
|-----------------------|--------------|------------------------------------|
| id                    | UUID         | PK, DEFAULT gen_random_uuid()      |
| user_id               | UUID         | NOT NULL, UNIQUE                   |
|                       |              | FK -> users.id ON DELETE CASCADE   |
| work_duration         | INTEGER      | NOT NULL, DEFAULT 25               |
| short_break_duration  | INTEGER      | NOT NULL, DEFAULT 5                |
| long_break_duration   | INTEGER      | NOT NULL, DEFAULT 20               |
| long_break_frequency  | INTEGER      | NOT NULL, DEFAULT 4, CHECK >= 0    |
| auto_start_breaks     | BOOLEAN      | NOT NULL, DEFAULT false            |
| auto_start_pomodoros  | BOOLEAN      | NOT NULL, DEFAULT false            |
| freestyle_ratio       | NUMERIC(5,2) | NOT NULL, DEFAULT 5.00             |
| freestyle_accumulate  | BOOLEAN      | NOT NULL, DEFAULT true             |
| alarm_sound           | VARCHAR(50)  | NOT NULL, DEFAULT 'bell'           |
| alarm_volume          | INTEGER      | NOT NULL, DEFAULT 80, CHECK (0-100)|
| alarm_repeats         | INTEGER      | NOT NULL, DEFAULT 1, CHECK (1-5)   |
| alarm_custom_url      | TEXT         | NULLABLE                           |
| browser_notifications | BOOLEAN      | NOT NULL, DEFAULT false            |
| reflection_enabled    | BOOLEAN      | NOT NULL, DEFAULT true             |
| music_autoplay        | BOOLEAN      | NOT NULL, DEFAULT false            |
| music_volume          | INTEGER      | NOT NULL, DEFAULT 50, CHECK (0-100)|
| last_sound_selected   | VARCHAR(10)  | NOT NULL, DEFAULT 'S1'             |
| break_activity_limit  | INTEGER      | NOT NULL, DEFAULT 10, CHECK (1-30) |
| theme                 | VARCHAR(50)  | NOT NULL, DEFAULT 'bw-dark'        |
| font                  | VARCHAR(50)  | NOT NULL, DEFAULT 'Inter'          |
| hour_format           | VARCHAR(5)   | NOT NULL, DEFAULT '12h'            |
| updated_at            | TIMESTAMPTZ  | NOT NULL, DEFAULT NOW()            |

Indexes: UNIQUE(user_id)

Business rules:
- Exactly one row per user. Created at account registration.
- long_break_frequency = 0 means long breaks are disabled entirely.
- alarm_custom_url is loaded client-side only via <audio> element.
  Server must never fetch or process this URL.

---

### 12.5 Table: tasks

| Column        | Type        | Constraints                             |
|---------------|-------------|-----------------------------------------|
| id            | UUID        | PK, DEFAULT gen_random_uuid()           |
| user_id       | UUID        | NOT NULL, FK -> users.id                |
|               |             | ON DELETE CASCADE                       |
| name          | VARCHAR(64) | NOT NULL                                |
| time_estimate | INTEGER     | NOT NULL, CHECK (1-1440)                |
| is_complete   | BOOLEAN     | NOT NULL, DEFAULT false                 |
| sort_order    | INTEGER     | NOT NULL, DEFAULT 0                     |
| created_at    | TIMESTAMPTZ | NOT NULL, DEFAULT NOW()                 |
| updated_at    | TIMESTAMPTZ | NOT NULL, DEFAULT NOW()                 |

Indexes: INDEX(user_id), INDEX(user_id, sort_order)

Business rules:
- Maximum 20 tasks per user. Enforced server-side before every INSERT.
- sort_order is updated on drag-and-drop reorder.
- [HOOK] Auto-complete by elapsed periods is not implemented in v1.
  The sort_order and is_complete columns support it when added in v2.

---

### 12.6 Table: break_activities

| Column        | Type        | Constraints                             |
|---------------|-------------|-----------------------------------------|
| id            | UUID        | PK, DEFAULT gen_random_uuid()           |
| user_id       | UUID        | NOT NULL, FK -> users.id                |
|               |             | ON DELETE CASCADE                       |
| name          | VARCHAR(64) | NOT NULL                                |
| time_estimate | INTEGER     | NOT NULL, CHECK (1-1440)                |
| sort_order    | INTEGER     | NOT NULL, DEFAULT 0                     |
| created_at    | TIMESTAMPTZ | NOT NULL, DEFAULT NOW()                 |

Indexes: INDEX(user_id)

Business rules:
- Maximum per user is enforced by settings.break_activity_limit (1-30).
- Enforced server-side before every INSERT.

---

### 12.7 Table: timer_sessions

| Column           | Type        | Constraints                           |
|------------------|-------------|---------------------------------------|
| id               | UUID        | PK, DEFAULT gen_random_uuid()         |
| user_id          | UUID        | NOT NULL, FK -> users.id              |
|                  |             | ON DELETE CASCADE                     |
| mode             | VARCHAR(20) | NOT NULL                              |
|                  |             | CHECK IN ('timer','pomodoro',         |
|                  |             | 'freestyle')                          |
| started_at       | TIMESTAMPTZ | NOT NULL, DEFAULT NOW()               |
| ended_at         | TIMESTAMPTZ | NULLABLE                              |
| ended_early      | BOOLEAN     | NOT NULL, DEFAULT false               |
| total_work_mins  | INTEGER     | NULLABLE                              |
| periods_completed| INTEGER     | NOT NULL, DEFAULT 0                   |
| is_interrupted   | BOOLEAN     | NOT NULL, DEFAULT false               |
| interrupted_at   | TIMESTAMPTZ | NULLABLE                              |

Indexes: INDEX(user_id), INDEX(user_id, started_at)

Business rules:
- Sessions with NULL ended_at older than 12 hours are auto-ended:
  is_interrupted = true, ended_at = started_at + interval '12 hours'.
- is_interrupted = true flags sessions eligible for resume prompt.
- Resume prompt is shown only if interrupted_at is within 7 days of NOW().

---

### 12.8 Table: reflections

[CORRECTION D-02: hardcoded answer columns removed. Replaced with
answers JSONB column. focus_rating retained as explicit column only.]

| Column         | Type        | Constraints                             |
|----------------|-------------|-----------------------------------------|
| id             | UUID        | PK, DEFAULT gen_random_uuid()           |
| user_id        | UUID        | NOT NULL, FK -> users.id                |
|                |             | ON DELETE CASCADE                       |
| session_id     | UUID        | NOT NULL, FK -> timer_sessions.id       |
|                |             | ON DELETE CASCADE                       |
| type           | VARCHAR(20) | NOT NULL                                |
|                |             | CHECK IN ('per_period', 'session')      |
| period_number  | INTEGER     | NULLABLE                                |
| focus_rating   | INTEGER     | NULLABLE, CHECK (1-4)                   |
| answers        | JSONB       | NULLABLE                                |
| tasks_snapshot | JSONB       | NULLABLE                                |
| created_at     | TIMESTAMPTZ | NOT NULL, DEFAULT NOW()                 |
| updated_at     | TIMESTAMPTZ | NOT NULL, DEFAULT NOW()                 |

Indexes: INDEX(user_id), INDEX(user_id, created_at),
         INDEX(session_id), INDEX(focus_rating)

answers JSONB structure:
  Keys map directly to prompt_key values in custom_prompts table.
  Skipped questions are omitted from the map entirely — no null keys.

  Per-period example:
  {
    "did_well":           "Stayed focused for full period",
    "do_better":          "Take notes while reading",
    "hindrance_options":  ["Distractions", "Environment"],
    "hindrance_detail":   "Phone notifications kept appearing",
    "task_structure_note":"Break tasks into smaller chunks"
  }

  Session-level example:
  {
    "accomplishment":  "Finished chapter 3 and outline",
    "obstacle":        "Kept checking phone",
    "do_differently":  "Put phone in another room next time"
  }

tasks_snapshot structure:
  Array of {task_id, name, is_complete} captured at reflection time.
  Preserves task history even if tasks are later deleted by the user.
  Example: [{"task_id": "uuid", "name": "Read chapter 3", "is_complete": true}]

Business rules:
- focus_rating stored as both an explicit column AND inside answers
  for query performance on Reports tab.
- answers keys must match known prompt_keys. Unknown keys are rejected
  server-side.
- answers JSONB must not exceed 10KB total per row.
- Each string value in answers must not exceed its configured character
  limit (500 chars per text field, enforced server-side).
- type = 'per_period': period_number is set. Session-level keys omitted.
- type = 'session': period_number is NULL. Per-period keys omitted.
- If user skips entire reflection: no row is created.
- If user submits with some questions skipped: row is created, skipped
  keys are absent from answers JSONB.

Sample query — retrieve 'do_better' for a specific user:
  SELECT
    r.id,
    r.created_at,
    r.type,
    r.period_number,
    r.answers->>'do_better' AS do_better
  FROM reflections r
  WHERE r.user_id = $1
    AND r.answers ? 'do_better'
  ORDER BY r.created_at DESC;

---

### 12.9 Table: break_logs

| Column           | Type        | Constraints                           |
|------------------|-------------|---------------------------------------|
| id               | UUID        | PK, DEFAULT gen_random_uuid()         |
| user_id          | UUID        | NOT NULL, FK -> users.id              |
|                  |             | ON DELETE CASCADE                     |
| session_id       | UUID        | NOT NULL, FK -> timer_sessions.id     |
|                  |             | ON DELETE CASCADE                     |
| activity_id      | UUID        | NULLABLE, FK -> break_activities.id   |
|                  |             | ON DELETE SET NULL                    |
| activity_name    | VARCHAR(64) | NULLABLE                              |
| break_started_at | TIMESTAMPTZ | NOT NULL                              |
| break_ended_at   | TIMESTAMPTZ | NULLABLE                              |

Indexes: INDEX(user_id), INDEX(user_id, break_started_at)

Business rules:
- activity_name is stored at log time (denormalized) so the log entry
  survives if the break activity is later deleted by the user.
- activity_id is SET NULL on break_activities delete. activity_name
  is preserved regardless.
- Rows where user dismissed popup without selecting:
  activity_id = NULL, activity_name = NULL.

---

### 12.10 Table: custom_prompts

| Column      | Type          | Constraints                           |
|-------------|---------------|---------------------------------------|
| id          | UUID          | PK, DEFAULT gen_random_uuid()         |
| user_id     | UUID          | NOT NULL, FK -> users.id              |
|             |               | ON DELETE CASCADE                     |
| prompt_key  | VARCHAR(100)  | NOT NULL                              |
| prompt_text | VARCHAR(1280) | NOT NULL                              |
| updated_at  | TIMESTAMPTZ   | NOT NULL, DEFAULT NOW()               |

Indexes: UNIQUE(user_id, prompt_key)

Business rules:
- prompt_key matches keys defined in reflection-prompts.config.ts.
- On account creation: all default prompts are seeded from config file
  into this table for the new user.
- On reset: all rows for user are overwritten with config file values.
- Config file is NEVER modified at runtime.

Default prompt keys (must match reflection-prompts.config.ts exactly):

  Per-period prompts:
  - "did_well"
  - "do_better"
  - "hindrance_options"
  - "hindrance_detail"
  - "task_structure_note"

  Session-level prompts:
  - "accomplishment"
  - "obstacle"
  - "do_differently"

---

### 12.11 API Endpoint Reference

All endpoints prefixed with /api. All responses are JSON.
All authenticated endpoints return 401 if session missing or expired.
All inputs validated server-side regardless of client-side validation.

#### Auth Endpoints

| Method | Path                       | Auth | Description                    |
|--------|----------------------------|------|--------------------------------|
| GET    | /api/auth/google           | No   | Initiate Google OAuth flow     |
| GET    | /api/auth/google/callback  | No   | OAuth callback handler         |
| POST   | /api/auth/logout           | Yes  | Destroy session, clear cookie  |
| GET    | /api/auth/me               | Yes  | Return current user profile    |

#### User Endpoints

| Method | Path                       | Auth | Description                    |
|--------|----------------------------|------|--------------------------------|
| DELETE | /api/user                  | Yes  | Delete account + all data      |

#### Settings Endpoints

| Method | Path                       | Auth | Description                    |
|--------|----------------------------|------|--------------------------------|
| GET    | /api/settings              | Yes  | Get user settings              |
| PATCH  | /api/settings              | Yes  | Update one or more settings    |

#### Tasks Endpoints

| Method | Path                       | Auth | Description                    |
|--------|----------------------------|------|--------------------------------|
| GET    | /api/tasks                 | Yes  | Get all tasks for user         |
| POST   | /api/tasks                 | Yes  | Create new task                |
| PATCH  | /api/tasks/:id             | Yes  | Update task (name, estimate,   |
|        |                            |      | is_complete)                   |
| PATCH  | /api/tasks/reorder         | Yes  | Update sort_order for all tasks|
| DELETE | /api/tasks/:id             | Yes  | Delete task                    |

#### Break Activity Endpoints

| Method | Path                       | Auth | Description                    |
|--------|----------------------------|------|--------------------------------|
| GET    | /api/break-activities      | Yes  | Get all break activities       |
| POST   | /api/break-activities      | Yes  | Create new break activity      |
| PATCH  | /api/break-activities/:id  | Yes  | Update break activity          |
| DELETE | /api/break-activities/:id  | Yes  | Delete break activity          |

#### Timer Session Endpoints

| Method | Path                       | Auth | Description                    |
|--------|----------------------------|------|--------------------------------|
| POST   | /api/sessions              | Yes  | Start new timer session        |
| PATCH  | /api/sessions/:id          | Yes  | Update session (end, interrupt)|
| GET    | /api/sessions/interrupted  | Yes  | Get most recent interrupted    |
|        |                            |      | session within 7 days          |

#### Reflection Endpoints

| Method | Path                       | Auth | Description                    |
|--------|----------------------------|------|--------------------------------|
| POST   | /api/reflections           | Yes  | Save reflection entry          |
| GET    | /api/reflections           | Yes  | Get reflections (filterable)   |
| PATCH  | /api/reflections/:id       | Yes  | Edit past reflection           |

Query params for GET /api/reflections:
  - type: 'per_period' or 'session'
  - from: ISO date string (start range)
  - to: ISO date string (end range)
  - focus_rating: integer 1-4
  - task_name: string (searches tasks_snapshot)

#### Break Log Endpoints

| Method | Path                       | Auth | Description                    |
|--------|----------------------------|------|--------------------------------|
| POST   | /api/break-logs            | Yes  | Log a break activity           |
| PATCH  | /api/break-logs/:id        | Yes  | Update break end time          |
| GET    | /api/break-logs            | Yes  | Get break logs by date range   |

#### Custom Prompt Endpoints

| Method | Path                       | Auth | Description                    |
|--------|----------------------------|------|--------------------------------|
| GET    | /api/prompts               | Yes  | Get all custom prompts         |
| PATCH  | /api/prompts               | Yes  | Update one or more prompts     |
| POST   | /api/prompts/reset         | Yes  | Reset all prompts to defaults  |

#### Reports Endpoints

| Method | Path                       | Auth | Description                    |
|--------|----------------------------|------|--------------------------------|
| GET    | /api/reports/streak        | Yes  | Get current streak count       |
| GET    | /api/reports/focus         | Yes  | Get avg focus rating by range  |
| GET    | /api/reports/time          | Yes  | Get total focused time by range|

Query params for reports endpoints:
  - view: 'daily' or 'weekly'
  - from: ISO date string
  - to: ISO date string

#### Admin Endpoints

| Method | Path                            | Auth        | Description              |
|--------|---------------------------------|-------------|--------------------------|
| POST   | /internal/admin/clear-user      | Admin only  | Clear all data for user  |

Rules:
- /internal/admin/* must verify role === 'admin' server-side on every
  request. Client-side role checks are never sufficient.
- Admin endpoints are rate-limited independently from public endpoints.
- Admin actions are logged server-side with timestamp, admin user ID,
  and target user identifier.

---

## BATCH D — COMPLETION CHECKLIST

### Confirmed in This Batch
- [x] Full confirmed tech stack and approved library list
- [x] Repository folder structure
- [x] Environment variable template
- [x] Request flow diagram
- [x] All 9 database tables with columns, types, constraints, indexes,
      and business rules
- [x] Entity relationship summary
- [x] Full API endpoint reference (all routes, methods, auth, descriptions)
- [x] CORRECTION D-01 applied: settings.user_id is one-to-one
- [x] CORRECTION D-02 applied: reflections hardcoded columns replaced
      with answers JSONB + prompt_key system

### Open Questions Carried Forward
- [OPEN] Charting library not confirmed. Recommended: Recharts.
         Owner must approve before implementation of F-28 begins.

### Deliberately Deferred to Later Batches
- [ ] Security rules and banned patterns -> Batch E
- [ ] Rate limiting specifics -> Batch E
- [ ] Performance requirements -> Batch E
- [ ] Edge cases and failure states -> Batch F
- [ ] Testing checklist -> Batch F
- [ ] Deployment instructions -> Batch F
- [ ] Phased implementation roadmap -> Batch F

---

END OF BATCH D