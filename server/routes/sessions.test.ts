import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import postgres from 'postgres';
import path from 'node:path';
import express from 'express';
import request from 'supertest';
import { runMigrations } from '../db/migrate';
import { buildSessionsRouter } from './sessions';

const TEST_DB_URL = process.env.TEST_DATABASE_URL;
const SKIP = !TEST_DB_URL;

function withFakeAuth(userId: string | null) {
  return (req: express.Request, _res: express.Response, next: express.NextFunction) => {
    if (userId !== null) {
      (req as express.Request & { user: { id: string } }).user = { id: userId };
    }
    next();
  };
}

function buildApp(sql: postgres.Sql, userId: string | null): express.Express {
  const app = express();
  app.use(express.json());
  app.use(withFakeAuth(userId));
  app.use('/api/sessions', buildSessionsRouter(sql));
  return app;
}

describe.skipIf(SKIP)('Sessions endpoints', () => {
  let sql: postgres.Sql;
  let userIdA: string;
  let userIdB: string;

  beforeAll(async () => {
    sql = postgres(TEST_DB_URL!, { prepare: false });
    await sql`DROP TABLE IF EXISTS timer_sessions CASCADE`;
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
    const [a] = await sql<{ id: string }[]>`
      INSERT INTO users (google_id, email, display_name)
      VALUES ('g-a', 'a@x.com', 'Alice') RETURNING id
    `;
    const [b] = await sql<{ id: string }[]>`
      INSERT INTO users (google_id, email, display_name)
      VALUES ('g-b', 'b@x.com', 'Bob') RETURNING id
    `;
    userIdA = a!.id;
    userIdB = b!.id;
  });

  describe('POST /api/sessions', () => {
    it('creates a session row and returns session_id', async () => {
      const app = buildApp(sql, userIdA);
      const res = await request(app).post('/api/sessions').send({ mode: 'pomodoro' });
      expect(res.status).toBe(201);
      expect(res.body.session_id).toMatch(/^[0-9a-f-]{36}$/i);
      const rows = await sql<{ mode: string; user_id: string }[]>`
        SELECT mode, user_id FROM timer_sessions WHERE id = ${res.body.session_id}
      `;
      expect(rows.length).toBe(1);
      expect(rows[0]?.user_id).toBe(userIdA);
      expect(rows[0]?.mode).toBe('pomodoro');
    });

    it('accepts all three modes', async () => {
      const app = buildApp(sql, userIdA);
      for (const mode of ['timer', 'pomodoro', 'freestyle']) {
        const res = await request(app).post('/api/sessions').send({ mode });
        expect(res.status).toBe(201);
      }
    });

    it('scopes session to authenticated user only', async () => {
      const appA = buildApp(sql, userIdA);
      const resA = await request(appA).post('/api/sessions').send({ mode: 'pomodoro' });
      expect(resA.status).toBe(201);

      const rowsB = await sql<{ id: string }[]>`
        SELECT id FROM timer_sessions WHERE user_id = ${userIdB}
      `;
      expect(rowsB.length).toBe(0);
    });

    it('400 on invalid mode', async () => {
      const app = buildApp(sql, userIdA);
      const res = await request(app).post('/api/sessions').send({ mode: 'invalid' });
      expect(res.status).toBe(400);
      expect(res.body.error).toBeTruthy();
    });

    it('400 on missing mode', async () => {
      const app = buildApp(sql, userIdA);
      const res = await request(app).post('/api/sessions').send({});
      expect(res.status).toBe(400);
    });

    it('401 when not signed in', async () => {
      const app = buildApp(sql, null);
      const res = await request(app).post('/api/sessions').send({ mode: 'pomodoro' });
      expect(res.status).toBe(401);
    });
  });

  describe('PATCH /api/sessions/:id', () => {
    it('updates ended_at + ended_early + periods_completed', async () => {
      const [row] = await sql<{ id: string }[]>`
        INSERT INTO timer_sessions (user_id, mode)
        VALUES (${userIdA}, 'pomodoro') RETURNING id
      `;
      const app = buildApp(sql, userIdA);
      const res = await request(app)
        .patch(`/api/sessions/${row!.id}`)
        .send({
          ended_at: '2026-05-30T12:00:00Z',
          ended_early: true,
          periods_completed: 3,
        });
      expect(res.status).toBe(200);
      expect(res.body.session.id).toBe(row!.id);
      expect(res.body.session.ended_early).toBe(true);
      expect(res.body.session.periods_completed).toBe(3);
      expect(res.body.session.ended_at).toBeTruthy();
    });

    it('returns PublicSession shape (no is_interrupted / user_id leak)', async () => {
      const [row] = await sql<{ id: string }[]>`
        INSERT INTO timer_sessions (user_id, mode)
        VALUES (${userIdA}, 'timer') RETURNING id
      `;
      const app = buildApp(sql, userIdA);
      const res = await request(app)
        .patch(`/api/sessions/${row!.id}`)
        .send({ total_work_mins: 25 });
      expect(res.status).toBe(200);
      expect(res.body.session).not.toHaveProperty('user_id');
      expect(res.body.session).not.toHaveProperty('is_interrupted');
      expect(res.body.session).not.toHaveProperty('interrupted_at');
    });

    it('404 when session belongs to another user', async () => {
      const [row] = await sql<{ id: string }[]>`
        INSERT INTO timer_sessions (user_id, mode)
        VALUES (${userIdB}, 'timer') RETURNING id
      `;
      const app = buildApp(sql, userIdA);
      const res = await request(app)
        .patch(`/api/sessions/${row!.id}`)
        .send({ ended_early: false });
      expect(res.status).toBe(404);
    });

    it('400 on malformed UUID', async () => {
      const app = buildApp(sql, userIdA);
      const res = await request(app)
        .patch('/api/sessions/not-a-uuid')
        .send({ ended_early: false });
      expect(res.status).toBe(400);
    });

    it('400 on empty body', async () => {
      const [row] = await sql<{ id: string }[]>`
        INSERT INTO timer_sessions (user_id, mode)
        VALUES (${userIdA}, 'pomodoro') RETURNING id
      `;
      const app = buildApp(sql, userIdA);
      const res = await request(app).patch(`/api/sessions/${row!.id}`).send({});
      expect(res.status).toBe(400);
    });

    it('401 when not signed in', async () => {
      const [row] = await sql<{ id: string }[]>`
        INSERT INTO timer_sessions (user_id, mode)
        VALUES (${userIdA}, 'pomodoro') RETURNING id
      `;
      const app = buildApp(sql, null);
      const res = await request(app)
        .patch(`/api/sessions/${row!.id}`)
        .send({ ended_early: true });
      expect(res.status).toBe(401);
    });
  });
});
