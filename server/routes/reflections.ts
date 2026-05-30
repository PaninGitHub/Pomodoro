import { Router, type Request, type Response, type NextFunction } from 'express';
import type postgres from 'postgres';
import { requireAuth } from '../middleware/requireAuth';
import { validateCreateReflection } from '../utils/validateReflection';
import type { PublicReflection } from '../types/db';

function getUserId(req: Request): string {
  return (req.user as { id: string }).id;
}

function createReflectionHandler(sql: postgres.Sql) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = getUserId(req);
      const v = validateCreateReflection(req.body);
      if (!v.ok) {
        res.status(400).json({ error: v.error });
        return;
      }

      // Verify the session belongs to this user before inserting.
      // Plain-text 400 ('session...'); we don't leak whether the session
      // exists for a different user vs not at all.
      const sessionRows = await sql`
        SELECT id FROM timer_sessions
        WHERE id = ${v.value.session_id} AND user_id = ${userId}
        LIMIT 1
      `;
      if (sessionRows.length === 0) {
        res.status(400).json({ error: 'session_id does not belong to the current user.' });
        return;
      }

      // sql.json() expects a JSONValue (read-only index signature). Our
      // validator outputs typed shapes that are structurally compatible
      // at runtime but don't satisfy the strict type. Cast through any —
      // the runtime payload is plain JSON the validator already vetted.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const answersJson = sql.json(v.value.answers as any);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const snapshotJson = sql.json(v.value.tasks_snapshot as any);
      const [row] = await sql<PublicReflection[]>`
        INSERT INTO reflections
          (user_id, session_id, type, period_number, focus_rating, answers, tasks_snapshot)
        VALUES
          (${userId}, ${v.value.session_id}, ${v.value.type},
           ${v.value.period_number}, ${v.value.focus_rating},
           ${answersJson}, ${snapshotJson})
        RETURNING id, session_id, type, period_number, focus_rating, answers, tasks_snapshot, created_at
      `;
      res.status(201).json({ reflection: row });
    } catch (err) {
      next(err);
    }
  };
}

function listReflectionsHandler() {
  // F-10 stub (Phase 3.5 will implement). Returns empty list so the
  // future client GET doesn't 404.
  return async (_req: Request, res: Response): Promise<void> => {
    res.status(200).json({ reflections: [] });
  };
}

function patchReflectionHandler() {
  // F-10 edit stub (Phase 3.5).
  return async (_req: Request, res: Response): Promise<void> => {
    res.status(501).json({ error: 'Reflection editing is not available yet.' });
  };
}

export function buildReflectionsRouter(sql: postgres.Sql): Router {
  const router = Router();
  router.use(requireAuth);
  router.post('/', createReflectionHandler(sql));
  router.get('/', listReflectionsHandler());
  router.patch('/:id', patchReflectionHandler());
  return router;
}
