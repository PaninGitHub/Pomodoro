// server/db/testHelpers.ts
// Shared helpers for DB-touching test suites. Not imported by app code.

import type postgres from 'postgres';

/**
 * Drops every table in the public schema. Used by test setup to start from
 * a clean slate before running migrations.
 *
 * Implemented as a per-table loop (rather than `DROP SCHEMA public CASCADE;
 * CREATE SCHEMA public;`) for two reasons:
 *   1. Avoids schema-ownership issues on hosted Postgres (Neon, RDS, etc.)
 *      where the application role may not own the public schema.
 *   2. Preserves the `pgcrypto` extension that migration 001 installs;
 *      DROP SCHEMA would drop the extension and migration 001's
 *      `CREATE EXTENSION IF NOT EXISTS pgcrypto` would re-create it, which
 *      works but adds avoidable round-trips per test file.
 *
 * The replacement of the per-test-file partial-drop pattern (which only
 * dropped 5-9 explicit tables and missed any tables added by later
 * phases) is what surfaced the migration 004 -> 009 FK ordering bug — the
 * partial drop left timer_sessions intact across runs and masked the
 * fresh-DB failure. See migrations/MIGRATIONS.md "FK ordering" note.
 */
export async function dropAllTables(sql: postgres.Sql): Promise<void> {
  const tables = await sql<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  `;
  for (const { tablename } of tables) {
    // sql(identifier) renders a safely-quoted SQL identifier. The source
    // is pg_tables (system catalog), not user input, but the escape is
    // correct hygiene.
    await sql`DROP TABLE IF EXISTS ${sql(tablename)} CASCADE`;
  }
}
