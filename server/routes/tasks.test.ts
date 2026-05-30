import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import postgres from 'postgres';
import path from 'node:path';
import express from 'express';
import request from 'supertest';
import { runMigrations } from '../db/migrate';
import { buildTasksRouter } from './tasks';

const TEST_DB_URL = process.env.TEST_DATABASE_URL;
const SKIP = !TEST_DB_URL;

// Minimal fake-auth middleware so the route's requireAuth check passes with
// a controllable user_id. The real passport flow is integration-tested via
// the actual /api/auth route, not here.
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
  app.use('/api/tasks', buildTasksRouter(sql));
  return app;
}

describe.skipIf(SKIP)('Tasks endpoints', () => {
  let sql: postgres.Sql;
  let userIdA: string;
  let userIdB: string;

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

  describe('GET /api/tasks', () => {
    it('returns empty array when user has no tasks', async () => {
      const app = buildApp(sql, userIdA);
      const res = await request(app).get('/api/tasks');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ tasks: [] });
    });

    it('returns only the authenticated user tasks, ordered by sort_order', async () => {
      await sql`INSERT INTO tasks (user_id, name, time_estimate, sort_order) VALUES (${userIdA}, 'Task A1', 10, 1)`;
      await sql`INSERT INTO tasks (user_id, name, time_estimate, sort_order) VALUES (${userIdA}, 'Task A0', 5, 0)`;
      await sql`INSERT INTO tasks (user_id, name, time_estimate, sort_order) VALUES (${userIdB}, 'Task B0', 15, 0)`;

      const app = buildApp(sql, userIdA);
      const res = await request(app).get('/api/tasks');
      expect(res.status).toBe(200);
      expect(res.body.tasks).toHaveLength(2);
      expect(res.body.tasks[0].name).toBe('Task A0');
      expect(res.body.tasks[1].name).toBe('Task A1');
    });
  });

  describe('POST /api/tasks', () => {
    it('creates a task and returns it with sort_order at end', async () => {
      const app = buildApp(sql, userIdA);
      const res = await request(app).post('/api/tasks').send({ name: 'New task', time_estimate: 30 });
      expect(res.status).toBe(201);
      expect(res.body.task.name).toBe('New task');
      expect(res.body.task.time_estimate).toBe(30);
      expect(res.body.task.is_complete).toBe(false);
      expect(res.body.task.sort_order).toBe(0);
    });

    it('places new task at the next sort_order', async () => {
      await sql`INSERT INTO tasks (user_id, name, time_estimate, sort_order) VALUES (${userIdA}, 'existing', 10, 0)`;
      const app = buildApp(sql, userIdA);
      const res = await request(app).post('/api/tasks').send({ name: 'new', time_estimate: 5 });
      expect(res.body.task.sort_order).toBe(1);
    });

    it('rejects invalid body with 400', async () => {
      const app = buildApp(sql, userIdA);
      const res = await request(app).post('/api/tasks').send({ name: '', time_estimate: 5 });
      expect(res.status).toBe(400);
      expect(res.body.error).toBeTruthy();
    });

    it('rejects the 21st task with the spec message', async () => {
      for (let i = 0; i < 20; i++) {
        await sql`INSERT INTO tasks (user_id, name, time_estimate, sort_order) VALUES (${userIdA}, ${'t' + i}, 5, ${i})`;
      }
      const app = buildApp(sql, userIdA);
      const res = await request(app).post('/api/tasks').send({ name: 'twenty-first', time_estimate: 5 });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/maximum of 20 tasks/i);
    });
  });

  describe('PATCH /api/tasks/:id', () => {
    it('updates name, time_estimate, is_complete', async () => {
      const [row] = await sql<{ id: string }[]>`
        INSERT INTO tasks (user_id, name, time_estimate, sort_order)
        VALUES (${userIdA}, 'original', 10, 0) RETURNING id
      `;
      const app = buildApp(sql, userIdA);
      const res = await request(app).patch(`/api/tasks/${row!.id}`).send({ name: 'updated', is_complete: true });
      expect(res.status).toBe(200);
      expect(res.body.task.name).toBe('updated');
      expect(res.body.task.is_complete).toBe(true);
      expect(res.body.task.time_estimate).toBe(10); // unchanged
    });

    it('404 when task belongs to another user', async () => {
      const [row] = await sql<{ id: string }[]>`
        INSERT INTO tasks (user_id, name, time_estimate, sort_order)
        VALUES (${userIdB}, 'bobs', 10, 0) RETURNING id
      `;
      const app = buildApp(sql, userIdA);
      const res = await request(app).patch(`/api/tasks/${row!.id}`).send({ name: 'hacked' });
      expect(res.status).toBe(404);
    });

    it('400 on malformed UUID', async () => {
      const app = buildApp(sql, userIdA);
      const res = await request(app).patch('/api/tasks/not-a-uuid').send({ name: 'x' });
      expect(res.status).toBe(400);
    });

    it('400 on invalid body', async () => {
      const [row] = await sql<{ id: string }[]>`
        INSERT INTO tasks (user_id, name, time_estimate, sort_order)
        VALUES (${userIdA}, 'x', 10, 0) RETURNING id
      `;
      const app = buildApp(sql, userIdA);
      const res = await request(app).patch(`/api/tasks/${row!.id}`).send({ time_estimate: 0 });
      expect(res.status).toBe(400);
    });
  });

  describe('PATCH /api/tasks/reorder', () => {
    it('reorders by ordered_ids array', async () => {
      const ids: string[] = [];
      for (let i = 0; i < 3; i++) {
        const [row] = await sql<{ id: string }[]>`
          INSERT INTO tasks (user_id, name, time_estimate, sort_order)
          VALUES (${userIdA}, ${'t' + i}, 5, ${i}) RETURNING id
        `;
        ids.push(row!.id);
      }
      const app = buildApp(sql, userIdA);
      const reversed = [...ids].reverse();
      const res = await request(app).patch('/api/tasks/reorder').send({ ordered_ids: reversed });
      expect(res.status).toBe(200);
      const rows = await sql<{ id: string; sort_order: number }[]>`
        SELECT id, sort_order FROM tasks WHERE user_id = ${userIdA} ORDER BY sort_order ASC
      `;
      expect(rows.map((r) => r.id)).toEqual(reversed);
    });

    it('rejects empty array', async () => {
      const app = buildApp(sql, userIdA);
      const res = await request(app).patch('/api/tasks/reorder').send({ ordered_ids: [] });
      expect(res.status).toBe(400);
    });

    it('404 if any ID does not belong to the user', async () => {
      const [row] = await sql<{ id: string }[]>`
        INSERT INTO tasks (user_id, name, time_estimate, sort_order)
        VALUES (${userIdB}, 'bob', 10, 0) RETURNING id
      `;
      const app = buildApp(sql, userIdA);
      const res = await request(app).patch('/api/tasks/reorder').send({ ordered_ids: [row!.id] });
      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /api/tasks/:id', () => {
    it('deletes own task', async () => {
      const [row] = await sql<{ id: string }[]>`
        INSERT INTO tasks (user_id, name, time_estimate, sort_order)
        VALUES (${userIdA}, 'dead', 5, 0) RETURNING id
      `;
      const app = buildApp(sql, userIdA);
      const res = await request(app).delete(`/api/tasks/${row!.id}`);
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ ok: true });
      const remaining = await sql`SELECT * FROM tasks WHERE id = ${row!.id}`;
      expect(remaining.length).toBe(0);
    });

    it('404 when task belongs to another user', async () => {
      const [row] = await sql<{ id: string }[]>`
        INSERT INTO tasks (user_id, name, time_estimate, sort_order)
        VALUES (${userIdB}, 'bob', 5, 0) RETURNING id
      `;
      const app = buildApp(sql, userIdA);
      const res = await request(app).delete(`/api/tasks/${row!.id}`);
      expect(res.status).toBe(404);
    });

    it('400 on malformed UUID', async () => {
      const app = buildApp(sql, userIdA);
      const res = await request(app).delete('/api/tasks/not-a-uuid');
      expect(res.status).toBe(400);
    });
  });
});
