import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import postgres from 'postgres';
import path from 'node:path';
import { runMigrations } from '../db/migrate';
import { upsertUserFromGoogleProfile, type GoogleProfile } from './upsertUser';

const TEST_DB_URL = process.env.TEST_DATABASE_URL;
const SKIP = !TEST_DB_URL;

describe.skipIf(SKIP)('upsertUserFromGoogleProfile', () => {
  let sql: postgres.Sql;

  beforeAll(async () => {
    sql = postgres(TEST_DB_URL!, { prepare: false });
    await sql`DROP TABLE IF EXISTS _migrations CASCADE`;
    await sql`DROP TABLE IF EXISTS session CASCADE`;
    await sql`DROP TABLE IF EXISTS users CASCADE`;
    await runMigrations(sql, path.resolve(__dirname, '../db/migrations'));
  });

  afterAll(async () => {
    await sql.end({ timeout: 5 });
  });

  beforeEach(async () => {
    // Truncate users; CASCADE wipes dependent settings/tasks rows.
    await sql`TRUNCATE users CASCADE`;
  });

  const profile: GoogleProfile = {
    id: 'g-123',
    emails: [{ value: 'alice@example.com' }],
    displayName: 'Alice',
    photos: [{ value: 'https://example.com/a.png' }],
  };

  it('INSERTs a new user on first login and returns the row', async () => {
    const user = await upsertUserFromGoogleProfile(sql, profile);
    expect(user.google_id).toBe('g-123');
    expect(user.email).toBe('alice@example.com');
    expect(user.display_name).toBe('Alice');
    expect(user.avatar_url).toBe('https://example.com/a.png');
    expect(user.role).toBe('user');
    expect(user.last_login_at).toBeNull();
  });

  it('UPDATEs last_login_at only on subsequent login', async () => {
    const first = await upsertUserFromGoogleProfile(sql, profile);
    expect(first.last_login_at).toBeNull();

    const second = await upsertUserFromGoogleProfile(sql, profile);
    expect(second.id).toBe(first.id);
    expect(second.last_login_at).toBeInstanceOf(Date);
    expect(second.display_name).toBe('Alice'); // not changed
  });

  it('does NOT change display_name or email on subsequent login', async () => {
    await upsertUserFromGoogleProfile(sql, profile);
    const changed: GoogleProfile = {
      ...profile,
      displayName: 'Alice Renamed',
      emails: [{ value: 'alice-new@example.com' }],
    };
    const second = await upsertUserFromGoogleProfile(sql, changed);
    expect(second.display_name).toBe('Alice');
    expect(second.email).toBe('alice@example.com');
  });

  it('handles missing avatar gracefully', async () => {
    const noPhoto: GoogleProfile = { ...profile, photos: [] };
    const user = await upsertUserFromGoogleProfile(sql, noPhoto);
    expect(user.avatar_url).toBeNull();
  });

  it('throws if profile has no email', async () => {
    const noEmail: GoogleProfile = { ...profile, emails: [] };
    await expect(upsertUserFromGoogleProfile(sql, noEmail)).rejects.toThrow(/email/i);
  });

  it('first login also creates a default settings row in the same transaction', async () => {
    const fresh: GoogleProfile = {
      id: 'g-newuser-001',
      emails: [{ value: 'fresh@x.com' }],
      displayName: 'Fresh',
      photos: [],
    };
    const user = await upsertUserFromGoogleProfile(sql, fresh);
    const rows = await sql<{ work_duration: number }[]>`
      SELECT work_duration FROM settings WHERE user_id = ${user.id}
    `;
    expect(rows.length).toBe(1);
    expect(rows[0]?.work_duration).toBe(25); // default per migration 007
  });

  it('subsequent login does NOT duplicate the settings row', async () => {
    const twice: GoogleProfile = {
      id: 'g-twice-001',
      emails: [{ value: 'twice@x.com' }],
      displayName: 'Twice',
      photos: [],
    };
    await upsertUserFromGoogleProfile(sql, twice);
    await upsertUserFromGoogleProfile(sql, twice);
    const rows = await sql<{ n: number }[]>`
      SELECT COUNT(*)::int AS n FROM settings
      WHERE user_id IN (SELECT id FROM users WHERE google_id = ${twice.id})
    `;
    expect(rows[0]?.n).toBe(1);
  });
});
