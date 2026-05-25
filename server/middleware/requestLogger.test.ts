import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { requestLogger } from './requestLogger';

describe('requestLogger', () => {
  let writeSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    writeSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
  });
  afterEach(() => {
    writeSpy.mockRestore();
  });

  it('emits one log line per request with method, path, status, duration_ms', async () => {
    const app = express();
    app.use(requestLogger);
    app.get('/ping', (_req, res) => res.status(204).end());

    await request(app).get('/ping');

    const lines = writeSpy.mock.calls.map((c) => c[0] as string);
    const requestLine = lines.find((l) => l.includes('"event":"request"'));
    expect(requestLine).toBeDefined();
    const parsed = JSON.parse((requestLine as string).trim());
    expect(parsed.method).toBe('GET');
    expect(parsed.path).toBe('/ping');
    expect(parsed.status).toBe(204);
    expect(typeof parsed.duration_ms).toBe('number');
    expect(parsed.duration_ms).toBeGreaterThanOrEqual(0);
  });
});
