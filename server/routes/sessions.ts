import { Router, type Request, type Response, type NextFunction } from 'express';
import type postgres from 'postgres';
import { requireAuth } from '../middleware/requireAuth';
import { parseUuid } from '../utils/parseUuid';
import { validateCreateSession, validatePatchSession } from '../utils/validateSession';
import type { PublicSession } from '../types/db';

function getUserId(req: Request): string {
  return (req.user as { id: string }).id;
}

function createSessionHandler(sql: postgres.Sql) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = getUserId(req);
      const v = validateCreateSession(req.body);
      if (!v.ok) {
        res.status(400).json({ error: v.error });
        return;
      }
      const [row] = await sql<{ id: string }[]>`
        INSERT INTO timer_sessions (user_id, mode)
        VALUES (${userId}, ${v.value.mode})
        RETURNING id
      `;
      res.status(201).json({ session_id: row!.id });
    } catch (err) {
      next(err);
    }
  };
}

function patchSessionHandler(sql: postgres.Sql) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = getUserId(req);
      const idResult = parseUuid(req.params.id);
      if (!idResult.ok) {
        res.status(400).json({ error: 'Invalid session ID.' });
        return;
      }
      const v = validatePatchSession(req.body);
      if (!v.ok) {
        res.status(400).json({ error: v.error });
        return;
      }
      const fields = { ...v.value };
      const updated = await sql<PublicSession[]>`
        UPDATE timer_sessions SET ${sql(fields)}
        WHERE id = ${idResult.value} AND user_id = ${userId}
        RETURNING id, mode, started_at, ended_at, ended_early, total_work_mins, periods_completed
      `;
      if (updated.length === 0) {
        res.status(404).json({ error: 'Session not found.' });
        return;
      }
      res.status(200).json({ session: updated[0] });
    } catch (err) {
      next(err);
    }
  };
}

export function buildSessionsRouter(sql: postgres.Sql): Router {
  const router = Router();
  router.use(requireAuth);
  router.post('/', createSessionHandler(sql));
  router.patch('/:id', patchSessionHandler(sql));
  return router;
}
