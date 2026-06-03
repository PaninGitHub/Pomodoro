# Running Simplidoro locally

End-to-end setup for cloning the repo and running both the React client
and the Node server on your own machine. Includes Google login working
against `localhost`.

The convention this repo uses for dev is "frontend + backend both running,
both connected to your dev Postgres" — typically a Neon branch you create
specifically for development. There's no Postgres container in dev; you
point at whatever DB you want via `DATABASE_URL`.

---

## 1. Prerequisites

| Tool | Version | Install |
|---|---|---|
| Node.js | **20.x or newer** (enforced by `package.json` `engines.node >= 20`) | https://nodejs.org/ — pick the LTS installer, or use `nvm` / `fnm` |
| npm | bundled with Node 20 | — |
| Git | any recent | https://git-scm.com/ |
| Postgres connection | a Neon free-tier branch (recommended) or local Postgres ≥ 14 | https://console.neon.tech/ |
| Google Cloud account | free | https://console.cloud.google.com/ |

Verify Node:

```sh
node --version    # should print v20.x.x or higher
npm --version
```

---

## 2. Clone and install

```sh
git clone https://github.com/PaninGitHub/Pomodoro.git simplidoro
cd simplidoro

# Installs both client and server workspaces in one shot.
npm ci
```

`npm ci` is preferred over `npm install` here — it respects
`package-lock.json` exactly and is faster on a clean clone.

---

## 3. Create a Postgres database

**Recommended: Neon (free).**

1. Sign in at https://console.neon.tech/ and create a project (or pick an
   existing one).
2. Optionally create a dedicated branch for dev (e.g. `dev`) so your
   experiments don't touch prod data. Click **Branches → New branch**.
3. Open the branch → **Connection Details** → copy the connection string.
   It looks like:

   ```
   postgres://USER:PASSWORD@ep-xxxx-12345.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```

Save it; you'll paste it into `.env` in the next step.

**Alternative: local Postgres.** Spin up via Docker:

```sh
docker run -d --name simplidoro-pg \
  -e POSTGRES_PASSWORD=devpass \
  -e POSTGRES_USER=simplidoro \
  -e POSTGRES_DB=simplidoro_dev \
  -p 5432:5432 \
  postgres:16
```

Connection string:
`postgres://simplidoro:devpass@localhost:5432/simplidoro_dev`

---

## 4. Create a Google OAuth client for local dev

The app uses Google "Sign in with Google" — you need an OAuth 2.0 client
registered to your Google account.

1. Go to https://console.cloud.google.com/apis/credentials.
2. Pick (or create) a project.
3. **OAuth consent screen** → User Type: **External** → fill required
   fields (app name, support email, dev contact). Add the scopes
   `userinfo.email` and `userinfo.profile`. Save.
4. **Credentials → Create Credentials → OAuth client ID**:
   - Application type: **Web application**
   - Name: e.g. `simplidoro local`
   - **Authorized JavaScript origins:** `http://localhost:5173`
   - **Authorized redirect URIs:** `http://localhost:5173/api/auth/google/callback`
5. Click **Create**. Copy the **Client ID** and **Client secret**.
6. On the **OAuth consent screen** → **Test users**: add your gmail address
   (and any teammates') so you can sign in while the app is in Testing mode.

---

## 5. Set environment variables

Create `.env` at the repo root (NOT inside `server/`):

```sh
cp .env.example .env
```

Then edit `.env`. Every variable below is required (the server validates
at boot and exits if any are missing — see `server/utils/env.ts`):

```bash
# Application
PORT=3001
NODE_ENV=development

# Database — paste from Neon Console (step 3)
DATABASE_URL=postgres://USER:PASSWORD@ep-xxxx.us-east-2.aws.neon.tech/neondb?sslmode=require

# Google OAuth — from step 4
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-your-client-secret

# Public URL — for local dev, the Vite proxy + same-port callback
GOOGLE_CALLBACK_URL=http://localhost:5173/api/auth/google/callback
CLIENT_URL=http://localhost:5173

# Session — any random string is fine in dev; must be 32+ chars in prod
SESSION_SECRET=any-random-string-for-local-dev-doesnt-matter

# Required env var; not exercised by current features
R2_PUBLIC_BASE_URL=https://example.invalid
```

The server reads `.env` at the **repo root** (not `server/.env`) — see
`server/server.ts:5`.

---

## 6. Run migrations

```sh
npm run migrate
```

This applies every SQL file in `server/db/migrations/` against the
`DATABASE_URL` you set. Idempotent — re-running is safe.

Expected output ends with:

```
{"event":"migration_applied","filename":"019_add_custom_themes.sql"}
{"event":"migrations_complete"}
```

Verify the schema is good with one quick query (any client works — `psql`,
DBeaver, Neon's web SQL editor):

```sql
SELECT count(*) FROM information_schema.tables WHERE table_schema='public';
-- expect 10
```

---

## 7. Start the dev server

```sh
npm run dev
```

This launches both workspaces concurrently:

- **Server:** `http://localhost:3001` (Express + ts-node). Hot-reload is
  NOT enabled — restart manually after server edits.
- **Client:** `http://localhost:5173` (Vite). Hot-reload IS enabled.

Vite proxies `/api/*` requests to the server, so the browser only ever
talks to `localhost:5173`. That's why both the JS origin and redirect URI
in the OAuth client use port `5173`.

Open http://localhost:5173/ and click **Sign in with Google** in the
header. If everything's wired correctly, you'll be redirected to Google's
consent screen, then back to the app signed in.

### Server-edit restart loop (Windows quirk)

On Windows the server's npm-wrapped `ts-node` survives `Ctrl+C` on the
npm process. To kill it cleanly:

```powershell
Get-NetTCPConnection -LocalPort 3001 | Select-Object -ExpandProperty OwningProcess | ForEach-Object { Stop-Process -Id $_ -Force }
```

Then `npm -w server run dev` to restart.

---

## 8. Run the tests

```sh
npm test
```

Server tests apply migrations to a separate test branch via
`TEST_DATABASE_URL` (set this to a fresh Neon branch or local Postgres
database you don't mind being wiped). Client tests are pure JS — no DB.

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| `DB ping timed out after 2000ms` at server boot | Your Neon endpoint auto-suspended. Hit any URL on it (or just re-run `npm run dev` once or twice — the connection attempt itself wakes it up). |
| `Missing required environment variables: …` | One of the 9 vars in §5 isn't set or is empty. The error names which. |
| Google sign-in redirects then errors out with `redirect_uri_mismatch` | The redirect URI in your OAuth client doesn't EXACTLY match `GOOGLE_CALLBACK_URL` (down to trailing slash). |
| Sign-in works but you immediately get signed out on reload | `CLIENT_URL` doesn't match the actual origin (CORS rejects the session cookie). |
| `port 3001 already in use` | An older server is still running — kill it (see §7). |

---

## What's in the codebase (orientation)

| Area | Path |
|---|---|
| Server entry + bootstrap | `server/server.ts`, `server/app.ts` |
| API routes | `server/routes/*.ts` |
| DB migrations | `server/db/migrations/*.sql` |
| Client entry | `client/src/main.tsx` |
| Client routing | `client/src/router.tsx` |
| Timer state | `client/src/timer/state/timerReducer.ts` |
| Themes | `client/src/themes/`, `client/src/theme.css` |
| Settings panel | `client/src/settings/groups/` |

For the homelab deploy version of this, see `docs/DEPLOY_HOMELAB.md`.
