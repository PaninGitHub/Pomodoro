// server/db/testGlobalSetup.ts
//
// Vitest globalSetup. Runs ONCE per test session before any test file
// loads — not per worker, not per file. Drops every table via the
// pg_tables enumeration in testHelpers.dropAllTables, then applies all
// migrations from server/db/migrations/.
//
// Replaces the per-test-file `dropAllTables + runMigrations` pattern.
// With 8+ DB-touching test files each running its own setup, the
// migration apply ran ~120 times per suite run (15 migrations x 8
// files), which on a hosted Postgres (Neon) caused sustained connection
// churn and ~6+ min suite times — and longer if the laptop slept mid-run
// and connections backed off. Sharing one migrated schema cuts that to
// ~25 round-trips total at session start.
//
// migrate.test.ts is the explicit exception — it tests the migration
// runner itself, so it does its own dropAllTables + runMigrations per
// test inside its own beforeEach. All other DB-touching test files now
// just open a postgres connection in beforeAll and TRUNCATE users
// CASCADE in beforeEach to clear user-owned rows between tests.

import postgres from 'postgres';
import path from 'node:path';
import { runMigrations } from './migrate';
import { dropAllTables } from './testHelpers';

export async function setup(): Promise<void> {
  if (!process.env.TEST_DATABASE_URL) {
    // Skipping is fine — test files all gate on TEST_DATABASE_URL via
    // describe.skipIf, so they'd be no-ops anyway.
    return;
  }
  const sql = postgres(process.env.TEST_DATABASE_URL, { prepare: false });
  try {
    await dropAllTables(sql);
    await runMigrations(sql, path.resolve(__dirname, 'migrations'));
  } finally {
    await sql.end({ timeout: 5 });
  }
}

// No teardown — leaving the schema populated between sessions is fine;
// the next session's setup() drops + re-applies cleanly.
