import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import postgres from 'postgres';
import express from 'express';
import request from 'supertest';
import { buildBreakLogsRouter } from './breakLogs';

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
  app.use('/api/break-logs', buildBreakLogsRouter(sql));
  return app;
}

describe.skipIf(SKIP)('Break logs endpoints', () => {
  let sql: postgres.Sql;
  let userIdA: string;
  let userIdB: string;
  let sessionIdA: string;
  let sessionIdB: string;
  let activityIdA: string;

  beforeAll(() => {
    // Schema is migrated once per session by vitest globalSetup
    // (db/testGlobalSetup.ts).
    sql = postgres(TEST_DB_URL!, { prepare: false });
  });

  afterAll(async () => {
    await sql.end({ timeout: 5 });
  });

  beforeEach(async () => {
    await sql`TRUNCATE users CASCADE`;
    const [a] = await sql<{ id: string }[]>`
      INSERT INTO users (google_id, email, display_name)
      VALUES ('g-bl-a', 'bl-a@x.com', 'Alice') RETURNING id
    `;
    const [b] = await sql<{ id: string }[]>`
      INSERT INTO users (google_id, email, display_name)
      VALUES ('g-bl-b', 'bl-b@x.com', 'Bob') RETURNING id
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
    const [act] = await sql<{ id: string }[]>`
      INSERT INTO break_activities (user_id, name, time_estimate, sort_order)
      VALUES (${userIdA}, 'Walk', 5, 0) RETURNING id
    `;
    activityIdA = act!.id;
  });

  describe('POST /api/break-logs', () => {
    it('creates a log with selected activity', async () => {
      const ts = '2026-05-30T12:00:00.000Z';
      const res = await request(buildApp(sql, userIdA))
        .post('/api/break-logs')
        .send({
          session_id: sessionIdA,
          activity_id: activityIdA,
          activity_name: 'Walk',
          break_started_at: ts,
        });
      expect(res.status).toBe(201);
      expect(res.body.break_log.session_id).toBe(sessionIdA);
      expect(res.body.break_log.activity_id).toBe(activityIdA);
      expect(res.body.break_log.activity_name).toBe('Walk');
      expect(res.body.break_log.break_started_at).toBe(ts);
      expect(res.body.break_log.break_ended_at).toBeNull();
    });

    it('creates a log for dismiss-without-selecting (both nulls)', async () => {
      const res = await request(buildApp(sql, userIdA))
        .post('/api/break-logs')
        .send({
          session_id: sessionIdA,
          activity_id: null,
          activity_name: null,
          break_started_at: '2026-05-30T12:00:00.000Z',
        });
      expect(res.status).toBe(201);
      expect(res.body.break_log.activity_id).toBeNull();
      expect(res.body.break_log.activity_name).toBeNull();
    });

    it('404 if session belongs to another user (ownership check)', async () => {
      const res = await request(buildApp(sql, userIdA))
        .post('/api/break-logs')
        .send({
          session_id: sessionIdB,
          break_started_at: '2026-05-30T12:00:00.000Z',
        });
      expect(res.status).toBe(404);
      expect(res.body.error).toMatch(/session/i);
    });

    it('404 if activity belongs to another user (ownership check)', async () => {
      // Create an activity owned by B
      const [actB] = await sql<{ id: string }[]>`
        INSERT INTO break_activities (user_id, name, time_estimate, sort_order)
        VALUES (${userIdB}, 'BWalk', 5, 0) RETURNING id
      `;
      const res = await request(buildApp(sql, userIdA))
        .post('/api/break-logs')
        .send({
          session_id: sessionIdA,
          activity_id: actB!.id,
          activity_name: 'BWalk',
          break_started_at: '2026-05-30T12:00:00.000Z',
        });
      expect(res.status).toBe(404);
      expect(res.body.error).toMatch(/activity/i);
    });

    it('400 if body is invalid (missing session_id)', async () => {
      const res = await request(buildApp(sql, userIdA))
        .post('/api/break-logs')
        .send({ break_started_at: '2026-05-30T12:00:00.000Z' });
      expect(res.status).toBe(400);
    });

    it('400 if activity_id provided without activity_name', async () => {
      const res = await request(buildApp(sql, userIdA))
        .post('/api/break-logs')
        .send({
          session_id: sessionIdA,
          activity_id: activityIdA,
          break_started_at: '2026-05-30T12:00:00.000Z',
        });
      expect(res.status).toBe(400);
    });

    it('401 without auth', async () => {
      const res = await request(buildApp(sql, null))
        .post('/api/break-logs')
        .send({
          session_id: sessionIdA,
          break_started_at: '2026-05-30T12:00:00.000Z',
        });
      expect(res.status).toBe(401);
    });
  });

  describe('PATCH /api/break-logs/:id', () => {
    let logId: string;

    beforeEach(async () => {
      const [row] = await sql<{ id: string }[]>`
        INSERT INTO break_logs (user_id, session_id, activity_id, activity_name, break_started_at)
        VALUES (${userIdA}, ${sessionIdA}, ${activityIdA}, 'Walk', '2026-05-30T12:00:00.000Z') RETURNING id
      `;
      logId = row!.id;
    });

    it('stamps break_ended_at', async () => {
      const endTs = '2026-05-30T12:05:00.000Z';
      const res = await request(buildApp(sql, userIdA))
        .patch(`/api/break-logs/${logId}`)
        .send({ break_ended_at: endTs });
      expect(res.status).toBe(200);
      expect(res.body.break_log.break_ended_at).toBe(endTs);
    });

    it('400 on invalid UUID', async () => {
      const res = await request(buildApp(sql, userIdA))
        .patch('/api/break-logs/not-a-uuid')
        .send({ break_ended_at: '2026-05-30T12:05:00.000Z' });
      expect(res.status).toBe(400);
    });

    it('404 if not found', async () => {
      const res = await request(buildApp(sql, userIdA))
        .patch('/api/break-logs/00000000-0000-0000-0000-000000000000')
        .send({ break_ended_at: '2026-05-30T12:05:00.000Z' });
      expect(res.status).toBe(404);
    });

    it('does NOT update another user\'s log (404 ownership)', async () => {
      const res = await request(buildApp(sql, userIdB))
        .patch(`/api/break-logs/${logId}`)
        .send({ break_ended_at: '2026-05-30T12:05:00.000Z' });
      expect(res.status).toBe(404);
      const [row] = await sql<{ break_ended_at: Date | null }[]>`
        SELECT break_ended_at FROM break_logs WHERE id = ${logId}
      `;
      expect(row?.break_ended_at).toBeNull();
    });

    it('400 if break_ended_at missing', async () => {
      const res = await request(buildApp(sql, userIdA))
        .patch(`/api/break-logs/${logId}`)
        .send({});
      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/break-logs', () => {
    beforeEach(async () => {
      // 3 logs for A spanning 3 days, 1 for B
      await sql`INSERT INTO break_logs (user_id, session_id, activity_id, activity_name, break_started_at, break_ended_at)
                VALUES (${userIdA}, ${sessionIdA}, ${activityIdA}, 'Walk', '2026-05-28T10:00:00Z', '2026-05-28T10:05:00Z')`;
      await sql`INSERT INTO break_logs (user_id, session_id, activity_id, activity_name, break_started_at, break_ended_at)
                VALUES (${userIdA}, ${sessionIdA}, NULL, NULL, '2026-05-29T10:00:00Z', '2026-05-29T10:03:00Z')`;
      await sql`INSERT INTO break_logs (user_id, session_id, activity_id, activity_name, break_started_at)
                VALUES (${userIdA}, ${sessionIdA}, ${activityIdA}, 'Walk', '2026-05-30T10:00:00Z')`;
      await sql`INSERT INTO break_logs (user_id, session_id, activity_id, activity_name, break_started_at)
                VALUES (${userIdB}, ${sessionIdB}, NULL, NULL, '2026-05-30T10:00:00Z')`;
    });

    it('returns logs for the authenticated user only, DESC by break_started_at', async () => {
      const res = await request(buildApp(sql, userIdA)).get('/api/break-logs');
      expect(res.status).toBe(200);
      expect(res.body.break_logs).toHaveLength(3);
      expect(new Date(res.body.break_logs[0].break_started_at).toISOString()).toBe('2026-05-30T10:00:00.000Z');
      expect(new Date(res.body.break_logs[2].break_started_at).toISOString()).toBe('2026-05-28T10:00:00.000Z');
    });

    it('filters by ?from', async () => {
      const res = await request(buildApp(sql, userIdA))
        .get('/api/break-logs?from=2026-05-29T00:00:00Z');
      expect(res.status).toBe(200);
      expect(res.body.break_logs).toHaveLength(2);
    });

    it('filters by ?to', async () => {
      const res = await request(buildApp(sql, userIdA))
        .get('/api/break-logs?to=2026-05-28T23:59:59Z');
      expect(res.status).toBe(200);
      expect(res.body.break_logs).toHaveLength(1);
    });

    it('filters by ?from + ?to combined', async () => {
      const res = await request(buildApp(sql, userIdA))
        .get('/api/break-logs?from=2026-05-29T00:00:00Z&to=2026-05-29T23:59:59Z');
      expect(res.status).toBe(200);
      expect(res.body.break_logs).toHaveLength(1);
    });

    it('400 on invalid from date', async () => {
      const res = await request(buildApp(sql, userIdA)).get('/api/break-logs?from=not-a-date');
      expect(res.status).toBe(400);
    });

    it('401 without auth', async () => {
      const res = await request(buildApp(sql, null)).get('/api/break-logs');
      expect(res.status).toBe(401);
    });
  });
});
