import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import postgres from 'postgres';
import path from 'node:path';
import express from 'express';
import request from 'supertest';
import { runMigrations } from '../db/migrate';
import { buildReflectionsRouter } from './reflections';

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
  app.use('/api/reflections', buildReflectionsRouter(sql));
  return app;
}

describe.skipIf(SKIP)('Reflections endpoints', () => {
  let sql: postgres.Sql;
  let userIdA: string;
  let userIdB: string;
  let sessionIdA: string;
  let sessionIdB: string;

  beforeAll(async () => {
    sql = postgres(TEST_DB_URL!, { prepare: false });
    await sql`DROP TABLE IF EXISTS reflections CASCADE`;
    await sql`DROP TABLE IF EXISTS timer_sessions CASCADE`;
    await sql`DROP TABLE IF EXISTS custom_prompts CASCADE`;
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
    const [sa] = await sql<{ id: string }[]>`
      INSERT INTO timer_sessions (user_id, mode) VALUES (${userIdA}, 'pomodoro') RETURNING id
    `;
    const [sb] = await sql<{ id: string }[]>`
      INSERT INTO timer_sessions (user_id, mode) VALUES (${userIdB}, 'pomodoro') RETURNING id
    `;
    sessionIdA = sa!.id;
    sessionIdB = sb!.id;
  });

  describe('POST /api/reflections', () => {
    it('inserts a per_period reflection', async () => {
      const app = buildApp(sql, userIdA);
      const res = await request(app).post('/api/reflections').send({
        session_id: sessionIdA,
        type: 'per_period',
        period_number: 1,
        focus_rating: 3,
        answers: { did_well: 'focused' },
        tasks_snapshot: [],
      });
      expect(res.status).toBe(201);
      expect(res.body.reflection.type).toBe('per_period');
      expect(res.body.reflection.period_number).toBe(1);
      expect(res.body.reflection.focus_rating).toBe(3);
      expect(res.body.reflection.answers.did_well).toBe('focused');
      expect(res.body.reflection).not.toHaveProperty('user_id');
    });

    it('inserts a session reflection', async () => {
      const app = buildApp(sql, userIdA);
      const res = await request(app).post('/api/reflections').send({
        session_id: sessionIdA,
        type: 'session',
        focus_rating: 4,
        answers: { accomplishment: 'finished chapter', obstacle: 'distractions' },
        tasks_snapshot: [],
      });
      expect(res.status).toBe(201);
      expect(res.body.reflection.type).toBe('session');
      expect(res.body.reflection.period_number).toBeNull();
    });

    it('400 when session_id belongs to another user', async () => {
      const app = buildApp(sql, userIdA);
      const res = await request(app).post('/api/reflections').send({
        session_id: sessionIdB,
        type: 'session',
        focus_rating: 4,
        answers: { accomplishment: 'done' },
        tasks_snapshot: [],
      });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/session/i);
    });

    it('400 on invalid body (missing required fields)', async () => {
      const app = buildApp(sql, userIdA);
      const res = await request(app).post('/api/reflections').send({ type: 'per_period' });
      expect(res.status).toBe(400);
    });

    it('401 without auth', async () => {
      const app = buildApp(sql, null);
      const res = await request(app).post('/api/reflections').send({});
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/reflections (F-10 stub)', () => {
    it('returns an empty reflections array', async () => {
      const app = buildApp(sql, userIdA);
      const res = await request(app).get('/api/reflections');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ reflections: [] });
    });
  });

  describe('PATCH /api/reflections/:id (F-10 stub)', () => {
    it('returns 501 Not Implemented', async () => {
      const app = buildApp(sql, userIdA);
      const res = await request(app).patch('/api/reflections/00000000-0000-0000-0000-000000000000').send({});
      expect(res.status).toBe(501);
    });
  });
});
