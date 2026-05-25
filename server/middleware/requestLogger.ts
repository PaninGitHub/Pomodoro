import type { RequestHandler } from 'express';
import { log } from '../utils/logger';

export const requestLogger: RequestHandler = (req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    log({
      level: 'info',
      event: 'request',
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration_ms: Date.now() - start,
      user_id: (req.user as { id?: string } | undefined)?.id ?? null,
    });
  });
  next();
};
