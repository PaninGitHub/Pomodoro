import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import postgres from 'postgres';
import express from 'express';
import request from 'supertest';
import { buildActivitiesRouter } from './activities';

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
  app.use('/api/activities', buildActivitiesRouter(sql));
  return app;
}

describe.skipIf(SKIP)('Activities endpoints', () => {
  let sql: postgres.Sql;
  let userIdA: string;
  let userIdB: string;

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
      VALUES ('g-act-a', 'act-a@x.com', 'Alice') RETURNING id
    `;
    const [b] = await sql<{ id: string }[]>`
      INSERT INTO users (google_id, email, display_name)
      VALUES ('g-act-b', 'act-b@x.com', 'Bob') RETURNING id
    `;
    userIdA = a!.id;
    userIdB = b!.id;
    // Settings rows so break_activity_limit lookups succeed (defaults to 10).
    await sql`INSERT INTO settings (user_id) VALUES (${userIdA})`;
    await sql`INSERT INTO settings (user_id) VALUES (${userIdB})`;
  });

  describe('GET /api/activities', () => {
    it('returns an empty list for a user with no activities', async () => {
      const res = await request(buildApp(sql, userIdA)).get('/api/activities');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ activities: [] });
    });

    it('returns only the authenticated user\'s activities, ordered by sort_order ASC', async () => {
      await sql`INSERT INTO break_activities (user_id, name, time_estimate, sort_order) VALUES (${userIdA}, 'Walk', 5, 1)`;
      await sql`INSERT INTO break_activities (user_id, name, time_estimate, sort_order) VALUES (${userIdA}, 'Stretch', 3, 0)`;
      await sql`INSERT INTO break_activities (user_id, name, time_estimate, sort_order) VALUES (${userIdB}, 'OtherUserOnly', 7, 0)`;

      const res = await request(buildApp(sql, userIdA)).get('/api/activities');
      expect(res.status).toBe(200);
      expect(res.body.activities).toHaveLength(2);
      expect(res.body.activities[0].name).toBe('Stretch');
      expect(res.body.activities[1].name).toBe('Walk');
    });

    it('401 without auth', async () => {
      const res = await request(buildApp(sql, null)).get('/api/activities');
      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/activities', () => {
    it('creates an activity and returns it with auto sort_order = 0', async () => {
      const res = await request(buildApp(sql, userIdA))
        .post('/api/activities')
        .send({ name: 'Walk', time_estimate: 10 });
      expect(res.status).toBe(201);
      expect(res.body.activity).toMatchObject({ name: 'Walk', time_estimate: 10, sort_order: 0 });
      expect(res.body.activity.id).toMatch(/^[0-9a-f-]{36}$/i);
    });

    it('appends with MAX(sort_order)+1 when activities already exist', async () => {
      await sql`INSERT INTO break_activities (user_id, name, time_estimate, sort_order) VALUES (${userIdA}, 'A', 5, 0)`;
      await sql`INSERT INTO break_activities (user_id, name, time_estimate, sort_order) VALUES (${userIdA}, 'B', 5, 3)`;
      const res = await request(buildApp(sql, userIdA))
        .post('/api/activities')
        .send({ name: 'C', time_estimate: 5 });
      expect(res.status).toBe(201);
      expect(res.body.activity.sort_order).toBe(4);
    });

    it('enforces settings.break_activity_limit', async () => {
      // Lower limit to 2 for testing
      await sql`UPDATE settings SET break_activity_limit = 2 WHERE user_id = ${userIdA}`;
      await sql`INSERT INTO break_activities (user_id, name, time_estimate, sort_order) VALUES (${userIdA}, 'A', 5, 0)`;
      await sql`INSERT INTO break_activities (user_id, name, time_estimate, sort_order) VALUES (${userIdA}, 'B', 5, 1)`;
      const res = await request(buildApp(sql, userIdA))
        .post('/api/activities')
        .send({ name: 'C', time_estimate: 5 });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/maximum of 2/);
    });

    it('falls back to default limit (10) if user has no settings row', async () => {
      await sql`DELETE FROM settings WHERE user_id = ${userIdA}`;
      const res = await request(buildApp(sql, userIdA))
        .post('/api/activities')
        .send({ name: 'Walk', time_estimate: 5 });
      expect(res.status).toBe(201);
    });

    it('400 invalid body — missing name', async () => {
      const res = await request(buildApp(sql, userIdA))
        .post('/api/activities')
        .send({ time_estimate: 5 });
      expect(res.status).toBe(400);
    });

    it('400 invalid body — out-of-range time_estimate', async () => {
      const res = await request(buildApp(sql, userIdA))
        .post('/api/activities')
        .send({ name: 'x', time_estimate: 1441 });
      expect(res.status).toBe(400);
    });

    it('401 without auth', async () => {
      const res = await request(buildApp(sql, null))
        .post('/api/activities')
        .send({ name: 'x', time_estimate: 5 });
      expect(res.status).toBe(401);
    });
  });

  describe('PATCH /api/activities/:id', () => {
    let activityId: string;

    beforeEach(async () => {
      const [row] = await sql<{ id: string }[]>`
        INSERT INTO break_activities (user_id, name, time_estimate, sort_order)
        VALUES (${userIdA}, 'Original', 5, 0) RETURNING id
      `;
      activityId = row!.id;
    });

    it('updates name only', async () => {
      const res = await request(buildApp(sql, userIdA))
        .patch(`/api/activities/${activityId}`)
        .send({ name: 'Renamed' });
      expect(res.status).toBe(200);
      expect(res.body.activity.name).toBe('Renamed');
      expect(res.body.activity.time_estimate).toBe(5);
    });

    it('updates time_estimate only', async () => {
      const res = await request(buildApp(sql, userIdA))
        .patch(`/api/activities/${activityId}`)
        .send({ time_estimate: 20 });
      expect(res.status).toBe(200);
      expect(res.body.activity.time_estimate).toBe(20);
      expect(res.body.activity.name).toBe('Original');
    });

    it('400 on invalid UUID', async () => {
      const res = await request(buildApp(sql, userIdA))
        .patch('/api/activities/not-a-uuid')
        .send({ name: 'x' });
      expect(res.status).toBe(400);
    });

    it('404 if activity does not exist', async () => {
      const res = await request(buildApp(sql, userIdA))
        .patch('/api/activities/00000000-0000-0000-0000-000000000000')
        .send({ name: 'x' });
      expect(res.status).toBe(404);
    });

    it('does NOT update another user\'s activity (404, ownership check)', async () => {
      const res = await request(buildApp(sql, userIdB))
        .patch(`/api/activities/${activityId}`)
        .send({ name: 'hack' });
      expect(res.status).toBe(404);
      const [row] = await sql<{ name: string }[]>`SELECT name FROM break_activities WHERE id = ${activityId}`;
      expect(row?.name).toBe('Original');
    });

    it('400 if body is empty', async () => {
      const res = await request(buildApp(sql, userIdA))
        .patch(`/api/activities/${activityId}`)
        .send({});
      expect(res.status).toBe(400);
    });
  });

  describe('DELETE /api/activities/:id', () => {
    let activityId: string;

    beforeEach(async () => {
      const [row] = await sql<{ id: string }[]>`
        INSERT INTO break_activities (user_id, name, time_estimate, sort_order)
        VALUES (${userIdA}, 'Doomed', 5, 0) RETURNING id
      `;
      activityId = row!.id;
    });

    it('deletes the activity', async () => {
      const res = await request(buildApp(sql, userIdA)).delete(`/api/activities/${activityId}`);
      expect(res.status).toBe(200);
      const remaining = await sql`SELECT 1 FROM break_activities WHERE id = ${activityId}`;
      expect(remaining.length).toBe(0);
    });

    it('404 if not found', async () => {
      const res = await request(buildApp(sql, userIdA))
        .delete('/api/activities/00000000-0000-0000-0000-000000000000');
      expect(res.status).toBe(404);
    });

    it('does NOT delete another user\'s activity (404)', async () => {
      const res = await request(buildApp(sql, userIdB)).delete(`/api/activities/${activityId}`);
      expect(res.status).toBe(404);
      const remaining = await sql`SELECT 1 FROM break_activities WHERE id = ${activityId}`;
      expect(remaining.length).toBe(1);
    });
  });

  describe('PATCH /api/activities/reorder', () => {
    let id1: string;
    let id2: string;
    let id3: string;

    beforeEach(async () => {
      const [a] = await sql<{ id: string }[]>`INSERT INTO break_activities (user_id, name, time_estimate, sort_order) VALUES (${userIdA}, 'A', 5, 0) RETURNING id`;
      const [b] = await sql<{ id: string }[]>`INSERT INTO break_activities (user_id, name, time_estimate, sort_order) VALUES (${userIdA}, 'B', 5, 1) RETURNING id`;
      const [c] = await sql<{ id: string }[]>`INSERT INTO break_activities (user_id, name, time_estimate, sort_order) VALUES (${userIdA}, 'C', 5, 2) RETURNING id`;
      id1 = a!.id; id2 = b!.id; id3 = c!.id;
    });

    it('reorders activities in the given order', async () => {
      const res = await request(buildApp(sql, userIdA))
        .patch('/api/activities/reorder')
        .send({ ordered_ids: [id3, id1, id2] });
      expect(res.status).toBe(200);
      const rows = await sql<{ name: string; sort_order: number }[]>`
        SELECT name, sort_order FROM break_activities WHERE user_id = ${userIdA} ORDER BY sort_order
      `;
      expect(rows.map((r) => r.name)).toEqual(['C', 'A', 'B']);
    });

    it('rejects ids that do not belong to the user (404, transactional rollback)', async () => {
      const [other] = await sql<{ id: string }[]>`
        INSERT INTO break_activities (user_id, name, time_estimate, sort_order) VALUES (${userIdB}, 'X', 5, 0) RETURNING id
      `;
      const res = await request(buildApp(sql, userIdA))
        .patch('/api/activities/reorder')
        .send({ ordered_ids: [id1, other!.id, id2] });
      expect(res.status).toBe(404);
      // Ensure id1 was NOT updated despite being valid (transaction rollback)
      const [row] = await sql<{ sort_order: number }[]>`SELECT sort_order FROM break_activities WHERE id = ${id1}`;
      expect(row?.sort_order).toBe(0);
    });

    it('rejects empty ordered_ids', async () => {
      const res = await request(buildApp(sql, userIdA))
        .patch('/api/activities/reorder')
        .send({ ordered_ids: [] });
      expect(res.status).toBe(400);
    });

    it('rejects invalid UUIDs in ordered_ids', async () => {
      const res = await request(buildApp(sql, userIdA))
        .patch('/api/activities/reorder')
        .send({ ordered_ids: ['not-a-uuid', id1] });
      expect(res.status).toBe(400);
    });

    it('route precedence — /reorder is NOT interpreted as /:id', async () => {
      // If the routes were declared in the wrong order, this would be parsed
      // as PATCH /:id with id='reorder' → 400 invalid UUID, not the
      // reorder handler's 400 'ordered_ids must be an array'.
      const res = await request(buildApp(sql, userIdA))
        .patch('/api/activities/reorder')
        .send({}); // missing ordered_ids
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/ordered_ids/);
    });
  });
});
