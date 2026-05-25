import { describe, it, expect } from 'vitest';
import express from 'express';
import request from 'supertest';
import { requireAuth } from './requireAuth';

describe('requireAuth', () => {
  it('returns 401 when req.user is undefined', async () => {
    const app = express();
    app.get('/protected', requireAuth, (_req, res) => res.json({ ok: true }));
    const res = await request(app).get('/protected');
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: 'Not signed in.' });
  });

  it('calls next when req.user is present', async () => {
    const app = express();
    app.use((req, _res, next) => {
      (req as express.Request & { user: { id: string } }).user = { id: 'u1' } as never;
      next();
    });
    app.get('/protected', requireAuth, (_req, res) => res.json({ ok: true }));
    const res = await request(app).get('/protected');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });
});
