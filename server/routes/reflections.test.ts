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

  describe('GET /api/reflections (F-10)', () => {
    it('returns an empty array when user has no reflections', async () => {
      const app = buildApp(sql, userIdA);
      const res = await request(app).get('/api/reflections');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ reflections: [] });
    });

    it('returns the user reflections ordered by created_at DESC', async () => {
      // Seed two reflections for userIdA at distinct timestamps.
      await sql`
        INSERT INTO reflections (user_id, session_id, type, focus_rating, answers, tasks_snapshot, created_at)
        VALUES (${userIdA}, ${sessionIdA}, 'session', 3, '{"obstacle":"old"}'::jsonb, '[]'::jsonb, NOW() - INTERVAL '2 days')
      `;
      await sql`
        INSERT INTO reflections (user_id, session_id, type, period_number, focus_rating, answers, tasks_snapshot, created_at)
        VALUES (${userIdA}, ${sessionIdA}, 'per_period', 1, 4, '{"did_well":"newer"}'::jsonb, '[]'::jsonb, NOW())
      `;
      const app = buildApp(sql, userIdA);
      const res = await request(app).get('/api/reflections');
      expect(res.status).toBe(200);
      expect(res.body.reflections.length).toBe(2);
      // Most recent first.
      expect(res.body.reflections[0].type).toBe('per_period');
      expect(res.body.reflections[1].type).toBe('session');
    });

    it('scopes to the authenticated user only', async () => {
      await sql`
        INSERT INTO reflections (user_id, session_id, type, focus_rating, answers, tasks_snapshot)
        VALUES (${userIdB}, ${sessionIdB}, 'session', 2, '{}'::jsonb, '[]'::jsonb)
      `;
      const app = buildApp(sql, userIdA);
      const res = await request(app).get('/api/reflections');
      expect(res.status).toBe(200);
      expect(res.body.reflections.length).toBe(0);
    });

    it('filters by focus_rating', async () => {
      await sql`
        INSERT INTO reflections (user_id, session_id, type, focus_rating, answers, tasks_snapshot)
        VALUES
          (${userIdA}, ${sessionIdA}, 'session', 1, '{}'::jsonb, '[]'::jsonb),
          (${userIdA}, ${sessionIdA}, 'session', 3, '{}'::jsonb, '[]'::jsonb),
          (${userIdA}, ${sessionIdA}, 'session', 1, '{}'::jsonb, '[]'::jsonb)
      `;
      const app = buildApp(sql, userIdA);
      const res = await request(app).get('/api/reflections?focus_rating=1');
      expect(res.status).toBe(200);
      expect(res.body.reflections.length).toBe(2);
      for (const r of res.body.reflections) expect(r.focus_rating).toBe(1);
    });

    it('filters by from/to date range', async () => {
      await sql`
        INSERT INTO reflections (user_id, session_id, type, focus_rating, answers, tasks_snapshot, created_at)
        VALUES
          (${userIdA}, ${sessionIdA}, 'session', 3, '{}'::jsonb, '[]'::jsonb, '2026-01-01T12:00:00Z'),
          (${userIdA}, ${sessionIdA}, 'session', 3, '{}'::jsonb, '[]'::jsonb, '2026-02-15T12:00:00Z'),
          (${userIdA}, ${sessionIdA}, 'session', 3, '{}'::jsonb, '[]'::jsonb, '2026-03-01T12:00:00Z')
      `;
      const app = buildApp(sql, userIdA);
      const res = await request(app).get('/api/reflections?from=2026-02-01&to=2026-02-28');
      expect(res.status).toBe(200);
      expect(res.body.reflections.length).toBe(1);
    });

    it('filters by task_name (case-insensitive substring match)', async () => {
      await sql`
        INSERT INTO reflections (user_id, session_id, type, focus_rating, answers, tasks_snapshot)
        VALUES
          (${userIdA}, ${sessionIdA}, 'session', 3, '{}'::jsonb,
            '[{"task_id":"11111111-1111-1111-1111-111111111111","name":"Read book","is_complete":true,"added_during_period":false}]'::jsonb),
          (${userIdA}, ${sessionIdA}, 'session', 3, '{}'::jsonb,
            '[{"task_id":"22222222-2222-2222-2222-222222222222","name":"Write report","is_complete":false,"added_during_period":false}]'::jsonb)
      `;
      const app = buildApp(sql, userIdA);
      const res = await request(app).get('/api/reflections?task_name=book');
      expect(res.status).toBe(200);
      expect(res.body.reflections.length).toBe(1);
      expect(res.body.reflections[0].tasks_snapshot[0].name).toBe('Read book');
    });

    it('does not leak user_id in the response', async () => {
      await sql`
        INSERT INTO reflections (user_id, session_id, type, focus_rating, answers, tasks_snapshot)
        VALUES (${userIdA}, ${sessionIdA}, 'session', 3, '{}'::jsonb, '[]'::jsonb)
      `;
      const app = buildApp(sql, userIdA);
      const res = await request(app).get('/api/reflections');
      expect(res.body.reflections[0]).not.toHaveProperty('user_id');
    });

    it('401 without auth', async () => {
      const app = buildApp(sql, null);
      const res = await request(app).get('/api/reflections');
      expect(res.status).toBe(401);
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
