import { describe, it, expect } from 'vitest';
import express from 'express';
import request from 'supertest';
import { errorHandler } from './errorHandler';

describe('errorHandler', () => {
  it('returns 500 with friendly message and never a stack trace', async () => {
    const app = express();
    app.get('/boom', (_req, _res, next) => next(new Error('inner detail')));
    app.use(errorHandler);

    const res = await request(app).get('/boom');
    expect(res.status).toBe(500);
    expect(res.body.error).toBeTypeOf('string');
    expect(res.body.error).not.toContain('inner detail');
    expect(res.body).not.toHaveProperty('stack');
  });

  it('respects a thrown error with a numeric .status', async () => {
    const app = express();
    app.get('/bad', (_req, _res, next) => {
      const err = new Error('Bad input') as Error & { status?: number };
      err.status = 400;
      next(err);
    });
    app.use(errorHandler);

    const res = await request(app).get('/bad');
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'Bad input' });
  });
});
