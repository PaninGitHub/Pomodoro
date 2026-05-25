import type { ErrorRequestHandler } from 'express';
import { log } from '../utils/logger';

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  const status = typeof (err as { status?: unknown }).status === 'number'
    ? (err as { status: number }).status
    : 500;

  log({
    level: 'error',
    event: 'request_error',
    method: req.method,
    path: req.path,
    status,
    message: err instanceof Error ? err.message : String(err),
    stack: err instanceof Error ? err.stack : undefined,
  });

  const clientMessage = status >= 500
    ? 'Something went wrong on our end. Please try again.'
    : (err instanceof Error ? err.message : 'Bad request');

  res.status(status).json({ error: clientMessage });
};
