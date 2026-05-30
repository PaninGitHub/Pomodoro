import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import postgres from 'postgres';
import path from 'node:path';
import express from 'express';
import request from 'supertest';
import { runMigrations } from '../db/migrate';
import { buildSettingsRouter } from './settings';

const TEST_DB_URL = process.env.TEST_DATABASE_URL;
const SKIP = !TEST_DB_URL;

function withFakeAuth(userId: string) {
  return (req: express.Request, _res: express.Response, next: express.NextFunction) => {
    (req as express.Request & { user: { id: string } }).user = { id: userId };
    next();
  };
}

function buildApp(sql: postgres.Sql, userId: string): express.Express {
  const app = express();
  app.use(express.json());
  app.use(withFakeAuth(userId));
  app.use('/api/settings', buildSettingsRouter(sql));
  return app;
}

describe.skipIf(SKIP)('Settings endpoints', () => {
  let sql: postgres.Sql;
  let userId: string;

  beforeAll(async () => {
    sql = postgres(TEST_DB_URL!, { prepare: false });
    await sql`DROP TABLE IF EXISTS tasks CASCADE`;
    await sql`DROP TABLE IF EXISTS settings CASCADE`;
    await sql`DROP TABLE IF EXISTS _migrations CASCADE`;
    await sql`DROP TABLE IF EXISTS session CASCADE`;
    await sql`DROP TABLE IF EXISTS users CASCADE`;
    await runMigrations(sql, path.resolve(__dirname, '../db/migrations'));
  });

  afterAll(async () => {
    await sql.end({ timeout: 5 });
  });

  beforeEach(async () => {
    await sql`TRUNCATE users CASCADE`;
    const [u] = await sql<{ id: string }[]>`
      INSERT INTO users (google_id, email, display_name)
      VALUES ('g-s', 's@x.com', 'Sam') RETURNING id
    `;
    userId = u!.id;
    await sql`INSERT INTO settings (user_id) VALUES (${userId})`;
  });

  describe('GET /api/settings', () => {
    it('returns defaults for a freshly seeded user', async () => {
      const app = buildApp(sql, userId);
      const res = await request(app).get('/api/settings');
      expect(res.status).toBe(200);
      expect(res.body.settings.work_duration).toBe(25);
      expect(res.body.settings.theme).toBe('bw-dark');
      expect(res.body.settings.font).toBe('Inter');
      expect(res.body.settings.alarm_volume).toBe(80);
    });

    it('lazy-creates a settings row if one is somehow missing', async () => {
      await sql`DELETE FROM settings WHERE user_id = ${userId}`;
      const app = buildApp(sql, userId);
      const res = await request(app).get('/api/settings');
      expect(res.status).toBe(200);
      expect(res.body.settings.work_duration).toBe(25);
      const [count] = await sql<{ n: number }[]>`SELECT COUNT(*)::int AS n FROM settings WHERE user_id = ${userId}`;
      expect(count?.n).toBe(1);
    });
  });

  describe('PATCH /api/settings', () => {
    it('applies a partial update and returns the full row', async () => {
      const app = buildApp(sql, userId);
      const res = await request(app).patch('/api/settings').send({ work_duration: 45, theme: 'bw-dark' });
      expect(res.status).toBe(200);
      expect(res.body.settings.work_duration).toBe(45);
      expect(res.body.settings.theme).toBe('bw-dark');
      expect(res.body.settings.short_break_duration).toBe(5); // unchanged
    });

    it('rejects invalid field with 400', async () => {
      const app = buildApp(sql, userId);
      const res = await request(app).patch('/api/settings').send({ alarm_volume: 200 });
      expect(res.status).toBe(400);
      expect(res.body.error).toBeTruthy();
    });

    it('strips unknown fields silently and persists known ones', async () => {
      const app = buildApp(sql, userId);
      const res = await request(app).patch('/api/settings').send({ work_duration: 30, hacker_field: 'evil' });
      expect(res.status).toBe(200);
      expect(res.body.settings.work_duration).toBe(30);
    });

    it('400 when only unknown fields are provided (no valid update)', async () => {
      const app = buildApp(sql, userId);
      const res = await request(app).patch('/api/settings').send({ hacker_field: 'evil' });
      expect(res.status).toBe(400);
    });

    it('accepts null for alarm_custom_url (clears it)', async () => {
      await sql`UPDATE settings SET alarm_custom_url = 'https://x.com/bell.mp3' WHERE user_id = ${userId}`;
      const app = buildApp(sql, userId);
      const res = await request(app).patch('/api/settings').send({ alarm_custom_url: null });
      expect(res.status).toBe(200);
      expect(res.body.settings.alarm_custom_url).toBeNull();
    });
  });
});
