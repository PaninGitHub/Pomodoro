# Single-container beta deploy for Simplidoro.
#
# Stage 1 (build): install all workspace deps, build the client (vite) and
# the server (tsc). Beta banner is opt-in via VITE_BETA_BANNER build arg.
# Stage 2 (runtime): clean node:20-slim with only server runtime deps and
# the compiled artifacts. Server serves /api AND the built React SPA from
# the same origin (via CLIENT_BUILD_DIR — wired below). Migrations live
# in server/db/ and are run via `npm -w server run migrate` from the
# container (see DEPLOY_HOMELAB.md).

# ---------- Stage 1: build ----------
FROM node:20-slim AS build
WORKDIR /app

# Workspace manifests first so `npm ci` can cache the install layer
# independently of source churn.
COPY package.json package-lock.json* ./
COPY client/package.json ./client/
COPY server/package.json ./server/
RUN npm ci

# Source.
COPY tsconfig*.json ./
COPY client/ ./client/
COPY server/ ./server/

# Beta banner: passed in by docker-compose.yml build args. Unset = banner off.
ARG VITE_BETA_BANNER=
ENV VITE_BETA_BANNER=$VITE_BETA_BANNER

# Build both workspaces (client → client/dist, server → server/dist).
RUN npm run build

# ---------- Stage 2: runtime ----------
FROM node:20-slim AS runtime
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001
ENV CLIENT_BUILD_DIR=/app/client/dist

# Install ONLY server runtime deps. Client deps (React etc.) are already
# bundled into client/dist by vite; no need to ship node_modules for them.
COPY package.json package-lock.json* ./
COPY server/package.json ./server/
RUN npm ci --omit=dev -w server

# Compiled outputs + migration SQL.
COPY --from=build /app/server/dist/ ./server/dist/
COPY --from=build /app/server/db/ ./server/db/
COPY --from=build /app/client/dist/ ./client/dist/

# Migration tool needs ts-node (which is a dev dep) only if you run TS
# directly — but db/migrate.ts uses .sql files, not ts compilation, so
# the compiled migrate.js is enough. Migrations are invoked via:
#   docker compose exec app node server/dist/db/migrate.js
# See DEPLOY_HOMELAB.md.

EXPOSE 3001
CMD ["node", "server/dist/server.js"]
