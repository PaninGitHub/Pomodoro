import { describe, it, expect } from 'vitest';
import express from 'express';
import request from 'supertest';
import { healthRouter } from './health';

describe('GET /api/health', () => {
  it('returns 200 with status ok', async () => {
    const app = express();
    app.use('/api', healthRouter);
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });
});
