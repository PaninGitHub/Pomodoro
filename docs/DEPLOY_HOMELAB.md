# Deploying Simplidoro to a homelab via Docker + Tailscale Funnel

End-to-end guide for the homelab beta deploy. One Docker container (the
Node server, also serving the built React SPA). External Neon Postgres
branch for storage. Tailscale Funnel for a stable public HTTPS hostname
that Google OAuth accepts — no DNS, no port forwarding, no certs to
manage by hand.

Swap to a real domain later by changing two environment values + the
OAuth client config; the rest stays put.

---

## Architecture

```
       Internet
           │
           ▼
   ┌───────────────────────────┐
   │ Tailscale Funnel          │
   │ machine.tailnet.ts.net    │ ← TLS terminated here, automatic cert
   └─────────────┬─────────────┘
                 │ plain HTTP, loopback
                 ▼
   ┌───────────────────────────┐
   │ Homelab host              │
   │   ┌─────────────────────┐ │
   │   │ Docker container    │ │
   │   │ simplidoro-beta     │ │
   │   │ :3001 → API + SPA   │ │
   │   └──────────┬──────────┘ │
   └──────────────┼────────────┘
                  │
                  ▼
            ┌─────────────┐
            │ Neon "beta" │ ← postgres, external
            │  branch     │
            └─────────────┘
```

---

## 1. Prerequisites

On the homelab machine:

| Tool | Why | Install |
|---|---|---|
| Docker | runs the container | https://docs.docker.com/engine/install/ |
| Docker Compose v2 | orchestrates | bundled with modern Docker installs (`docker compose version`) |
| Tailscale | public hostname + TLS | https://tailscale.com/download |
| Git | clone the repo | distro package manager |

On any machine where you'll edit configs:

- A text editor and `node` 20+ (for generating SESSION_SECRET).

Cloud accounts:

- **Neon** (https://console.neon.tech/) — same project that holds prod.
- **Google Cloud** (https://console.cloud.google.com/) — same project as
  your dev OAuth client, but a separate OAuth Client ID for the beta.

---

## 2. Clone the repo on the homelab

```sh
git clone https://github.com/PaninGitHub/Pomodoro.git simplidoro
cd simplidoro
git checkout beta-testing
```

The `beta-testing` branch carries Slice A + Slice B (themes + custom
palette creator) + the beta banner. Main = stable; `beta-testing` =
what's actually live in the beta.

---

## 3. Create a Neon branch for the beta

The beta MUST run against a separate Neon branch so beta sessions can't
clobber prod data and so a destructive migration in the beta doesn't
cascade.

### Option A — Neon Console (easiest)

1. https://console.neon.tech/ → pick your project.
2. **Branches** → **Create branch**.
3. Parent branch: `main` (or whatever your prod branch is called).
4. Branch name: **`beta`**.
5. Click **Create**.
6. Open the new `beta` branch → **Connection Details** → **Pooled
   connection** → copy the connection string. Paste it into `.env.beta`
   as `DATABASE_URL` (we set that up in §6 below).

### Option B — Neon API (scripted)

1. Get a personal API token at https://console.neon.tech/app/settings/api-keys.
2. Get your project ID — it's in the Console URL when viewing the
   project, like `plain-cherry-123456`.
3. Put both in `.env.beta` (see §6) as `NEON_API_TOKEN` and
   `NEON_PROJECT_ID`.
4. Run:

   ```sh
   node scripts/create-neon-branch.js
   ```

5. The script creates a branch named `beta` and prints the endpoint
   host. Open the Console → Branches → `beta` → Connection Details to
   copy the full connection string into `.env.beta` as `DATABASE_URL`.

---

## 4. Create a NEW Google OAuth client for the beta

Don't reuse the dev OAuth client — keep beta secrets separate so
revoking access doesn't kill your local dev.

1. https://console.cloud.google.com/apis/credentials → pick the project.
2. **Create Credentials → OAuth client ID**:
   - Application type: **Web application**
   - Name: `simplidoro beta`
3. Leave **Authorized JavaScript origins** + **Authorized redirect URIs**
   blank for now — we don't know the Funnel hostname yet. We come back
   in §9 once Tailscale is set up.
4. **Create**. Note the **Client ID** + **Client secret**. Paste into
   `.env.beta` (§6) as `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.

---

## 5. Generate a session secret

```sh
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Copy the output. It's 96 hex chars (well above the 32-char prod
minimum). Paste into `.env.beta` as `SESSION_SECRET`.

If you ever feel a secret leaked, just generate a new one and `docker
compose restart app`. Every existing session is invalidated.

---

## 6. Create `.env.beta`

At the repo root:

```sh
cp .env.beta.example .env.beta
```

Then edit `.env.beta` and fill in:

| Key | From |
|---|---|
| `PORT` | leave at `3001` |
| `NODE_ENV` | leave at `production` |
| `DATABASE_URL` | §3 (Neon beta branch) |
| `GOOGLE_CLIENT_ID` | §4 |
| `GOOGLE_CLIENT_SECRET` | §4 |
| `GOOGLE_CALLBACK_URL` | leave the placeholder for now — we fill it in §9 |
| `CLIENT_URL` | leave the placeholder for now — we fill it in §9 |
| `SESSION_SECRET` | §5 |
| `R2_PUBLIC_BASE_URL` | leave at `https://example.invalid` |
| `NEON_API_TOKEN` | only if you used §3 Option B |
| `NEON_PROJECT_ID` | only if you used §3 Option B |

`.env.beta` is gitignored by the project's `.gitignore` (which excludes
all `.env*` files except `.env.example` and `.env.beta.example`).

---

## 7. Install Tailscale and enable Funnel

On the homelab machine:

```sh
curl -fsSL https://tailscale.com/install.sh | sh
sudo tailscale up
# Follow the URL it prints to authenticate.

# Enable HTTPS certs for the tailnet (one-time, free).
sudo tailscale cert --help    # just to confirm available; we don't run it directly here.
```

Get the machine's stable Funnel hostname:

```sh
tailscale status
# Look for "your-machine-name.your-tailnet.ts.net" in the output.
```

If Funnel needs to be allowed on your tailnet first, visit
https://login.tailscale.com/admin/acls and add to the ACL:

```json
{
  "nodeAttrs": [
    {
      "target": ["your-machine-name"],
      "attr":   ["funnel"]
    }
  ]
}
```

Save the hostname. From here on we refer to it as
`MACHINE.TAILNET.ts.net`.

---

## 8. Wire the hostname into `.env.beta`

Open `.env.beta` again and fill the two URL vars:

```bash
GOOGLE_CALLBACK_URL=https://MACHINE.TAILNET.ts.net/api/auth/google/callback
CLIENT_URL=https://MACHINE.TAILNET.ts.net
```

These are the only two values that change if you later swap to a real
domain — see §13.

---

## 9. Register the hostname with Google OAuth

Back at https://console.cloud.google.com/apis/credentials → the beta
client you created in §4:

| Setting | Value |
|---|---|
| Authorized JavaScript origins | `https://MACHINE.TAILNET.ts.net` |
| Authorized redirect URIs | `https://MACHINE.TAILNET.ts.net/api/auth/google/callback` |

Click **Save**.

---

## 10. Publish the OAuth consent screen to Production

You scoped this client to `userinfo.email` + `userinfo.profile` —
neither is a "sensitive" scope, so Google does NOT require their
manual review and there's no waiting period.

1. **APIs & Services → OAuth consent screen**.
2. **Publishing status → "PUBLISH APP"**.
3. Confirm in the dialog.

Once published, anyone with a Google account can sign in. If you'd
rather keep the beta closed, leave it in Testing and add specific gmail
addresses under **Test users** (cap 100).

---

## 11. Bring the stack up

From the repo root on the homelab:

```sh
docker compose up -d --build
```

First build will take a few minutes (multi-stage Node build). Watch
logs:

```sh
docker compose logs -f app
```

Expected output ends with something like:

```
{"event":"server_started","port":3001,"node_env":"production"}
```

If it dies with `db_unreachable`, your Neon `beta` endpoint is cold —
just `docker compose restart app` (the second connection attempt
usually catches the warmed endpoint).

---

## 12. Run migrations against the beta DB

Migrations run **from inside the container** so they use the same
`DATABASE_URL` your app is using:

```sh
docker compose exec app node server/dist/db/migrate.js
```

Expected output ends with:

```
{"event":"migration_applied","filename":"019_add_custom_themes.sql"}
{"event":"migrations_complete"}
```

---

## 13. Start Tailscale Funnel

```sh
sudo tailscale funnel --bg 3001
```

`--bg` runs the proxy as a background service that survives reboots.
Confirm it's serving:

```sh
sudo tailscale funnel status
# Should list https://MACHINE.TAILNET.ts.net/ → http://127.0.0.1:3001/
```

Test from another machine:

```sh
curl -fsS https://MACHINE.TAILNET.ts.net/api/health
# {"status":"ok"}
```

---

## 14. Smoke test before sharing the URL

From any machine with `curl`:

```sh
# 1. Healthcheck (must be 200)
curl -fsS https://MACHINE.TAILNET.ts.net/api/health

# 2. Sign-in endpoint should 302 redirect to accounts.google.com
curl -sI https://MACHINE.TAILNET.ts.net/api/auth/google | head -3

# 3. Authenticated endpoints should 401 unauthenticated (NOT 500)
curl -s -o /dev/null -w "%{http_code}\n" https://MACHINE.TAILNET.ts.net/api/settings
# 401
curl -s -o /dev/null -w "%{http_code}\n" https://MACHINE.TAILNET.ts.net/api/tasks
# 401
```

In a browser:

1. Open https://MACHINE.TAILNET.ts.net/
2. The yellow "Public beta" banner should be at the top.
3. Click "Sign in with Google".
4. After signing in, you should land back on the home page with your
   display name in the top-right.
5. Create a task. Refresh. Confirm it's still there (DB persistence
   working end-to-end).

If all five pass, you're live.

---

## 15. Swapping to a real domain later

Three changes:

1. **DNS:** point an `A`/`AAAA` record (or CNAME) at the homelab's
   Funnel hostname or set up a different reverse proxy in front.
2. **`.env.beta`:** update `GOOGLE_CALLBACK_URL` and `CLIENT_URL` to
   the new domain. `docker compose restart app`.
3. **Google OAuth client:** add the new domain as an Authorized
   JavaScript origin and redirect URI. You can leave the Funnel
   hostname registered too during the cutover.

Nothing else in the code or container needs to change. The whole point
of routing everything through `GOOGLE_CALLBACK_URL` + `CLIENT_URL` is
that swapping the hostname is a config-only operation.

---

## Operational notes

| Task | Command |
|---|---|
| Tail logs | `docker compose logs -f app` |
| Restart after env change | `docker compose restart app` |
| Rebuild after code change | `git pull && docker compose up -d --build` |
| Stop everything | `docker compose down` |
| Stop AND remove volumes | `docker compose down -v` (we don't use volumes, so this is harmless but always confirm) |
| Open a shell in the container | `docker compose exec app sh` |
| Re-run migrations | `docker compose exec app node server/dist/db/migrate.js` |

For known operational caveats (e.g. mid-session refresh resetting the
in-memory timer state), see the banner copy on every page of the beta.
