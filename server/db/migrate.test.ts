import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import postgres from 'postgres';
import path from 'node:path';
import fs from 'node:fs/promises';
import { runMigrations } from './migrate';
import { dropAllTables } from './testHelpers';

const TEST_DB_URL = process.env.TEST_DATABASE_URL;
const SKIP = !TEST_DB_URL;
const MIGRATIONS_DIR = path.resolve(__dirname, 'migrations');
const MIGRATIONS_FILE_RE = /^\d{3}_[a-z0-9_]+\.sql$/;

describe.skipIf(SKIP)('runMigrations', () => {
  let sql: postgres.Sql;

  beforeAll(() => {
    sql = postgres(TEST_DB_URL!, { prepare: false });
  });

  afterAll(async () => {
    await sql.end({ timeout: 5 });
  });

  beforeEach(async () => {
    // Each test wants a from-scratch DB. dropAllTables enumerates pg_tables
    // and drops everything — survives any future migration without needing
    // to be kept in sync. See db/testHelpers.ts.
    await dropAllTables(sql);
  });

  it('applies 001 and 002 from empty DB', async () => {
    await runMigrations(sql, MIGRATIONS_DIR);
    const tables = await sql`
      SELECT tablename FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY tablename
    `;
    const names = tables.map((r) => r.tablename);
    expect(names).toContain('users');
    expect(names).toContain('session');
    expect(names).toContain('_migrations');
  });

  it('is idempotent — second run is a no-op', async () => {
    await runMigrations(sql, MIGRATIONS_DIR);
    const before = await sql`SELECT COUNT(*)::int as n FROM _migrations`;
    await runMigrations(sql, MIGRATIONS_DIR);
    const after = await sql`SELECT COUNT(*)::int as n FROM _migrations`;
    expect(after[0]?.n).toBe(before[0]?.n);
  });

  it('records each applied migration in _migrations, matching the on-disk file set', async () => {
    await runMigrations(sql, MIGRATIONS_DIR);
    const rows = await sql<{ filename: string }[]>`SELECT filename FROM _migrations ORDER BY filename`;
    const applied = rows.map((r) => r.filename);

    // Compare against the actual on-disk migrations directory so the test
    // doesn't go stale every time a phase adds a new migration.
    const diskFiles = (await fs.readdir(MIGRATIONS_DIR))
      .filter((f) => MIGRATIONS_FILE_RE.test(f))
      .sort((a, b) => a.localeCompare(b));

    expect(applied).toEqual(diskFiles);
  });
});
