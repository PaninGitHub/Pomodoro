import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import postgres from 'postgres';
import { runMigrations } from './migrate';

const TEST_DB_URL = process.env.TEST_DATABASE_URL;
const SKIP = !TEST_DB_URL;

describe.skipIf(SKIP)('runMigrations', () => {
  let sql: postgres.Sql;

  beforeAll(() => {
    sql = postgres(TEST_DB_URL!, { prepare: false });
  });

  afterAll(async () => {
    await sql.end({ timeout: 5 });
  });

  beforeEach(async () => {
    // Wipe DB clean
    await sql`DROP TABLE IF EXISTS _migrations CASCADE`;
    await sql`DROP TABLE IF EXISTS session CASCADE`;
    await sql`DROP TABLE IF EXISTS users CASCADE`;
  });

  it('applies 001 and 002 from empty DB', async () => {
    await runMigrations(sql, 'db/migrations');
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
    await runMigrations(sql, 'db/migrations');
    const before = await sql`SELECT COUNT(*)::int as n FROM _migrations`;
    await runMigrations(sql, 'db/migrations');
    const after = await sql`SELECT COUNT(*)::int as n FROM _migrations`;
    expect(after[0]?.n).toBe(before[0]?.n);
  });

  it('records each applied migration in _migrations', async () => {
    await runMigrations(sql, 'db/migrations');
    const rows = await sql`SELECT filename FROM _migrations ORDER BY filename`;
    const files = rows.map((r) => r.filename);
    expect(files).toEqual(['001_create_users.sql', '002_create_sessions.sql']);
  });
});
