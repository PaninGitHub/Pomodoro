import { describe, it, expect, vi } from 'vitest';
import type { Request, Response } from 'express';
import { meHandler, logoutHandler } from './handlers';
import type { User } from '../types/db';

function makeRes(): Response & { _status?: number; _body?: unknown; _cookie?: string } {
  const res: Partial<Response> & { _status?: number; _body?: unknown; _cookie?: string } = {};
  res.status = ((s: number) => {
    res._status = s;
    return res as Response;
  }) as Response['status'];
  res.json = ((b: unknown) => {
    res._body = b;
    return res as Response;
  }) as Response['json'];
  res.clearCookie = ((name: string) => {
    res._cookie = name;
    return res as Response;
  }) as Response['clearCookie'];
  return res as Response & { _status?: number; _body?: unknown; _cookie?: string };
}

const fakeUser: User = {
  id: 'u-1',
  google_id: 'g-1',
  email: 'a@x.com',
  display_name: 'Alice',
  avatar_url: null,
  role: 'user',
  created_at: new Date(),
  last_login_at: null,
};

describe('meHandler', () => {
  it('returns the public user shape from req.user', () => {
    const req = { user: fakeUser } as unknown as Request;
    const res = makeRes();
    meHandler(req, res);
    expect(res._status).toBe(200);
    expect(res._body).toEqual({
      user: { id: 'u-1', email: 'a@x.com', display_name: 'Alice', avatar_url: null },
    });
  });
});

describe('logoutHandler', () => {
  it('destroys session, clears cookie, and returns {ok:true}', async () => {
    const destroy = vi.fn((cb: (err?: Error) => void) => cb());
    const req = {
      session: { destroy },
    } as unknown as Request;
    const res = makeRes();
    await logoutHandler(req, res);
    expect(destroy).toHaveBeenCalled();
    expect(res._cookie).toBe('connect.sid');
    expect(res._status).toBe(200);
    expect(res._body).toEqual({ ok: true });
  });

  it('returns 500 if session destroy fails', async () => {
    const destroy = vi.fn((cb: (err?: Error) => void) => cb(new Error('boom')));
    const req = { session: { destroy } } as unknown as Request;
    const res = makeRes();
    await logoutHandler(req, res);
    expect(res._status).toBe(500);
    expect(res._body).toEqual({ error: 'Could not sign you out. Please try again.' });
  });
});
