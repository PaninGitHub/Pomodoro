import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import postgres from 'postgres';
import path from 'node:path';
import express from 'express';
import request from 'supertest';
import { runMigrations } from '../db/migrate';
import { buildUserRouter } from './user';

const TEST_DB_URL = process.env.TEST_DATABASE_URL;
const SKIP = !TEST_DB_URL;

// Fake session middleware: provides req.session.destroy with a controllable callback
// outcome so we can exercise the warn-on-failure path.
function withFakeAuthAndSession(userId: string | null, destroyFails = false) {
  return (req: express.Request, _res: express.Response, next: express.NextFunction) => {
    if (userId) {
      (req as express.Request & { user: { id: string } }).user = { id: userId };
    }
    (req as express.Request & { session: { destroy: (cb: (err?: Error) => void) => void } }).session = {
      destroy: (cb: (err?: Error) => void) => {
        if (destroyFails) cb(new Error('simulated destroy failure'));
        else cb();
      },
    };
    next();
  };
}

function buildApp(sql: postgres.Sql, userId: string | null, destroyFails = false): express.Express {
  const app = express();
  app.use(express.json());
  app.use(withFakeAuthAndSession(userId, destroyFails));
  app.use('/api/user', buildUserRouter(sql));
  app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    res.status(500).json({ error: 'Server error', detail: err.message });
  });
  return app;
}

describe.skipIf(SKIP)('DELETE /api/user', () => {
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
      VALUES ('g-del', 'del@x.com', 'ToDelete') RETURNING id
    `;
    userId = u!.id;
    await sql`INSERT INTO settings (user_id) VALUES (${userId})`;
    await sql`INSERT INTO tasks (user_id, name, time_estimate, sort_order) VALUES (${userId}, 'task1', 5, 0)`;
  });

  it('deletes the user and cascades to settings + tasks', async () => {
    const app = buildApp(sql, userId);
    const res = await request(app).delete('/api/user');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });

    const users = await sql`SELECT * FROM users WHERE id = ${userId}`;
    const settings = await sql`SELECT * FROM settings WHERE user_id = ${userId}`;
    const tasks = await sql`SELECT * FROM tasks WHERE user_id = ${userId}`;
    expect(users.length).toBe(0);
    expect(settings.length).toBe(0);
    expect(tasks.length).toBe(0);
  });

  it('clears the connect.sid cookie', async () => {
    const app = buildApp(sql, userId);
    const res = await request(app).delete('/api/user');
    const setCookie = res.headers['set-cookie'];
    const cookies = Array.isArray(setCookie) ? setCookie : [setCookie ?? ''];
    expect(cookies.some((c) => c.startsWith('connect.sid=;'))).toBe(true);
  });

  it('still succeeds + clears cookie if session.destroy fails (warn, don\'t bubble)', async () => {
    const app = buildApp(sql, userId, /* destroyFails */ true);
    const res = await request(app).delete('/api/user');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
    const setCookie = res.headers['set-cookie'];
    const cookies = Array.isArray(setCookie) ? setCookie : [setCookie ?? ''];
    expect(cookies.some((c) => c.startsWith('connect.sid=;'))).toBe(true);
  });

  it('returns 404 if user record is gone (already deleted)', async () => {
    await sql`DELETE FROM users WHERE id = ${userId}`;
    const app = buildApp(sql, userId);
    const res = await request(app).delete('/api/user');
    expect(res.status).toBe(404);
  });

  it('401 when unauthenticated', async () => {
    const app = buildApp(sql, null);
    const res = await request(app).delete('/api/user');
    expect(res.status).toBe(401);
  });
});
