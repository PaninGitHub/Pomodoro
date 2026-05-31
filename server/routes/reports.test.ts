import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import postgres from 'postgres';
import express from 'express';
import request from 'supertest';
import { buildReportsRouter } from './reports';

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
  app.use('/api/reports', buildReportsRouter(sql));
  return app;
}

describe.skipIf(SKIP)('Reports endpoints', () => {
  let sql: postgres.Sql;
  let userIdA: string;
  let userIdB: string;
  let sessionIdA: string;
  let sessionIdB: string;

  beforeAll(() => {
    sql = postgres(TEST_DB_URL!, { prepare: false });
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

  describe('GET /api/reports/streak', () => {
    it('401 when not authenticated', async () => {
      const app = buildApp(sql, null);
      const res = await request(app).get('/api/reports/streak');
      expect(res.status).toBe(401);
    });

    it('returns 0 / null for a user with no sessions', async () => {
      const app = buildApp(sql, userIdA);
      const res = await request(app).get('/api/reports/streak?tz=UTC');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ current: 0, last_active_date: null });
    });

    it('ignores sessions with periods_completed = 0', async () => {
      await sql`
        INSERT INTO timer_sessions (user_id, mode, started_at, periods_completed)
        VALUES (${userIdA}, 'pomodoro', NOW(), 0)
      `;
      const app = buildApp(sql, userIdA);
      const res = await request(app).get('/api/reports/streak?tz=UTC');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ current: 0, last_active_date: null });
    });

    it('counts a single session today as streak 1', async () => {
      await sql`
        INSERT INTO timer_sessions (user_id, mode, started_at, periods_completed)
        VALUES (${userIdA}, 'pomodoro', NOW(), 1)
      `;
      const app = buildApp(sql, userIdA);
      const res = await request(app).get('/api/reports/streak?tz=UTC');
      expect(res.status).toBe(200);
      expect(res.body.current).toBe(1);
      expect(res.body.last_active_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('returns 3 for today + yesterday + day-before, all active', async () => {
      await sql`
        INSERT INTO timer_sessions (user_id, mode, started_at, periods_completed)
        VALUES
          (${userIdA}, 'pomodoro', NOW(), 1),
          (${userIdA}, 'pomodoro', NOW() - INTERVAL '1 day', 2),
          (${userIdA}, 'pomodoro', NOW() - INTERVAL '2 days', 1)
      `;
      const app = buildApp(sql, userIdA);
      const res = await request(app).get('/api/reports/streak?tz=UTC');
      expect(res.status).toBe(200);
      expect(res.body.current).toBe(3);
    });

    it('multiple sessions on the same day count once', async () => {
      await sql`
        INSERT INTO timer_sessions (user_id, mode, started_at, periods_completed)
        VALUES
          (${userIdA}, 'pomodoro', NOW(), 1),
          (${userIdA}, 'pomodoro', NOW() - INTERVAL '2 hours', 1),
          (${userIdA}, 'pomodoro', NOW() - INTERVAL '1 day', 1)
      `;
      const app = buildApp(sql, userIdA);
      const res = await request(app).get('/api/reports/streak?tz=UTC');
      expect(res.status).toBe(200);
      expect(res.body.current).toBe(2);
    });

    it('breaks the streak on the first gap (today + 3 days ago = 1)', async () => {
      await sql`
        INSERT INTO timer_sessions (user_id, mode, started_at, periods_completed)
        VALUES
          (${userIdA}, 'pomodoro', NOW(), 1),
          (${userIdA}, 'pomodoro', NOW() - INTERVAL '3 days', 1)
      `;
      const app = buildApp(sql, userIdA);
      const res = await request(app).get('/api/reports/streak?tz=UTC');
      expect(res.status).toBe(200);
      expect(res.body.current).toBe(1);
    });

    it('freeze rule: yesterday active, no session today, streak stays alive', async () => {
      await sql`
        INSERT INTO timer_sessions (user_id, mode, started_at, periods_completed)
        VALUES
          (${userIdA}, 'pomodoro', NOW() - INTERVAL '1 day', 1),
          (${userIdA}, 'pomodoro', NOW() - INTERVAL '2 days', 1)
      `;
      const app = buildApp(sql, userIdA);
      const res = await request(app).get('/api/reports/streak?tz=UTC');
      expect(res.status).toBe(200);
      expect(res.body.current).toBe(2);
    });

    it('reset rule: last active was 2 days ago, streak resets to 0 but last_active_date set', async () => {
      await sql`
        INSERT INTO timer_sessions (user_id, mode, started_at, periods_completed)
        VALUES (${userIdA}, 'pomodoro', NOW() - INTERVAL '2 days', 1)
      `;
      const app = buildApp(sql, userIdA);
      const res = await request(app).get('/api/reports/streak?tz=UTC');
      expect(res.status).toBe(200);
      expect(res.body.current).toBe(0);
      expect(res.body.last_active_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('scopes to the requesting user (other user sessions are ignored)', async () => {
      await sql`
        INSERT INTO timer_sessions (user_id, mode, started_at, periods_completed)
        VALUES
          (${userIdB}, 'pomodoro', NOW(), 1),
          (${userIdB}, 'pomodoro', NOW() - INTERVAL '1 day', 1)
      `;
      const app = buildApp(sql, userIdA);
      const res = await request(app).get('/api/reports/streak?tz=UTC');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ current: 0, last_active_date: null });
    });

    it('respects the tz query param when assigning a day to a session', async () => {
      // 23:30 UTC = 05:00 next morning in Asia/Colombo (UTC+5:30).
      // UTC tz → active_date 2026-01-15
      // Asia/Colombo tz → active_date 2026-01-16
      await sql`
        INSERT INTO timer_sessions (user_id, mode, started_at, periods_completed)
        VALUES (${userIdA}, 'pomodoro', '2026-01-15 23:30:00+00', 1)
      `;
      const app = buildApp(sql, userIdA);
      const utcRes = await request(app).get('/api/reports/streak?tz=UTC');
      const colomboRes = await request(app).get('/api/reports/streak?tz=Asia/Colombo');
      expect(utcRes.body.last_active_date).toBe('2026-01-15');
      expect(colomboRes.body.last_active_date).toBe('2026-01-16');
    });

    it('defaults to UTC when tz is omitted', async () => {
      await sql`
        INSERT INTO timer_sessions (user_id, mode, started_at, periods_completed)
        VALUES (${userIdA}, 'pomodoro', '2026-01-15 23:30:00+00', 1)
      `;
      const app = buildApp(sql, userIdA);
      const res = await request(app).get('/api/reports/streak');
      expect(res.status).toBe(200);
      expect(res.body.last_active_date).toBe('2026-01-15');
    });

    it('rejects an invalid tz with 400', async () => {
      const app = buildApp(sql, userIdA);
      const res = await request(app).get('/api/reports/streak?tz=Not/A/Zone');
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/timezone/i);
    });
  });

  describe('GET /api/reports/focus', () => {
    it('401 when not authenticated', async () => {
      const app = buildApp(sql, null);
      const res = await request(app).get('/api/reports/focus');
      expect(res.status).toBe(401);
    });

    it('returns empty buckets when there are no reflections', async () => {
      const app = buildApp(sql, userIdA);
      const res = await request(app).get('/api/reports/focus?bucket=day&tz=UTC');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ buckets: [] });
    });

    it('excludes reflections where focus_rating is NULL', async () => {
      await sql`
        INSERT INTO reflections (user_id, session_id, type, period_number, focus_rating, created_at)
        VALUES (${userIdA}, ${sessionIdA}, 'per_period', 1, NULL, '2026-01-15 12:00:00+00')
      `;
      const app = buildApp(sql, userIdA);
      const res = await request(app).get('/api/reports/focus?bucket=day&tz=UTC');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ buckets: [] });
    });

    it('averages multiple same-day ratings into a single bucket', async () => {
      await sql`
        INSERT INTO reflections (user_id, session_id, type, period_number, focus_rating, created_at)
        VALUES
          (${userIdA}, ${sessionIdA}, 'per_period', 1, 2, '2026-01-15 09:00:00+00'),
          (${userIdA}, ${sessionIdA}, 'per_period', 2, 4, '2026-01-15 14:00:00+00')
      `;
      const app = buildApp(sql, userIdA);
      const res = await request(app).get('/api/reports/focus?bucket=day&tz=UTC');
      expect(res.status).toBe(200);
      expect(res.body.buckets).toHaveLength(1);
      expect(res.body.buckets[0]).toEqual({ start: '2026-01-15', avg: 3, n: 2 });
    });

    it('returns separate buckets for different days, ordered ASC', async () => {
      await sql`
        INSERT INTO reflections (user_id, session_id, type, period_number, focus_rating, created_at)
        VALUES
          (${userIdA}, ${sessionIdA}, 'per_period', 1, 4, '2026-01-15 09:00:00+00'),
          (${userIdA}, ${sessionIdA}, 'per_period', 1, 2, '2026-01-16 09:00:00+00')
      `;
      const app = buildApp(sql, userIdA);
      const res = await request(app).get('/api/reports/focus?bucket=day&tz=UTC');
      expect(res.body.buckets.map((b: { start: string }) => b.start)).toEqual([
        '2026-01-15',
        '2026-01-16',
      ]);
    });

    it('bucket=week with sunday-start (default) combines Sun + Sat into one bucket', async () => {
      // 2026-01-04 is a Sunday. 2026-01-10 is the following Saturday.
      // Sunday-start week starting 2026-01-04 contains both.
      await sql`
        INSERT INTO reflections (user_id, session_id, type, period_number, focus_rating, created_at)
        VALUES
          (${userIdA}, ${sessionIdA}, 'per_period', 1, 3, '2026-01-04 12:00:00+00'),
          (${userIdA}, ${sessionIdA}, 'per_period', 1, 3, '2026-01-10 12:00:00+00')
      `;
      const app = buildApp(sql, userIdA);
      const res = await request(app).get('/api/reports/focus?bucket=week&tz=UTC');
      expect(res.status).toBe(200);
      expect(res.body.buckets).toHaveLength(1);
      expect(res.body.buckets[0].start).toBe('2026-01-04');
      expect(res.body.buckets[0].n).toBe(2);
    });

    it('bucket=week with monday-start places Sunday and following Monday in different weeks', async () => {
      await sql`
        INSERT INTO settings (user_id, week_start) VALUES (${userIdA}, 'monday')
      `;
      // 2026-01-04 Sun → week-of 2025-12-29
      // 2026-01-05 Mon → week-of 2026-01-05
      await sql`
        INSERT INTO reflections (user_id, session_id, type, period_number, focus_rating, created_at)
        VALUES
          (${userIdA}, ${sessionIdA}, 'per_period', 1, 3, '2026-01-04 12:00:00+00'),
          (${userIdA}, ${sessionIdA}, 'per_period', 1, 3, '2026-01-05 12:00:00+00')
      `;
      const app = buildApp(sql, userIdA);
      const res = await request(app).get('/api/reports/focus?bucket=week&tz=UTC');
      expect(res.body.buckets.map((b: { start: string }) => b.start)).toEqual([
        '2025-12-29',
        '2026-01-05',
      ]);
    });

    it('defaults bucket to "day" when omitted', async () => {
      await sql`
        INSERT INTO reflections (user_id, session_id, type, period_number, focus_rating, created_at)
        VALUES (${userIdA}, ${sessionIdA}, 'per_period', 1, 3, '2026-01-15 09:00:00+00')
      `;
      const app = buildApp(sql, userIdA);
      const res = await request(app).get('/api/reports/focus?tz=UTC');
      expect(res.body.buckets[0].start).toBe('2026-01-15');
    });

    it('scopes to the requesting user', async () => {
      await sql`
        INSERT INTO reflections (user_id, session_id, type, period_number, focus_rating, created_at)
        VALUES (${userIdB}, ${sessionIdB}, 'per_period', 1, 4, '2026-01-15 09:00:00+00')
      `;
      const app = buildApp(sql, userIdA);
      const res = await request(app).get('/api/reports/focus?tz=UTC');
      expect(res.body).toEqual({ buckets: [] });
    });

    it('rejects an invalid bucket with 400', async () => {
      const app = buildApp(sql, userIdA);
      const res = await request(app).get('/api/reports/focus?bucket=month');
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/bucket/i);
    });
  });

  describe('GET /api/reports/time', () => {
    it('401 when not authenticated', async () => {
      const app = buildApp(sql, null);
      const res = await request(app).get('/api/reports/time');
      expect(res.status).toBe(401);
    });

    it('returns empty buckets when there are no sessions with total_work_mins', async () => {
      const app = buildApp(sql, userIdA);
      const res = await request(app).get('/api/reports/time?tz=UTC');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ buckets: [] });
    });

    it('excludes sessions where total_work_mins is NULL', async () => {
      await sql`
        INSERT INTO timer_sessions (user_id, mode, started_at, total_work_mins)
        VALUES (${userIdA}, 'pomodoro', '2026-01-15 09:00:00+00', NULL)
      `;
      const app = buildApp(sql, userIdA);
      const res = await request(app).get('/api/reports/time?tz=UTC');
      expect(res.body).toEqual({ buckets: [] });
    });

    it('sums same-day sessions into a single bucket', async () => {
      await sql`
        INSERT INTO timer_sessions (user_id, mode, started_at, total_work_mins)
        VALUES
          (${userIdA}, 'pomodoro', '2026-01-15 09:00:00+00', 25),
          (${userIdA}, 'pomodoro', '2026-01-15 14:00:00+00', 50)
      `;
      const app = buildApp(sql, userIdA);
      const res = await request(app).get('/api/reports/time?bucket=day&tz=UTC');
      expect(res.body.buckets).toHaveLength(1);
      expect(res.body.buckets[0]).toEqual({ start: '2026-01-15', total_mins: 75 });
    });

    it('bucket=week respects sunday-start (default)', async () => {
      await sql`
        INSERT INTO timer_sessions (user_id, mode, started_at, total_work_mins)
        VALUES
          (${userIdA}, 'pomodoro', '2026-01-04 12:00:00+00', 25),
          (${userIdA}, 'pomodoro', '2026-01-10 12:00:00+00', 25)
      `;
      const app = buildApp(sql, userIdA);
      const res = await request(app).get('/api/reports/time?bucket=week&tz=UTC');
      expect(res.body.buckets).toHaveLength(1);
      expect(res.body.buckets[0]).toEqual({ start: '2026-01-04', total_mins: 50 });
    });

    it('scopes to the requesting user', async () => {
      await sql`
        INSERT INTO timer_sessions (user_id, mode, started_at, total_work_mins)
        VALUES (${userIdB}, 'pomodoro', '2026-01-15 09:00:00+00', 25)
      `;
      const app = buildApp(sql, userIdA);
      const res = await request(app).get('/api/reports/time?tz=UTC');
      expect(res.body).toEqual({ buckets: [] });
    });
  });
});
