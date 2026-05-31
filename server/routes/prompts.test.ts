import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import postgres from 'postgres';
import express from 'express';
import request from 'supertest';
import { buildPromptsRouter } from './prompts';
import { upsertUserFromGoogleProfile, type GoogleProfile } from '../auth/upsertUser';

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
  app.use('/api/prompts', buildPromptsRouter(sql));
  return app;
}

describe.skipIf(SKIP)('Prompts endpoints', () => {
  let sql: postgres.Sql;
  let userIdA: string;

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
    // Seed user via upsertUser so the 8 default prompts get inserted by
    // the same path real auth uses.
    const profile: GoogleProfile = {
      id: 'g-prompts-a',
      emails: [{ value: 'prompts-a@x.com' }],
      displayName: 'Prompts A',
      photos: [],
    };
    const user = await upsertUserFromGoogleProfile(sql, profile);
    userIdA = user.id;
  });

  describe('GET /api/prompts', () => {
    it('returns the 8 default keys for a freshly seeded user', async () => {
      const app = buildApp(sql, userIdA);
      const res = await request(app).get('/api/prompts');
      expect(res.status).toBe(200);
      const keys = Object.keys(res.body.prompts).sort();
      expect(keys).toEqual([
        'accomplishment', 'did_well', 'do_better', 'do_differently',
        'hindrance_detail', 'hindrance_options', 'obstacle', 'task_structure_note',
      ]);
      expect(res.body.prompts.did_well).toBe('What did you do well?');
    });

    it('401 without auth', async () => {
      const app = buildApp(sql, null);
      const res = await request(app).get('/api/prompts');
      expect(res.status).toBe(401);
    });
  });

  describe('PATCH /api/prompts', () => {
    it('updates existing prompt text and returns full map', async () => {
      const app = buildApp(sql, userIdA);
      const res = await request(app).patch('/api/prompts').send({
        updates: { did_well: 'Custom did well text' },
      });
      expect(res.status).toBe(200);
      expect(res.body.prompts.did_well).toBe('Custom did well text');
      expect(res.body.prompts.do_better).toBe('What can you do better?'); // unchanged
      const keys = Object.keys(res.body.prompts).sort();
      expect(keys.length).toBe(8);
    });

    it('updates multiple keys at once', async () => {
      const app = buildApp(sql, userIdA);
      const res = await request(app).patch('/api/prompts').send({
        updates: { did_well: 'a', accomplishment: 'b' },
      });
      expect(res.status).toBe(200);
      expect(res.body.prompts.did_well).toBe('a');
      expect(res.body.prompts.accomplishment).toBe('b');
    });

    it('400 on unknown key', async () => {
      const app = buildApp(sql, userIdA);
      const res = await request(app).patch('/api/prompts').send({ updates: { bogus: 'x' } });
      expect(res.status).toBe(400);
    });

    it('400 on text over 1280 chars', async () => {
      const app = buildApp(sql, userIdA);
      const res = await request(app).patch('/api/prompts').send({
        updates: { did_well: 'x'.repeat(1281) },
      });
      expect(res.status).toBe(400);
    });

    it('401 without auth', async () => {
      const app = buildApp(sql, null);
      const res = await request(app).patch('/api/prompts').send({ updates: { did_well: 'x' } });
      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/prompts/reset', () => {
    it('restores all prompts to config defaults', async () => {
      // First customize a few so we can verify the reset reverts them.
      const app = buildApp(sql, userIdA);
      await request(app).patch('/api/prompts').send({
        updates: { did_well: 'My custom did_well', accomplishment: 'My custom accomplishment' },
      });

      const res = await request(app).post('/api/prompts/reset').send({});
      expect(res.status).toBe(200);
      expect(res.body.prompts.did_well).toBe('What did you do well?');
      expect(res.body.prompts.accomplishment).toBe('What was your biggest accomplishment today?');
      const keys = Object.keys(res.body.prompts).sort();
      expect(keys.length).toBe(8);
    });

    it('is idempotent (reset twice produces same result)', async () => {
      const app = buildApp(sql, userIdA);
      await request(app).post('/api/prompts/reset').send({});
      const res2 = await request(app).post('/api/prompts/reset').send({});
      expect(res2.status).toBe(200);
      const keys = Object.keys(res2.body.prompts).sort();
      expect(keys.length).toBe(8);
    });

    it('401 without auth', async () => {
      const app = buildApp(sql, null);
      const res = await request(app).post('/api/prompts/reset').send({});
      expect(res.status).toBe(401);
    });
  });
});
