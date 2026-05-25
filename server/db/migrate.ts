// Migration runner.
//
// EXCEPTION: This file uses sql.unsafe() to execute multi-statement .sql
// migration files (postgres.js tagged templates only run one statement per
// call). This is the ONE place in the codebase where sql.unsafe is allowed.
// Migration files are static, author-controlled, and never contain user
// input. Approved per Phase 0 ambiguity resolution A2.
//
// NEVER use sql.unsafe() in application code. All app queries MUST use
// postgres.js tagged templates.

import fs from 'node:fs/promises';
import path from 'node:path';
import postgres from 'postgres';
import { loadConfig } from '../utils/env';
import { initDb, closeDb } from './db';
import { log } from '../utils/logger';
import 'dotenv/config';

const MIGRATIONS_FILE_RE = /^\d{3}_[a-z0-9_]+\.sql$/;

async function ensureMigrationsTable(sql: postgres.Sql): Promise<void> {
  await sql`
    CREATE TABLE IF NOT EXISTS _migrations (
      filename   VARCHAR(255) PRIMARY KEY,
      applied_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
    )
  `;
}

async function appliedFilenames(sql: postgres.Sql): Promise<Set<string>> {
  const rows = await sql<{ filename: string }[]>`SELECT filename FROM _migrations`;
  return new Set(rows.map((r) => r.filename));
}

async function listMigrationFiles(dir: string): Promise<string[]> {
  const entries = await fs.readdir(dir);
  return entries
    .filter((f) => MIGRATIONS_FILE_RE.test(f))
    .sort((a, b) => a.localeCompare(b));
}

export async function runMigrations(sql: postgres.Sql, migrationsDir: string): Promise<void> {
  await ensureMigrationsTable(sql);
  const already = await appliedFilenames(sql);
  const files = await listMigrationFiles(migrationsDir);

  for (const file of files) {
    if (already.has(file)) continue;
    const fullPath = path.join(migrationsDir, file);
    const sqlText = await fs.readFile(fullPath, 'utf8');

    await sql.begin(async (tx) => {
      // EXCEPTION: see file header. Migration files are static; no user input.
      await tx.unsafe(sqlText);
      await tx`INSERT INTO _migrations (filename) VALUES (${file})`;
    });

    log({ level: 'info', event: 'migration_applied', filename: file });
  }
}

// Entrypoint when invoked via `ts-node db/migrate.ts`
async function main() {
  const config = loadConfig(process.env);
  const sql = initDb(config);
  try {
    const migrationsDir = path.resolve(__dirname, 'migrations');
    await runMigrations(sql, migrationsDir);
    log({ level: 'info', event: 'migrations_complete' });
  } finally {
    await closeDb();
  }
}

if (require.main === module) {
  main().catch((err) => {
    log({ level: 'error', event: 'migration_failed', message: String(err) });
    process.exit(1);
  });
}
